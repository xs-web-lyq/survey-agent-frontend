/** 综述任务 SSE 订阅 + 事件 reducer(断线用 after 参数回放) */

import { useEffect, useReducer, useRef } from 'react'

export interface SurveyEvent {
  type: string
  data: Record<string, unknown>
  seq: number
  ts: number
}

export interface TimelineEntry {
  key: string
  kind: 'phase' | 'thinking' | 'tool' | 'file' | 'citation' | 'need_input'
  phase?: string
  text?: string
  tool?: string
  args?: unknown
  summary?: string
  verdict?: string
  chunkId?: string
  status?: string
  payload?: unknown
  ts: number
}

export interface SurveyRunState {
  status: 'connecting' | 'running' | 'waiting_input' | 'done' | 'failed' | 'interrupted'
  currentPhase: string
  timeline: TimelineEntry[]
  /** target(文件路径)→ 流式累计文本 */
  streams: Record<string, string>
  files: string[]
  needInput: { kind: string; payload: unknown } | null
  stats: Record<string, unknown> | null
  error: string | null
  lastSeq: number
  coverageRevision: number
}

const initial: SurveyRunState = {
  status: 'connecting',
  currentPhase: '',
  timeline: [],
  streams: {},
  files: [],
  needInput: null,
  stats: null,
  error: null,
  lastSeq: 0,
  coverageRevision: 0,
}

function reducer(state: SurveyRunState, ev: SurveyEvent): SurveyRunState {
  const next = { ...state, lastSeq: Math.max(state.lastSeq, ev.seq) }
  const d = ev.data
  const push = (e: Omit<TimelineEntry, 'key' | 'ts'>) => {
    next.timeline = [...next.timeline, { ...e, key: `${ev.seq}`, ts: ev.ts }]
  }
  switch (ev.type) {
    case 'phase':
      if (d.status === 'start') next.currentPhase = String(d.name)
      push({ kind: 'phase', phase: String(d.name), status: String(d.status) })
      break
    case 'thinking':
      push({ kind: 'thinking', text: String(d.text) })
      break
    case 'deep_round': {
      const round = String(d.round ?? '')
      const verdict = String(d.verdict ?? '')
      const coverage = d.coverage as Record<string, unknown> | undefined
      const coverageText = coverage
        ? `${String(coverage.covered_questions ?? 0)}/${String(coverage.total_questions ?? 0)} 个研究问题，${String(coverage.source_count ?? 0)} 个来源`
        : ''
      push({
        kind: 'thinking',
        text: verdict === 'sufficient'
          ? coverageText
            ? `证据已覆盖 ${coverageText}`
            : `第 ${round} 轮证据已达到写作要求`
          : coverageText
            ? `证据仅覆盖 ${coverageText}，继续补齐缺口`
            : `第 ${round} 轮证据不足，继续扩展检索${d.query ? `：${String(d.query)}` : ''}`,
      })
      break
    }
    case 'evidence_matrix_updated':
      next.coverageRevision = state.coverageRevision + 1
      break
    case 'tool_call':
      push({ kind: 'tool', tool: String(d.tool), args: d.args })
      break
    case 'tool_result': {
      // 合并到最近一次同类 tool 条目下方(简单起见追加)
      push({ kind: 'tool', summary: String(d.summary ?? '') })
      break
    }
    case 'text_delta': {
      const target = String(d.target ?? 'output')
      next.streams = {
        ...next.streams,
        [target]: (next.streams[target] ?? '') + String(d.delta ?? ''),
      }
      break
    }
    case 'stream_reset': {
      const target = String(d.target ?? 'output')
      next.streams = { ...next.streams, [target]: '' }
      break
    }
    case 'file_write': {
      const p = String(d.path)
      if (!next.files.includes(p)) next.files = [...next.files, p]
      push({ kind: 'file', text: p })
      break
    }
    case 'citation_check':
      push({
        kind: 'citation',
        verdict: String(d.verdict),
        chunkId: String(d.chunk_id),
        text: String(d.claim ?? ''),
      })
      break
    case 'need_input':
      next.needInput = { kind: String(d.kind), payload: d.payload }
      next.status = 'waiting_input'
      push({ kind: 'need_input', payload: d.payload })
      break
    case 'task_status': {
      const s = String(d.status)
      if (s === 'running') {
        next.status = 'running'
        next.needInput = null
        next.error = null
        if (d.resume === 'finalize') {
          next.streams = { ...next.streams, 'survey.md': '' }
        }
      } else if (s === 'waiting_input') next.status = 'waiting_input'
      else if (s === 'done') {
        next.status = 'done'
        next.stats = d
      } else if (s === 'failed') {
        next.status = 'failed'
        next.error = String(d.error ?? '')
      }
      break
    }
  }
  return next
}

export function useSurveyEvents(taskId: string | undefined) {
  const [state, dispatch] = useReducer(reducer, initial)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!taskId) return
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const connect = async (after: number) => {
      const resp = await fetch(`/api/tasks/${taskId}/events?after=${after}`, {
        signal: ctrl.signal,
      })
      if (!resp.ok || !resp.body) throw new Error(`events: ${resp.status}`)
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let curEvent = 'message'
      let curData: string[] = []
      let lastSeq = after
      let terminalStatusSeen = false
      const flush = () => {
        if (curData.length && curEvent !== 'stream_end') {
          try {
            const payload = JSON.parse(curData.join('\n'))
            const event = payload as SurveyEvent
            lastSeq = Math.max(lastSeq, event.seq)
            if (
              event.type === 'task_status'
              && ['done', 'failed'].includes(String(event.data.status))
            ) {
              terminalStatusSeen = true
            }
            dispatch(event)
          } catch { /* 忽略坏帧 */ }
        }
        curEvent = 'message'
        curData = []
      }
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line === '') flush()
          else if (line.startsWith('event:')) curEvent = line.slice(6).trim()
          else if (line.startsWith('data:')) curData.push(line.slice(5).trimStart())
        }
      }
      flush()
      if (!terminalStatusSeen) {
        const snapshotResponse = await fetch(`/api/tasks/${taskId}`, {
          signal: ctrl.signal,
        })
        if (snapshotResponse.ok) {
          const snapshot = await snapshotResponse.json() as {
            status?: string
            checkpoint?: { phase?: string }
          }
          const status = String(snapshot.status ?? '')
          if (['done', 'failed', 'interrupted'].includes(status)) {
            dispatch({
              type: 'task_status',
              data: {
                status,
                resume: snapshot.checkpoint?.phase,
              },
              seq: lastSeq + 1,
              ts: Date.now() / 1000,
            })
          }
        }
      }
    }

    void connect(0).catch(() => { /* 断线由用户刷新恢复 */ })
    return () => ctrl.abort()
  }, [taskId])

  return state
}
