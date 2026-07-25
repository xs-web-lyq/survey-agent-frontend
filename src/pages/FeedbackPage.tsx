/** 反馈数据台:打分记录、链路统计、微调语料导出 */

import { useEffect, useState } from 'react'
import { Database, Download, Star, ThumbsDown, ThumbsUp } from 'lucide-react'

interface FeedbackRow {
  id: string
  message_id: string
  question: string | null
  answer: string
  route_used: string
  rating: number
  score: number | null
  tags: string[]
  comment: string
  better_answer: string
  created_at: number
}

interface RouteStat {
  route: string
  n: number
  avg_score: number | null
  up: number
  down: number
}

export function FeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [stats, setStats] = useState<RouteStat[]>([])
  const [routeFilter, setRouteFilter] = useState('')
  const [fmt, setFmt] = useState('sharegpt')
  const [minScore, setMinScore] = useState(4)

  useEffect(() => {
    const q = routeFilter ? `?route=${routeFilter}` : ''
    fetch(`/api/feedback${q}`).then((r) => r.json()).then(setRows).catch(() => {})
    fetch('/api/feedback/stats')
      .then((r) => r.json())
      .then((d) => setStats(d.by_route ?? []))
      .catch(() => {})
  }, [routeFilter])

  const maxScore = Math.max(...stats.map((s) => s.avg_score ?? 0), 0.01)

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Database className="text-accent" size={22} />
        <h1 className="text-lg font-semibold">反馈数据台</h1>
        <span className="text-xs text-ink-3">({rows.length} 条记录)</span>
      </div>

      {/* 链路对比 + 导出 */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface-1 p-4">
          <h2 className="mb-3 text-xs font-medium text-ink-2">各链路平均分</h2>
          {stats.length === 0 && <p className="text-xs text-ink-3">暂无数据</p>}
          <div className="space-y-2">
            {stats.map((s) => (
              <div key={s.route} className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 font-mono text-ink-2">{s.route || '?'}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-surface-2">
                  <div
                    className="h-full rounded bg-accent/50"
                    style={{ width: `${((s.avg_score ?? 0) / Math.max(5, maxScore)) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-ink-1">
                  {s.avg_score?.toFixed(1) ?? '-'}
                </span>
                <span className="flex w-14 items-center justify-end gap-0.5 text-ink-3">
                  <ThumbsUp size={10} className="text-green" />{s.up}
                  <ThumbsDown size={10} className="ml-1 text-red" />{s.down}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface-1 p-4">
          <h2 className="mb-3 text-xs font-medium text-ink-2">导出微调语料</h2>
          <div className="mb-3 flex items-center gap-2">
            {['sharegpt', 'alpaca', 'dpo'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFmt(f)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  fmt === f
                    ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                    : 'bg-surface-2 text-ink-3 hover:text-ink-1'
                }`}
              >
                {f}
              </button>
            ))}
            {fmt !== 'dpo' && (
              <label className="ml-auto flex items-center gap-1.5 text-xs text-ink-3">
                最低星级
                <select
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="rounded border border-line bg-surface-0 px-1.5 py-0.5 text-ink-1"
                >
                  {[3, 4, 5].map((s) => <option key={s} value={s}>{s}★</option>)}
                </select>
              </label>
            )}
          </div>
          <a
            href={`/api/export/finetune?format=${fmt}&min_score=${minScore}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent/15 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/25"
          >
            <Download size={15} />
            下载 {fmt}.jsonl
          </a>
          <p className="mt-2 text-[0.68rem] leading-relaxed text-ink-3">
            sharegpt/alpaca 取高分回答做 SFT;dpo 用"更优答案 vs 原回答"与
            "同题高分 vs 低分"构造偏好对。可直接被 LLaMA-Factory 读取。
          </p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-ink-3">链路筛选:</span>
        <button
          type="button"
          onClick={() => setRouteFilter('')}
          className={`rounded-full px-2.5 py-0.5 text-xs ${!routeFilter ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-ink-3'}`}
        >
          全部
        </button>
        {stats.map((s) => (
          <button
            key={s.route}
            type="button"
            onClick={() => setRouteFilter(s.route)}
            className={`rounded-full px-2.5 py-0.5 text-xs ${routeFilter === s.route ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-ink-3'}`}
          >
            {s.route}
          </button>
        ))}
      </div>

      {/* 记录表 */}
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left text-ink-3">
              <th className="px-3 py-2 font-medium">问题</th>
              <th className="px-3 py-2 font-medium">链路</th>
              <th className="px-3 py-2 font-medium">评价</th>
              <th className="px-3 py-2 font-medium">标签</th>
              <th className="px-3 py-2 font-medium">时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/50 hover:bg-surface-1">
                <td className="max-w-64 truncate px-3 py-2 text-ink-1" title={r.question ?? ''}>
                  {r.question ?? '(未知)'}
                </td>
                <td className="px-3 py-2 font-mono text-violet">{r.route_used}</td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1">
                    {r.rating === 1 && <ThumbsUp size={11} className="text-green" />}
                    {r.rating === -1 && <ThumbsDown size={11} className="text-red" />}
                    {r.score != null && (
                      <span className="flex items-center gap-0.5 text-amber">
                        <Star size={10} className="fill-amber" />{r.score}
                      </span>
                    )}
                    {r.better_answer && (
                      <span className="rounded bg-violet/15 px-1 text-[0.6rem] text-violet">
                        有更优答案
                      </span>
                    )}
                  </span>
                </td>
                <td className="max-w-40 truncate px-3 py-2 text-ink-3">
                  {r.tags.join(', ')}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-3">
                  {new Date(r.created_at * 1000).toLocaleString('zh-CN', {
                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-ink-3">
                  暂无反馈记录 — 在对话页给回答打分后,数据会出现在这里
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
