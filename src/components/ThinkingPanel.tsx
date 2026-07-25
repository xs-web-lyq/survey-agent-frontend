import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain,
  Check,
  ChevronDown,
  CircleAlert,
  Database,
  LoaderCircle,
  Search,
  Sparkles,
  Timer,
} from 'lucide-react'
import type { TraceItem } from '../lib/types'

interface ActivityStep {
  id: string
  kind: 'thinking' | 'tool' | 'evidence'
  text: string
  detail?: string
  status: 'running' | 'completed' | 'failed'
  durationMs?: number
}

const TOOL_LABELS: Record<string, string> = {
  survey_scope: '检索知识库覆盖范围',
  aquery_data: '执行图谱增强检索',
  hybrid_search: '执行语义与关键词混合检索',
  aretrieve_progressive_context: '检索相关章节与原文证据',
}

function buildSteps(trace: TraceItem[]): ActivityStep[] {
  const steps: ActivityStep[] = []
  const index = new Map<string, number>()

  const upsert = (step: ActivityStep) => {
    const at = index.get(step.id)
    if (at == null) {
      index.set(step.id, steps.length)
      steps.push(step)
    } else {
      steps[at] = { ...steps[at], ...step }
    }
  }

  trace.forEach((item, i) => {
    if (item.type === 'thinking') {
      const stage = String(item.data.stage ?? `thinking-${i}`)
      upsert({
        id: `thinking:${stage}`,
        kind: 'thinking',
        text: String(item.data.text ?? '正在分析'),
        detail: item.data.detail ? String(item.data.detail) : undefined,
        status: item.data.status === 'failed'
          ? 'failed'
          : item.data.status === 'completed'
            ? 'completed'
            : 'running',
        durationMs: Number(item.data.duration_ms ?? 0) || undefined,
      })
      return
    }

    if (item.type === 'tool_call') {
      const callId = String(item.data.call_id ?? i)
      const tool = String(item.data.tool ?? 'research_tool')
      upsert({
        id: `tool:${callId}`,
        kind: 'tool',
        text: TOOL_LABELS[tool] ?? `调用 ${tool}`,
        detail: item.data.args ? JSON.stringify(item.data.args) : undefined,
        status: 'running',
      })
      return
    }

    if (item.type === 'tool_result') {
      const callId = String(item.data.call_id ?? i)
      const id = `tool:${callId}`
      const current = index.get(id)
      upsert({
        id,
        kind: 'evidence',
        text: current == null ? '完成知识库检索' : steps[current].text,
        detail: String(item.data.summary ?? ''),
        status: 'completed',
      })
      return
    }

    if (item.type === 'memory_loaded') {
      upsert({
        id: `memory:${i}`,
        kind: 'evidence',
        text: '恢复多轮对话上下文',
        detail: `${String(item.data.recent_messages ?? 0)} 条近期消息 · ${String(item.data.durable_count ?? 0)} 条长期记忆`,
        status: 'completed',
      })
      return
    }

    if (item.type === 'query_rewritten') {
      upsert({
        id: `rewrite:${i}`,
        kind: 'thinking',
        text: '结合上下文消解追问',
        detail: String(item.data.standalone ?? ''),
        status: 'completed',
      })
      return
    }

    if (item.type === 'deep_round') {
      const round = String(item.data.round ?? '')
      const verdict = String(item.data.verdict ?? '')
      const coverage = item.data.coverage as Record<string, unknown> | undefined
      const coverageLabel = coverage
        ? `${String(coverage.covered_questions ?? 0)}/${String(coverage.total_questions ?? 0)} 个研究问题 · ${String(coverage.source_count ?? 0)} 个来源`
        : ''
      upsert({
        id: `deep:${round}:${verdict}`,
        kind: verdict === 'searched' ? 'tool' : 'thinking',
        text: verdict === 'insufficient'
          ? coverageLabel
            ? `研究问题覆盖不足：${coverageLabel}`
            : `第 ${round} 轮证据评估：需要补充`
          : verdict === 'searched'
            ? `第 ${round} 轮补充检索完成`
            : coverageLabel
              ? `研究问题覆盖充分：${coverageLabel}`
              : `第 ${round} 轮证据评估：资料充分`,
        detail: verdict === 'insufficient'
          ? String(item.data.gap ?? item.data.query ?? '')
          : verdict === 'searched'
            ? `新增 ${String(item.data.new_chunks ?? 0)} 条证据`
            : coverageLabel || undefined,
        status: 'completed',
      })
    }
  })

  return steps
}

