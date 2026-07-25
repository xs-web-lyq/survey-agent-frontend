/** 人在环输入条:大纲确认 / 中途插话 */

import { useState } from 'react'
import { AlertTriangle, Check, MessageSquareText, RefreshCw, SendHorizonal } from 'lucide-react'
import type { SurveyRunState } from '../lib/useSurveyEvents'

export function ApprovalBar({
  taskId,
  run,
}: {
  taskId: string
  run: SurveyRunState
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [retryError, setRetryError] = useState('')

  const send = async (kind: string, msg = '') => {
    setSending(true)
    try {
      await fetch(`/api/tasks/${taskId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, text: msg }),
      })
      setText('')
    } finally {
      setSending(false)
    }
  }

  const resume = async () => {
    setSending(true)
    setRetryError('')
    try {
      const response = await fetch(`/api/tasks/${taskId}/resume`, {
        method: 'POST',
      })
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(String(detail.detail ?? `HTTP ${response.status}`))
      }
      window.location.reload()
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : '恢复失败')
    } finally {
      setSending(false)
    }
  }

  if (run.status === 'failed' || run.status === 'interrupted') {
    return (
      <div className="border-t border-red/30 bg-red/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0 text-red" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-1">任务已中断，已保存的搜证与章节检查点仍然保留</p>
            <p className="mt-0.5 truncate text-[0.68rem] text-ink-3">
              {retryError || run.error || '系统会自动判断从搜证、章节写作或终稿阶段继续'}
            </p>
          </div>
          <button
            type="button"
            disabled={sending}
            onClick={() => void resume()}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-red/12 px-3 py-1.5 text-xs font-medium text-red transition-colors hover:bg-red/20 disabled:opacity-50"
          >
            <RefreshCw size={13} className={sending ? 'animate-spin' : ''} />
            {sending ? '正在恢复' : '从检查点继续'}
          </button>
        </div>
      </div>
    )
  }

  // 大纲确认模式
  if (run.status === 'waiting_input' && run.needInput?.kind === 'approve_outline') {
    return (
      <div className="border-t border-amber/30 bg-amber/5 px-4 py-3">
        <p className="mb-2 text-xs text-amber">
          📋 大纲已生成(见右侧 outline.md)。确认后开始撰写,或输入修改意见重新规划。
        </p>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim())
                void send('revise_outline', text.trim())
            }}
            placeholder="修改意见(可选)"
            className="flex-1 rounded-lg border border-line bg-surface-0 px-3 py-1.5 text-xs text-ink-1 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
          />
          {text.trim() ? (
            <button
              type="button"
              disabled={sending}
              onClick={() => void send('revise_outline', text.trim())}
              className="flex items-center gap-1 rounded-lg bg-amber/15 px-3 py-1.5 text-xs font-medium text-amber hover:bg-amber/25"
            >
              <SendHorizonal size={13} />
              修改大纲
            </button>
          ) : (
            <button
              type="button"
              disabled={sending}
              onClick={() => void send('approve')}
              className="flex items-center gap-1 rounded-lg bg-green/15 px-3 py-1.5 text-xs font-medium text-green hover:bg-green/25"
            >
              <Check size={13} />
              确认大纲
            </button>
          )}
        </div>
      </div>
    )
  }

  // 运行中:插话模式
  if (run.status === 'running') {
    return (
      <div className="border-t border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquareText size={14} className="shrink-0 text-ink-3" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) void send('instruction', text.trim())
            }}
            placeholder="向 agent 插话(下一节生效),如:第4节重点写工艺参数"
            className="flex-1 rounded-lg border border-line bg-surface-0 px-3 py-1.5 text-xs text-ink-1 placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
          />
          <button
            type="button"
            disabled={sending || !text.trim()}
            onClick={() => void send('instruction', text.trim())}
            className="rounded-lg bg-accent/15 p-1.5 text-accent hover:bg-accent/25 disabled:opacity-40"
          >
            <SendHorizonal size={13} />
          </button>
        </div>
      </div>
    )
  }

  return null
}
