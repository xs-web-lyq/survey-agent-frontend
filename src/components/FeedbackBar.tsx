/** 打分条:👍👎 + 星级 + 标签 + 评语/更优答案弹层 */

import { useState } from 'react'
import { MessageSquarePlus, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import { api } from '../lib/api'
import type { FeedbackData } from '../lib/types'

const TAGS = ['很全面', '引用准确', '答非所问', '引用错误', '证据不足', '表述冗长']

export function FeedbackBar({
  messageId,
  existing,
}: {
  messageId: string
  existing?: FeedbackData | null
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [score, setScore] = useState<number | null>(existing?.score ?? null)
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [betterAnswer, setBetterAnswer] = useState(existing?.better_answer ?? '')
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(!!existing)

  const submit = async (patch?: Partial<{ rating: number; score: number | null; tags: string[] }>) => {
    const payload = {
      message_id: messageId,
      rating: patch?.rating ?? rating,
      score: patch?.score !== undefined ? patch.score : score,
      tags: patch?.tags ?? tags,
      comment,
      better_answer: betterAnswer,
    }
    await api.submitFeedback(payload)
    setSaved(true)
  }

  const toggleTag = (t: string) => {
    const next = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]
    setTags(next)
    void submit({ tags: next })
  }

  return (
    <div className="mt-2.5 w-full">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            const next = rating === 1 ? 0 : 1
            setRating(next)
            void submit({ rating: next })
          }}
          className={`rounded-md p-1.5 transition-colors ${
            rating === 1 ? 'bg-green/15 text-green' : 'text-ink-3 hover:bg-surface-2 hover:text-ink-2'
          }`}
        >
          <ThumbsUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            const next = rating === -1 ? 0 : -1
            setRating(next)
            void submit({ rating: next })
            if (next === -1) setExpanded(true)
          }}
          className={`rounded-md p-1.5 transition-colors ${
            rating === -1 ? 'bg-red/15 text-red' : 'text-ink-3 hover:bg-surface-2 hover:text-ink-2'
          }`}
        >
          <ThumbsDown size={14} />
        </button>

        <span className="mx-1 h-4 w-px bg-line" />

        {/* 星级 */}
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                const next = score === s ? null : s
                setScore(next)
                void submit({ score: next })
              }}
              className="p-0.5"
            >
              <Star
                size={14}
                className={
                  score != null && s <= score
                    ? 'fill-amber text-amber'
                    : 'text-ink-3 hover:text-amber/60'
                }
              />
            </button>
          ))}
        </div>

        <span className="mx-1 h-4 w-px bg-line" />

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.7rem] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-2"
        >
          <MessageSquarePlus size={13} />
          评语
        </button>

        {saved && <span className="text-[0.65rem] text-ink-3">已记录 ✓</span>}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 rounded-lg border border-line bg-surface-1 p-3">
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={`rounded-full px-2.5 py-0.5 text-[0.7rem] transition-colors ${
                  tags.includes(t)
                    ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                    : 'bg-surface-2 text-ink-3 hover:text-ink-2'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="评语(可选)"
            rows={2}
            className="w-full resize-none rounded-md border border-line bg-surface-0 px-2.5 py-1.5 text-xs text-ink-1 placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
          />
          <textarea
            value={betterAnswer}
            onChange={(e) => setBetterAnswer(e.target.value)}
            placeholder="更优答案(可选,高价值微调语料)"
            rows={3}
            className="w-full resize-none rounded-md border border-line bg-surface-0 px-2.5 py-1.5 text-xs text-ink-1 placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                void submit()
                setExpanded(false)
              }}
              className="rounded-md bg-accent/15 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/25"
            >
              提交
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
