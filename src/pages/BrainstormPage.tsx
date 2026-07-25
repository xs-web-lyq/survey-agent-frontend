/** 选题头脑风暴:KB 感知的选题顾问对话。
 *  每轮自动探查知识库(文献量/实体),讨论满意后一键转综述任务(预填)。 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, ArrowRight, BookMarked, BookOpenText, Gauge, Lightbulb,
  Loader2, PencilLine, SendHorizonal, Sparkles,
} from 'lucide-react'
import { streamSSE } from '../lib/sse'
import type { TraceItem } from '../lib/types'
import { ThinkingPanel } from '../components/ThinkingPanel'

interface ScopeBrief {
  related_documents: { source: string; hit_chunks: number }[]
  key_entities: string[]
  kb_total_documents: number
  search_rounds?: number
  search_queries?: string[]
  evidence_status?: 'sufficient' | 'workable' | 'insufficient'
}

interface BsMessage {
  role: 'user' | 'assistant'
  content: string
  scope?: ScopeBrief
  trace?: TraceItem[]
  latencyMs?: number
  streaming?: boolean
}

export interface BrainstormConclusion {
  topic: string
  section_hints: string[]
  doc_keywords: string[]
  summary: string
  research_questions: string[]
  inclusion_criteria: string[]
  exclusion_criteria: string[]
  evidence_gaps: string[]
  readiness_score: number
  readiness_reason: string
  evidence_documents: number
  search_rounds: number
  doc_scope: string[]
}

function handoffContext(brief: BrainstormConclusion) {
  return [
    `选题讨论结论：${brief.summary}`,
    `核心研究问题：${brief.research_questions.join('；')}`,
    `章节线索：${brief.section_hints.join('；')}`,
    `纳入边界：${brief.inclusion_criteria.join('；')}`,
    brief.exclusion_criteria.length ? `排除范围：${brief.exclusion_criteria.join('；')}` : '',
    brief.evidence_gaps.length ? `已知证据缺口：${brief.evidence_gaps.join('；')}` : '',
    `选题成熟度：${brief.readiness_score}/100（${brief.readiness_reason}）`,
  ].filter(Boolean).join('\n')
}

function ResearchBriefCard({
  brief,
  starting,
  onAdjust,
  onStart,
}: {
  brief: BrainstormConclusion
  starting: boolean
  onAdjust: () => void
  onStart: () => void
}) {
  const ready = brief.readiness_score >= 70
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-accent/30 bg-surface-1 shadow-xl shadow-black/10">
      <div className="flex items-start gap-3 border-b border-line bg-gradient-to-r from-accent/10 to-violet/10 px-4 py-3.5">
        <span className="brand-gem flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
          <BookOpenText size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-ink-1">研究简报已生成</h2>
            <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
              ready ? 'bg-green/12 text-green' : 'bg-amber/12 text-amber'
            }`}>
              {ready ? '适合进入大纲阶段' : '建议继续收敛'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">{brief.topic}</p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
            <Gauge size={14} /> {brief.readiness_score}
          </div>
          <div className="text-[0.6rem] text-ink-3">选题成熟度</div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className={`h-full rounded-full transition-all ${ready ? 'bg-green' : 'bg-amber'}`}
            style={{ width: `${brief.readiness_score}%` }}
          />
        </div>
        <p className="text-[0.7rem] text-ink-3">{brief.readiness_reason}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface-0/55 p-3">
            <div className="mb-1.5 text-[0.68rem] font-semibold text-ink-2">核心研究问题</div>
            <ul className="space-y-1 text-xs leading-relaxed text-ink-2">
              {brief.research_questions.map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-surface-0/55 p-3">
            <div className="mb-1.5 text-[0.68rem] font-semibold text-ink-2">建议章节线索</div>
            <ul className="space-y-1 text-xs leading-relaxed text-ink-2">
              {brief.section_hints.map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[0.68rem] text-ink-3">
          <span className="rounded-full bg-accent/10 px-2 py-1 text-accent">
            {brief.search_rounds} 轮检索
          </span>
          <span className="rounded-full bg-green/10 px-2 py-1 text-green">
            {brief.evidence_documents} 篇去重文献
          </span>
          <span className="rounded-full bg-violet/10 px-2 py-1 text-violet">
            将交接 {brief.doc_scope.length} 篇文献
          </span>
        </div>

        {brief.evidence_gaps.length > 0 && (
          <div className="rounded-lg border border-amber/25 bg-amber/5 px-3 py-2 text-xs text-ink-2">
            <span className="font-medium text-amber">仍需注意：</span>
            {brief.evidence_gaps.join('；')}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={onAdjust}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-ink-2 transition hover:bg-surface-2 hover:text-ink-1"
          >
            <PencilLine size={13} /> 调整生成配置
          </button>
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:opacity-50"
          >
            {starting ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
            生成大纲并开始综述
          </button>
        </div>
      </div>
    </section>
  )
}

export function BrainstormPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<BsMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [concluding, setConcluding] = useState(false)
  const [starting, setStarting] = useState(false)
  const [handoff, setHandoff] = useState<BrainstormConclusion | null>(null)
  const convIdRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, handoff])

  const send = useCallback(async () => {
    const message = input.trim()
    if (!message || busy) return
    setHandoff(null)
    setInput('')
    setBusy(true)
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: message },
      { role: 'assistant', content: '', trace: [], streaming: true },
    ])
    const patchLast = (patch: Partial<BsMessage> | ((m: BsMessage) => Partial<BsMessage>)) => {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) }
            : m,
        ),
      )
    }
    try {
      await streamSSE(
        '/api/brainstorm',
        { message, conv_id: convIdRef.current },
        {
          onMeta: (d) => { convIdRef.current = d.conv_id },
          onThinking: (d) => patchLast((m) => ({
            trace: [...(m.trace ?? []), {
              type: 'thinking',
              data: d as unknown as Record<string, unknown>,
              ts: Date.now(),
            }],
          })),
          onToolCall: (d) => patchLast((m) => ({
            trace: [...(m.trace ?? []), { type: 'tool_call', data: d, ts: Date.now() }],
          })),
          onToolResult: (d) => {
            patchLast((m) => ({
              trace: [...(m.trace ?? []), { type: 'tool_result', data: d, ts: Date.now() }],
            }))
            const detail = d.detail as ScopeBrief | undefined
            if (detail) patchLast({ scope: detail })
          },
          onDeepRound: (d) => patchLast((m) => ({
            trace: [...(m.trace ?? []), { type: 'deep_round', data: d, ts: Date.now() }],
          })),
          onTextDelta: (delta) => patchLast((m) => ({ content: m.content + delta })),
          onStatus: (d) => {
            if (d.latency_ms) patchLast({ latencyMs: d.latency_ms })
            if (d.status === 'failed') {
              patchLast((m) => ({
                content: m.content || `❌ 出错了:${d.error ?? '未知错误'}`,
              }))
            }
          },
        },
      )
    } catch (err) {
      patchLast((m) => ({
        content: m.content || `❌ 请求失败:${err instanceof Error ? err.message : String(err)}`,
      }))
    } finally {
      patchLast({ streaming: false })
      setBusy(false)
    }
  }, [input, busy])

  const conclude = async () => {
    if (!convIdRef.current || concluding) return
    setConcluding(true)
    try {
      const r = await fetch(`/api/brainstorm/${convIdRef.current}/conclude`, {
        method: 'POST',
      })
      if (!r.ok) throw new Error(`conclude failed: ${r.status}`)
      const c: BrainstormConclusion = await r.json()
      setHandoff(c)
    } catch {
      setHandoff(null)
    } finally {
      setConcluding(false)
    }
  }

  const startSurvey = async () => {
    if (!handoff || starting) return
    setStarting(true)
    try {
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: handoff.topic,
          auto_approve: false,
          section_length: 'medium',
          doc_scope: handoff.doc_scope,
          context: handoffContext(handoff),
        }),
      })
      if (!r.ok) throw new Error(`create survey failed: ${r.status}`)
      const task = await r.json() as { task_id: string }
      navigate(`/surveys/${task.task_id}`)
    } catch {
      // 保留研究简报，用户可以重试或进入配置页手动调整。
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2.5">
        <button
          type="button"
          onClick={() => navigate('/surveys')}
          className="rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1"
        >
          <ArrowLeft size={16} />
        </button>
        <Lightbulb size={16} className="text-amber" />
        <h1 className="text-sm font-medium text-ink-1">选题头脑风暴</h1>
        <span className="text-[0.68rem] text-ink-3">与知识库对话,探讨综述选题的方向与可行性</span>
        {messages.length >= 2 && (
          <button
            type="button"
            onClick={() => void conclude()}
            disabled={concluding || busy}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-40"
          >
            {concluding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            生成研究简报
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {messages.length === 0 && (
            <div className="py-16 text-center">
              <Lightbulb size={36} className="mx-auto mb-3 text-amber/60" />
              <p className="mb-1.5 text-sm text-ink-2">说说你想写什么方向的综述</p>
              <p className="text-xs text-ink-3">
                顾问会实时探查知识库(相关文献量、关键实体),帮你评估方向可行性、
                证据不足时会自动扩展检索；讨论成熟后生成研究简报并交接给综述代理
              </p>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent-dim/30 px-4 py-2.5 text-[0.925rem] leading-relaxed">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col items-start">
                  <ThinkingPanel
                    trace={m.trace ?? []}
                    active={Boolean(m.streaming)}
                    latencyMs={m.latencyMs}
                    title="选题分析"
                  />
                  {m.scope && (
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface-1 px-2.5 py-1.5">
                      <BookMarked size={11} className="text-accent" />
                      <span className="text-[0.68rem] text-ink-2">
                        相关文献 <b className="text-accent">{m.scope.related_documents.length}</b> 篇
                      </span>
                      {m.scope.search_rounds != null && (
                        <span className="rounded-full bg-violet/10 px-1.5 py-0.5 text-[0.62rem] text-violet">
                          {m.scope.search_rounds} 轮检索
                        </span>
                      )}
                      <span className="mx-0.5 h-3 w-px bg-line" />
                      {m.scope.key_entities.slice(0, 6).map((e) => (
                        <span key={e} className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[0.62rem] text-ink-3">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={`md-body max-w-full ${m.streaming ? 'typing-cursor' : ''}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ),
            )}
          </div>
          {handoff && (
            <ResearchBriefCard
              brief={handoff}
              starting={starting}
              onAdjust={() => navigate('/surveys', { state: { prefill: handoff } })}
              onStart={() => void startSurvey()}
            />
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-line bg-surface-1/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-3">
          <div className="flex items-end gap-2 rounded-xl border border-line bg-surface-0 p-2 focus-within:border-accent/50">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={1}
              placeholder="例:我想围绕结晶器电磁搅拌做一篇综述,方向怎么选?"
              className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink-1 placeholder:text-ink-3 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent transition-colors hover:bg-accent/25 disabled:opacity-40"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <SendHorizonal size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
