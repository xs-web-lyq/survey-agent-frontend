/** 消息气泡:回答 + 引用角标(hover 溯源卡)+ 链路徽章 + 可折叠检索轨迹 */

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { CircleAlert, RotateCcw, Route, Telescope, Timer } from 'lucide-react'
import type { ChatMessageData, Citation } from '../lib/types'
import { FeedbackBar } from './FeedbackBar'
import { ThinkingPanel } from './ThinkingPanel'

/** 把回答文本里的 [1][2] / [1, 2] 角标替换为可交互组件 */
function renderWithCitations(text: string, citations: Citation[]) {
  if (!citations.length) return text
  // react-markdown 处理不了自定义角标,先在文本层替换为链接语法,再用组件渲染
  return text.replace(/\[(\d+(?:\s*[,、]\s*\d+)*)\]/g, (m, nums: string) => {
    const ids = nums.split(/[,、]/).map((s) => s.trim())
    const valid = ids.every((id) => citations.some((c) => String(c.n) === id))
    if (!valid) return m
    return ids.map((id) => `[†${id}](#cite-${id})`).join('')
  })
}

function CitationPopover({ c }: { c: Citation }) {
  const pages = c.page_range?.label
    ?? (c.page_range?.start != null
      ? `p${c.page_range.start}${c.page_range.end != null && c.page_range.end !== c.page_range.start ? `-${c.page_range.end}` : ''}`
      : null)
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-80 -translate-x-1/2 rounded-lg border border-line-bright bg-surface-2 p-3 text-left opacity-0 shadow-xl shadow-black/25 transition-opacity duration-150 group-hover/cite:opacity-100 group-hover/cite:pointer-events-auto">
      <span className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-[0.65rem] text-accent">[{c.n}]</span>
        <span className="truncate text-xs font-medium text-ink-1">{c.source}</span>
      </span>
      {(pages || c.section_title) && (
        <span className="mb-1 block text-[0.68rem] text-ink-3">
          {c.section_title && <span>{c.section_title}</span>}
          {c.section_title && pages && ' · '}
          {pages}
        </span>
      )}
      <span className="line-clamp-4 text-[0.72rem] leading-relaxed text-ink-2">{c.preview}</span>
      {c.images && c.images.length > 0 && (
        <span className="mt-2 grid grid-cols-2 gap-1.5">
          {c.images.slice(0, 4).map((img) => (
            <span key={img.token} className="overflow-hidden rounded-md border border-line bg-surface-0">
              <img
                src={`/api/kb-images/${img.token}`}
                alt={img.caption}
                loading="lazy"
                className="h-20 w-full object-contain"
              />
              <span className="block truncate px-1.5 py-0.5 text-[0.6rem] text-ink-3">
                {img.caption}
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  )
}

export function ChatMessage({
  msg,
  onRetry,
  retrying = false,
}: {
  msg: ChatMessageData
  onRetry?: (runId: string) => void
  retrying?: boolean
}) {
  const isUser = msg.role === 'user'
  const processed = useMemo(
    () => (isUser ? msg.content : renderWithCitations(msg.content, msg.citations)),
    [msg.content, msg.citations, isUser],
  )
  const citeByN = useMemo(() => {
    const m = new Map<string, Citation>()
    msg.citations.forEach((c) => m.set(String(c.n), c))
    return m
  }, [msg.citations])

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent-dim/30 px-4 py-2.5 text-[0.925rem] leading-relaxed">
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start">
      {/* 链路徽章 + 耗时 */}
      {msg.route_used && (
        <div className="mb-1.5 flex items-center gap-2 text-[0.68rem] text-ink-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet/10 px-2 py-0.5 font-medium text-violet">
            <Route size={10} />
            {msg.route_used}
          </span>
          {msg.trace.some((t) => t.type === 'deep_round') && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet/10 px-2 py-0.5 font-medium text-violet">
              <Telescope size={10} />
              深度 ×{msg.trace.filter((t) => t.type === 'deep_round' && t.data.verdict === 'searched').length + 1}
            </span>
          )}
          {msg.latency_ms != null && msg.latency_ms > 0 && (
            <span className="inline-flex items-center gap-1">
              <Timer size={10} />
              {(msg.latency_ms / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      )}

      <ThinkingPanel
        trace={msg.trace}
        active={Boolean(msg.streaming)}
        failed={msg.status === 'failed'}
        latencyMs={msg.latency_ms}
      />

      {msg.status === 'failed' && (
        <div className="mb-3 flex max-w-2xl items-start gap-3 rounded-xl border border-red/25 bg-red/5 px-3.5 py-3 text-sm text-ink-2">
          <CircleAlert size={16} className="mt-0.5 shrink-0 text-red" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink-1">本轮问答未完成</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
              {msg.error?.message ?? '执行状态和已完成的检索轨迹已经保存，可以直接重试。'}
              {msg.error?.stage ? `（失败阶段：${msg.error.stage}）` : ''}
            </p>
          </div>
          {msg.run_id && onRetry && (
            <button
              type="button"
              disabled={retrying}
              onClick={() => onRetry(msg.run_id!)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface-1 px-2.5 py-1.5 text-xs font-medium text-ink-2 transition hover:border-accent/40 hover:text-accent disabled:opacity-50"
            >
              <RotateCcw size={12} className={retrying ? 'animate-spin' : ''} />
              重试
            </button>
          )}
        </div>
      )}

      <div className={`md-body max-w-full ${msg.streaming ? 'typing-cursor' : ''}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            a: ({ href, children }) => {
              const m = /^#cite-(\d+)$/.exec(href ?? '')
              if (m) {
                const c = citeByN.get(m[1])
                if (!c) return <>{children}</>
                return (
                  <span className="group/cite relative">
                    <span className="cite-mark">{m[1]}</span>
                    <CitationPopover c={c} />
                  </span>
                )
              }
              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              )
            },
          }}
        >
          {processed}
        </ReactMarkdown>
      </div>

      {/* 引用列表(折叠在轨迹下方,简洁展示) */}
      {msg.citations.length > 0 && !msg.streaming && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {msg.citations.map((c) => (
            <span key={c.n} className="group/cite relative">
              <span
                className="inline-flex max-w-64 cursor-default items-center gap-1 rounded-md border border-line bg-surface-1 px-2 py-0.5 text-[0.68rem] text-ink-3"
              >
                <span className="font-mono text-accent">[{c.n}]</span>
                <span className="truncate">{c.source}</span>
                {c.images && c.images.length > 0 && <span title="含原文插图">📷</span>}
              </span>
              <CitationPopover c={c} />
            </span>
          ))}
        </div>
      )}

      {/* 打分条(仅已落库的回答) */}
      {!msg.streaming && msg.status !== 'failed' && msg.id && (
        <FeedbackBar messageId={msg.id} existing={msg.feedback} />
      )}
    </div>
  )
}
