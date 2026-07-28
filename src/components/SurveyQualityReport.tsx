import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import type { SurveyQualityGate, SurveyQualityReport as Report } from '../lib/types'


const STATUS_LABELS: Record<string, string> = {
  ready: '可进入人工终审',
  ready_with_warnings: '可终审，但有提示',
  review_required: '需要处理后再提交',
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  title: '题名',
  authors: '作者',
  year: '年份',
  journal: '期刊名',
  volume: '卷号',
  issue: '期号',
  pages: '页码',
  institution: '授予单位',
  publication_place: '出版地',
}

function GateIcon({ gate }: { gate: SurveyQualityGate }) {
  if (gate.status === 'pass') return <CheckCircle2 size={15} className="text-green" />
  if (gate.status === 'not_applicable') return <CircleDashed size={15} className="text-ink-3" />
  return <AlertTriangle size={15} className="text-amber" />
}

export function SurveyQualityReport({
  taskId,
  revision,
}: {
  taskId: string
  revision: number
}) {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/tasks/${taskId}/quality-report`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<Report>
      })
      .then((data) => {
        setReport(data)
        setError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : '质量报告加载失败')
        }
      })
    return () => controller.abort()
  }, [taskId, revision])

  if (error) {
    return (
      <div className="m-5 rounded-xl border border-red/25 bg-red/5 p-4 text-xs text-red">
        质量报告加载失败：{error}
      </div>
    )
  }
  if (!report) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-xs text-ink-3">
        <RefreshCw size={14} className="animate-spin" /> 正在读取终稿质量门禁…
      </div>
    )
  }

  const ready = report.overall_status === 'ready'
  const summary = report.summary

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-5 py-5">
      <section className={`rounded-2xl border p-4 ${
        ready
          ? 'border-green/30 bg-green/5'
          : 'border-amber/30 bg-amber/5'
      }`}>
        <div className="flex flex-wrap items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            ready ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
          }`}>
            {ready ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
          </span>
          <div className="min-w-36 flex-1">
            <h2 className="text-sm font-semibold text-ink-1">终稿质量门禁</h2>
            <p className="mt-0.5 text-xs text-ink-2">
              {STATUS_LABELS[report.overall_status] ?? report.overall_status}
            </p>
            <p className="mt-1 text-[0.66rem] text-ink-3">
              这是基于证据、引用和文献字段的确定性检查，不是大模型自评。
            </p>
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[0.66rem] font-semibold ${
              ready ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
            }`}>
              {summary.gates_action_required
                ? `${summary.gates_action_required} 项待处理`
                : '全部通过'}
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2">
          <div className="rounded-lg bg-surface-1/80 px-3 py-2">
            <span className="block text-sm font-semibold text-ink-1">
              {summary.research_questions_covered}/{summary.research_questions_total}
            </span>
            <span className="text-[0.62rem] text-ink-3">研究问题覆盖</span>
          </div>
          <div className="rounded-lg bg-surface-1/80 px-3 py-2">
            <span className="block text-sm font-semibold text-ink-1">
              {summary.citations_passed}/{summary.citations_total}
            </span>
            <span className="text-[0.62rem] text-ink-3">引用核查通过</span>
          </div>
          <div className="rounded-lg bg-surface-1/80 px-3 py-2">
            <span className="block text-sm font-semibold text-ink-1">
              {summary.references_complete}/{summary.references_total}
            </span>
            <span className="text-[0.62rem] text-ink-3">文献字段完整</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-surface-1">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <FileCheck2 size={15} className="text-accent" />
          <h3 className="text-xs font-semibold text-ink-1">交付检查项</h3>
        </div>
        {report.gates.map((gate) => (
          <div
            key={gate.id}
            className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <GateIcon gate={gate} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-1">{gate.label}</p>
              <p className="mt-0.5 text-[0.67rem] leading-relaxed text-ink-3">{gate.detail}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[0.62rem] ${
              gate.status === 'pass'
                ? 'bg-green/10 text-green'
                : gate.status === 'not_applicable'
                  ? 'bg-surface-3 text-ink-3'
                  : 'bg-amber/10 text-amber'
            }`}>
              {gate.status === 'pass'
                ? '通过'
                : gate.status === 'not_applicable'
                  ? '不适用'
                  : '待处理'}
            </span>
          </div>
        ))}
      </section>

      {report.recommendations.length > 0 && (
        <section className="rounded-xl border border-amber/25 bg-amber/5 p-4">
          <h3 className="text-xs font-semibold text-amber">提交前建议</h3>
          <ol className="mt-2 space-y-1.5 pl-4 text-[0.7rem] leading-relaxed text-ink-2">
            {report.recommendations.map((item) => (
              <li key={item} className="list-decimal">{item}</li>
            ))}
          </ol>
        </section>
      )}

      {report.bibliography_review.incomplete_references.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-line bg-surface-1">
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-xs font-semibold text-ink-1">待补全文献字段</h3>
          </div>
          {report.bibliography_review.incomplete_references.map((record) => (
            <div
              key={`${record.source}-${record.title}`}
              className="border-b border-line px-4 py-3 last:border-b-0"
            >
              <p className="truncate text-xs text-ink-2">
                {record.title || record.source || '未知文献'}
              </p>
              <p className="mt-1 text-[0.65rem] text-amber">
                缺少：{record.missing_fields
                  .map((field) => MISSING_FIELD_LABELS[field] ?? field)
                  .join('、')}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
