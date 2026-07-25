/** 综述任务列表页 */

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpenText, CircleCheck, CircleX, Lightbulb, Loader2, Plus } from 'lucide-react'
import { DocScopePicker } from '../components/DocScopePicker'

interface TaskMeta {
  task_id: string
  topic: string
  status: string
  created_at?: number
  finished_at?: number
}

const STATUS_UI: Record<string, { icon: typeof CircleCheck; cls: string; label: string }> = {
  running: { icon: Loader2, cls: 'text-accent animate-spin', label: '运行中' },
  done: { icon: CircleCheck, cls: 'text-green', label: '已完成' },
  failed: { icon: CircleX, cls: 'text-red', label: '失败' },
  interrupted: { icon: CircleX, cls: 'text-amber', label: '已中断' },
}

const LENGTH_OPTS = [
  { key: 'short', label: '短', hint: '~500字/节' },
  { key: 'medium', label: '中', hint: '~800字/节' },
  { key: 'long', label: '长', hint: '~1500字/节' },
]

export function SurveyList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [tasks, setTasks] = useState<TaskMeta[]>([])
  const [topic, setTopic] = useState('')
  const [autoApprove, setAutoApprove] = useState(false)
  const [length, setLength] = useState('medium')
  const [docScope, setDocScope] = useState<string[]>([])
  const [context, setContext] = useState('')
  const [creating, setCreating] = useState(false)

  // 头脑风暴 conclude 跳转预填:topic + 讨论结论 + 按关键词预选文献
  useEffect(() => {
    const prefill = (location.state as {
      prefill?: {
        topic: string; section_hints: string[]
        doc_keywords: string[]; summary: string
        research_questions?: string[]
        inclusion_criteria?: string[]
        exclusion_criteria?: string[]
        evidence_gaps?: string[]
        readiness_score?: number
        readiness_reason?: string
        doc_scope?: string[]
      }
    } | null)?.prefill
    if (!prefill) return
    setTopic(prefill.topic)
    setContext([
      prefill.summary,
      `应覆盖方向：${prefill.section_hints.join('；')}`,
      prefill.research_questions?.length
        ? `核心研究问题：${prefill.research_questions.join('；')}` : '',
      prefill.inclusion_criteria?.length
        ? `纳入边界：${prefill.inclusion_criteria.join('；')}` : '',
      prefill.exclusion_criteria?.length
        ? `排除范围：${prefill.exclusion_criteria.join('；')}` : '',
      prefill.evidence_gaps?.length
        ? `已知证据缺口：${prefill.evidence_gaps.join('；')}` : '',
      prefill.readiness_score != null
        ? `选题成熟度：${prefill.readiness_score}/100（${prefill.readiness_reason ?? ''}）` : '',
    ].filter(Boolean).join('\n'))
    if (prefill.doc_scope?.length) {
      setDocScope(prefill.doc_scope)
    } else if (prefill.doc_keywords.length) {
      fetch('/api/documents')
        .then((r) => r.json())
        .then((docs: { file_path: string; summary: string }[]) => {
          const kws = prefill.doc_keywords
          const names = docs
            .filter((d) => {
              const name = (d.file_path || '').replace(/\\/g, '/').split('/').pop() ?? ''
              const hay = `${name} ${d.summary ?? ''}`
              return kws.some((k) => hay.includes(k))
            })
            .map((d) => (d.file_path || '').replace(/\\/g, '/').split('/').pop() ?? '')
          setDocScope(names)
        })
        .catch(() => {})
    }
    // 清掉 state,避免刷新重复预填
    window.history.replaceState({}, '')
  }, [location.state])

  const refresh = () => {
    fetch('/api/tasks').then((r) => r.json()).then(setTasks).catch(() => {})
  }
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 8000)
    return () => clearInterval(t)
  }, [])

  const create = async () => {
    if (!topic.trim() || creating) return
    setCreating(true)
    try {
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(), auto_approve: autoApprove, section_length: length,
          doc_scope: docScope, context,
        }),
      })
      const d = await r.json()
      navigate(`/surveys/${d.task_id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center gap-2">
        <BookOpenText className="text-accent" size={22} />
        <h1 className="text-lg font-semibold">综述生成</h1>
        <button
          type="button"
          onClick={() => navigate('/surveys/brainstorm')}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber transition-colors hover:bg-amber/20"
        >
          <Lightbulb size={13} />
          先聊聊选题
        </button>
      </div>

      {/* 新建 */}
      <div className="mb-8 rounded-xl border border-line bg-surface-1 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs text-ink-3">综述主题</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void create()}
              placeholder="例:电磁搅拌对连铸坯凝固组织与偏析的影响"
              className="w-full rounded-lg border border-line bg-surface-0 px-3 py-2 text-sm text-ink-1 placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void create()}
            disabled={creating || !topic.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-40"
          >
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            开始生成
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3">篇幅</span>
            <div className="flex rounded-lg border border-line bg-surface-0 p-0.5">
              {LENGTH_OPTS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setLength(o.key)}
                  title={o.hint}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    length === o.key
                      ? 'bg-accent/15 text-accent'
                      : 'text-ink-3 hover:text-ink-1'
                  }`}
                >
                  {o.label}
                  <span className="ml-1 text-[0.6rem] opacity-70">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-ink-3">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="accent-(--accent)"
            />
            跳过大纲确认(全自动模式)
          </label>
        </div>

        <div className="mt-3">
          <DocScopePicker selected={docScope} onChange={setDocScope} />
        </div>
        {context && (
          <div className="mt-3 rounded-lg border border-amber/30 bg-amber/5 px-3 py-2">
            <div className="mb-0.5 flex items-center gap-1 text-[0.68rem] font-medium text-amber">
              <Lightbulb size={11} />
              选题讨论结论(将注入大纲生成)
              <button
                type="button"
                onClick={() => setContext('')}
                className="ml-auto text-ink-3 hover:text-ink-1"
              >
                清除
              </button>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-wrap text-ink-2">{context}</p>
          </div>
        )}
      </div>

      {/* 任务列表 */}
      <div className="space-y-2">
        {tasks.map((t) => {
          const ui = STATUS_UI[t.status] ?? STATUS_UI.interrupted
          const Icon = ui.icon
          return (
            <button
              key={t.task_id}
              type="button"
              onClick={() => navigate(`/surveys/${t.task_id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-1 px-4 py-3 text-left transition-colors hover:border-accent/30"
            >
              <Icon size={17} className={ui.cls} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-ink-1">{t.topic}</div>
                <div className="text-[0.68rem] text-ink-3">
                  {t.task_id} · {ui.label}
                  {t.created_at &&
                    ` · ${new Date(t.created_at * 1000).toLocaleString('zh-CN')}`}
                </div>
              </div>
            </button>
          )
        })}
        {tasks.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-3">暂无综述任务</p>
        )}
      </div>
    </div>
  )
}
