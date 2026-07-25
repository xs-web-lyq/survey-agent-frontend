/** 综述工作台左栏:agent 轨迹时间线 */

import { useEffect, useRef } from 'react'
import {
  Brain,
  CircleCheck,
  CircleX,
  FileText,
  ListTree,
  PenLine,
  Search,
  ShieldCheck,
} from 'lucide-react'
import type { SurveyRunState, TimelineEntry } from '../lib/useSurveyEvents'

const PHASE_META: Record<string, { label: string; icon: typeof ListTree }> = {
  outline: { label: '规划大纲', icon: ListTree },
  writing: { label: '逐节撰写', icon: PenLine },
  supplement: { label: '定向补证', icon: Search },
  finalize: { label: '整合核查', icon: ShieldCheck },
}

function Entry({ e }: { e: TimelineEntry }) {
  if (e.kind === 'phase') {
    const meta = PHASE_META[e.phase ?? ''] ?? { label: e.phase, icon: ListTree }
    const Icon = meta.icon
    if (e.status !== 'start') return null
    return (
      <div className="mt-4 flex items-center gap-2 first:mt-0">
        <Icon size={15} className="text-accent" />
        <span className="text-sm font-semibold text-ink-1">{meta.label}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    )
  }
  if (e.kind === 'thinking') {
    return (
      <div className="flex items-start gap-2 pl-1 text-xs text-ink-2">
        <Brain size={13} className="mt-0.5 shrink-0 text-violet" />
        <span>{e.text}</span>
      </div>
    )
  }
  if (e.kind === 'tool') {
    if (e.summary) {
      return <div className="pl-6 font-mono text-[0.7rem] text-ink-3">↳ {e.summary}</div>
    }
    return (
      <div className="flex items-start gap-2 pl-1 font-mono text-[0.72rem] text-ink-2">
        <Search size={12} className="mt-0.5 shrink-0 text-accent" />
        <span>
          {e.tool}
          <span className="text-ink-3"> {JSON.stringify(e.args ?? {}).slice(0, 80)}</span>
        </span>
      </div>
    )
  }
  if (e.kind === 'file') {
    return (
      <div className="flex items-center gap-2 pl-1 text-[0.72rem] text-green">
        <FileText size={12} />
        落盘 {e.text}
      </div>
    )
  }
  if (e.kind === 'citation') {
    const pass = e.verdict === 'pass'
    const Icon = pass ? CircleCheck : CircleX
    return (
      <div className={`flex items-start gap-2 pl-1 text-[0.7rem] ${pass ? 'text-ink-3' : 'text-red'}`}>
        <Icon size={12} className={`mt-0.5 shrink-0 ${pass ? 'text-green' : 'text-red'}`} />
        <span className="truncate">
          {e.chunkId?.slice(0, 18)}… {e.text?.slice(0, 50)}
        </span>
      </div>
    )
  }
  return null
}

export function AgentTimeline({ run }: { run: SurveyRunState }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [run.timeline.length, run.status])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span
          className={`h-2 w-2 rounded-full ${
            run.status === 'running'
              ? 'breathing-dot bg-accent'
              : run.status === 'waiting_input'
                ? 'bg-amber'
                : run.status === 'done'
                  ? 'bg-green'
                  : run.status === 'failed'
                    ? 'bg-red'
                    : 'bg-ink-3'
          }`}
        />
        <span className="text-xs font-medium text-ink-2">
          {{
            connecting: '连接中…',
            running: `执行中 · ${PHASE_META[run.currentPhase]?.label ?? ''}`,
            waiting_input: '等待确认',
            done: '已完成',
            failed: '失败',
            interrupted: '已中断',
          }[run.status]}
        </span>
        {run.stats != null && (
          <span className="ml-auto text-[0.68rem] text-ink-3">
            引用核查 {String(run.stats.citations_passed)}/{String(run.stats.citations_total)} 通过
          </span>
        )}
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
        {run.timeline.map((e) => (
          <Entry key={e.key} e={e} />
        ))}
        {run.error && (
          <div className="rounded-lg border border-red/30 bg-red/10 p-2.5 text-xs text-red">
            {run.error}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
