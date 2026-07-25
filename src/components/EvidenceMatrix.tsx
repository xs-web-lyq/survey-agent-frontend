import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Database,
  FileSearch,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react'
import type { EvidenceMatrixData, EvidenceSection } from '../lib/types'

const STATUS_LABELS: Record<string, string> = {
  pending: '等待搜证',
  retrieving: '检索中',
  ready: '证据充分',
  partial: '存在缺口',
  written: '章节已写入',
}

function sourceName(source: string): string {
  return source.split(/[\\/]/).pop() || source
}

function SectionCard({
  section,
  runStatus,
  canSupplement,
  busyQuestion,
  onSupplement,
}: {
  section: EvidenceSection
  runStatus: string
  canSupplement: boolean
  busyQuestion: string
  onSupplement: (sectionId: string, questionId: string) => void
}) {
  const [open, setOpen] = useState(
    section.status === 'retrieving' || section.status === 'partial',
  )
  const sufficient = section.coverage.sufficient
  const waitingToResume = (
    section.status === 'retrieving'
    && ['failed', 'interrupted'].includes(runStatus)
  )
  const statusLabel = waitingToResume
    ? '已保存，待继续'
    : (STATUS_LABELS[section.status] ?? section.status)

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-surface-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60"
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          sufficient ? 'bg-green/10 text-green' : section.status === 'pending'
            ? 'bg-surface-3 text-ink-3' : 'bg-amber/10 text-amber'
        }`}>
          {sufficient ? <CheckCircle2 size={16} /> : section.status === 'pending'
            ? <CircleDashed size={16} /> : <ShieldAlert size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-ink-1">
            {section.section_id} · {section.title}
          </span>
          <span className="mt-0.5 block text-[0.67rem] text-ink-3">
            覆盖 {section.coverage.covered_questions}/{section.coverage.total_questions} 个研究问题
            {' · '}{section.coverage.source_count} 个独立来源
            {section.max_rounds > 0 && ` · 检索 ${section.round}/${section.max_rounds} 轮`}
          </span>
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[0.64rem] font-medium ${
          sufficient ? 'bg-green/10 text-green' : section.status === 'partial'
            ? 'bg-red/10 text-red' : 'bg-amber/10 text-amber'
        }`}>
          {statusLabel}
        </span>
        <ChevronDown
          size={15}
          className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-line px-4 py-3">
          <div className="overflow-hidden rounded-lg border border-line">
            {section.questions.map((question) => (
              <div
                key={question.id}
                className="grid grid-cols-[minmax(0,1fr)_4rem_4rem_6rem] items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded px-1.5 py-0.5 font-mono text-[0.62rem] ${
                      question.covered ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                    }`}>
                      {question.id}
                    </span>
                    <span className="text-xs leading-relaxed text-ink-2">{question.question}</span>
                  </div>
                  {question.evidence.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 pl-8">
                      {[...new Set(question.evidence.map((item) => item.source))]
                        .slice(0, 4)
                        .map((source) => (
                          <span
                            key={source}
                            title={source}
                            className="max-w-44 truncate rounded-md bg-surface-3 px-1.5 py-0.5 text-[0.61rem] text-ink-3"
                          >
                            {sourceName(source)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="block text-xs font-medium text-ink-1">{question.chunks}</span>
                  <span className="text-[0.62rem] text-ink-3">证据块</span>
                </div>
                <div className="text-right">
                  <span className={`block text-xs font-medium ${
                    question.sources >= 2 ? 'text-green' : 'text-red'
                  }`}>
                    {question.sources}/2
                  </span>
                  <span className="text-[0.62rem] text-ink-3">独立来源</span>
                </div>
                <div className="text-right">
                  {!question.covered && section.status !== 'pending' ? (
                    <button
                      type="button"
                      disabled={!canSupplement || !!busyQuestion}
                      onClick={() => onSupplement(section.section_id, question.id)}
                      title={canSupplement
                        ? '追加检索该研究问题，并重写本节与终稿'
                        : '任务运行结束后可定向补证'}
                      className="inline-flex items-center gap-1 rounded-md bg-amber/10 px-2 py-1 text-[0.64rem] font-medium text-amber transition-colors hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyQuestion === `${section.section_id}/${question.id}`
                        ? <RefreshCw size={11} className="animate-spin" />
                        : <Search size={11} />}
                      补证
                    </button>
                  ) : (
                    <span className="text-[0.62rem] text-ink-3">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {section.coverage.gap && (
            <p className="mt-2 flex items-start gap-1.5 text-[0.67rem] leading-relaxed text-amber">
              <ShieldAlert size={12} className="mt-0.5 shrink-0" />
              {section.coverage.gap}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

export function EvidenceMatrix({
  taskId,
  revision,
  runStatus,
}: {
  taskId: string
  revision: number
  runStatus: string
}) {
  const [matrix, setMatrix] = useState<EvidenceMatrixData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyQuestion, setBusyQuestion] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/tasks/${taskId}/evidence-matrix`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<EvidenceMatrixData>
      })
      .then((data) => {
        setMatrix(data)
        setError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : '证据矩阵加载失败')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [taskId, revision])

  const progress = useMemo(() => {
    if (!matrix?.summary.questions_total) return 0
    return Math.round(
      matrix.summary.questions_covered / matrix.summary.questions_total * 100,
    )
  }, [matrix])

  const supplement = async (sectionId: string, questionId: string) => {
    const key = `${sectionId}/${questionId}`
    setBusyQuestion(key)
    setActionError('')
    try {
      const response = await fetch(`/api/tasks/${taskId}/evidence/supplement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          question_id: questionId,
          rounds: 2,
        }),
      })
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(String(detail.detail ?? `HTTP ${response.status}`))
      }
      window.location.reload()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : '定向补证启动失败')
      setBusyQuestion('')
    }
  }

  if (loading && !matrix) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-xs text-ink-3">
        <RefreshCw size={14} className="animate-spin" /> 正在读取证据检查点…
      </div>
    )
  }
  if (error && !matrix) {
    return (
      <div className="m-5 rounded-xl border border-red/25 bg-red/5 p-4 text-xs text-red">
        证据矩阵加载失败：{error}
      </div>
    )
  }
  if (!matrix) return null

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-5 py-5">
      <div className="rounded-2xl border border-line bg-surface-1 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <FileSearch size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink-1">研究问题证据矩阵</h2>
            <p className="mt-0.5 text-[0.68rem] text-ink-3">
              “证据充分”由研究问题覆盖和独立来源共同决定，chunk 总量只影响写作容量。
            </p>
          </div>
          <span className="font-mono text-lg font-semibold text-accent">{progress}%</span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-violet transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <span className="block text-sm font-semibold text-ink-1">
              {matrix.summary.questions_covered}/{matrix.summary.questions_total}
            </span>
            <span className="text-[0.62rem] text-ink-3">研究问题覆盖</span>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <span className="block text-sm font-semibold text-ink-1">
              {matrix.summary.sections_sufficient}/{matrix.summary.sections_total}
            </span>
            <span className="text-[0.62rem] text-ink-3">章节证据充分</span>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <span className="flex items-center gap-1 text-sm font-semibold text-ink-1">
              <Database size={13} className="text-violet" />
              {matrix.summary.source_count}
            </span>
            <span className="text-[0.62rem] text-ink-3">全局独立来源</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {actionError && (
          <div className="rounded-lg border border-red/25 bg-red/5 px-3 py-2 text-xs text-red">
            {actionError}
          </div>
        )}
        {matrix.sections.map((section) => (
          <SectionCard
            key={section.section_id}
            section={section}
            runStatus={runStatus}
            canSupplement={['done', 'failed', 'interrupted'].includes(runStatus)}
            busyQuestion={busyQuestion}
            onSupplement={(sectionId, questionId) => {
              void supplement(sectionId, questionId)
            }}
          />
        ))}
      </div>
    </div>
  )
}