function StepIcon({ step }: { step: ActivityStep }) {
  if (step.status === 'running') return <LoaderCircle size={14} className="animate-spin text-accent" />
  if (step.status === 'failed') return <CircleAlert size={14} className="text-red" />
  if (step.kind === 'tool') return <Search size={14} className="text-accent" />
  if (step.kind === 'evidence') return <Database size={14} className="text-green" />
  return <Check size={14} className="text-violet" />
}

export function ThinkingPanel({
  trace,
  active = false,
  failed = false,
  latencyMs,
  title = '思考过程',
}: {
  trace: TraceItem[]
  active?: boolean
  failed?: boolean
  latencyMs?: number
  title?: string
}) {
  const steps = useMemo(() => buildSteps(trace), [trace])
  const [open, setOpen] = useState(active)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(Date.now())
  const wasActive = useRef(active)

  useEffect(() => {
    if (failed) {
      setOpen(true)
      wasActive.current = false
      return
    }
    if (active) {
      if (!wasActive.current) startedAt.current = Date.now()
      setOpen(true)
      const tick = () => setElapsed(Date.now() - startedAt.current)
      tick()
      const timer = window.setInterval(tick, 250)
      wasActive.current = true
      return () => window.clearInterval(timer)
    }
    if (wasActive.current) setOpen(false)
    wasActive.current = false
  }, [active, failed])

  if (!steps.length && !active) return null

  const current = [...steps].reverse().find((step) => step.status === 'running')
  const duration = active ? elapsed : (latencyMs ?? elapsed)
  const durationLabel = duration > 0 ? `${(duration / 1000).toFixed(1)}s` : ''

  return (
    <section className={`thinking-panel ${active ? 'is-active' : ''} ${failed ? 'is-failed' : ''}`} aria-label={title}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="thinking-panel-trigger"
        aria-expanded={open}
      >
        <span className="thinking-panel-gem">
          {active
            ? <LoaderCircle size={15} className="animate-spin" />
            : failed
              ? <CircleAlert size={15} />
              : <Sparkles size={15} />}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-xs font-semibold text-ink-1">
            {active ? (current?.text ?? '正在思考') : failed ? `${title}中断` : `${title}已完成`}
          </span>
          <span className="block truncate text-[0.67rem] text-ink-3">
            {active
              ? '实时展示分析摘要与工具活动'
              : failed
                ? `${steps.length} 个步骤已保存 · 可检查后重试`
                : `${steps.length} 个步骤 · 点击查看依据`}
          </span>
        </span>
        {durationLabel && (
          <span className="inline-flex items-center gap-1 text-[0.67rem] tabular-nums text-ink-3">
            <Timer size={11} /> {durationLabel}
          </span>
        )}
        <ChevronDown size={15} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`thinking-panel-body ${open ? 'is-open' : ''}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="thinking-step-list">
            {steps.map((step) => (
              <div key={step.id} className={`thinking-step is-${step.status}`}>
                <span className="thinking-step-icon"><StepIcon step={step} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-xs text-ink-2">
                    {step.text}
                    {step.durationMs != null && (
                      <span className="text-[0.62rem] text-ink-3">{(step.durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </span>
                  {step.detail && (
                    <span className="mt-0.5 block break-words text-[0.67rem] leading-relaxed text-ink-3">
                      {step.detail}
                    </span>
                  )}
                </span>
              </div>
            ))}
            {active && !steps.some((step) => step.status === 'running') && (
              <div className="thinking-step is-running">
                <span className="thinking-step-icon"><LoaderCircle size={14} className="animate-spin text-accent" /></span>
                <span className="text-xs text-ink-2">正在准备下一步</span>
              </div>
            )}
          </div>
          <div className="thinking-panel-note">
            <Brain size={11} /> 展示可复核的分析摘要与工具轨迹，不展示模型内部原始推理。
          </div>
        </div>
      </div>
    </section>
  )
}
