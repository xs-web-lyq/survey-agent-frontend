/** 问答主页:GPT 式对话流(左侧会话列表 + 中央对话) */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Brain, GitFork, Loader2, SendHorizonal, Sparkles, Telescope } from 'lucide-react'
import { api } from '../lib/api'
import { retryChat, streamChat } from '../lib/sse'
import type { SSEHandlers } from '../lib/sse'
import type { ChatMessageData, Citation, ConversationSummary, TraceItem } from '../lib/types'
import { ChatMessage } from '../components/ChatMessage'
import { RouteSelector } from '../components/RouteSelector'
import { DragHandle, useDragWidth } from '../lib/useDragWidth'
import { MemoryPanel } from '../components/MemoryPanel'
import { ConversationSidebar } from '../components/ConversationSidebar'
import { RecycleBinPanel } from '../components/RecycleBinPanel'

let tempIdCounter = 0

export function ChatPage() {
  const { convId } = useParams()
  const navigate = useNavigate()
  const [routes, setRoutes] = useState<string[]>(['mix'])
  const [kbName, setKbName] = useState('')
  const [route, setRoute] = useState('mix')
  const [deep, setDeep] = useState(false)
  const [convs, setConvs] = useState<ConversationSummary[]>([])
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null)
  const [statusLine, setStatusLine] = useState('')
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [lastDeleted, setLastDeleted] = useState<ConversationSummary | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // 会话工作区宽度可拖拽，导航轨由 App 统一负责。
  const { width: sideW, handleProps } = useDragWidth(
    'chat-sidebar-width', 264, 220, 420,
  )

  useEffect(() => {
    api.meta().then((m) => {
      setRoutes(m.routes)
      setKbName(m.kb_name)
    }).catch(() => {})
    void refreshConvs()
  }, [])

  const refreshConvs = async () => {
    try {
      setConvs(await api.conversations())
    } catch { /* 后端未启动时忽略 */ }
  }

  const forkCurrent = async () => {
    if (!convId || busy) return
    const forked = await api.forkConversation(convId)
    await refreshConvs()
    navigate(`/chat/${forked.id}`)
  }

  const renameConversation = async (id: string, title: string) => {
    await api.renameConversation(id, title)
    setConvs((prev) => prev.map((item) => item.id === id ? { ...item, title } : item))
  }

  const deleteConversation = async (id: string) => {
    const deleted = convs.find((item) => item.id === id) ?? null
    await api.deleteConversation(id)
    setConvs((prev) => prev.filter((item) => item.id !== id))
    setLastDeleted(deleted)
    if (convId === id) navigate('/chat')
  }

  const undoDelete = async () => {
    if (!lastDeleted) return
    const restored = lastDeleted
    await api.restoreConversation(restored.id)
    setLastDeleted(null)
    await refreshConvs()
  }

  const exportConversation = async (id: string) => {
    try {
      await api.exportConversation(id)
    } catch (error) {
      setStatusLine(`导出失败：${error instanceof Error ? error.message : String(error)}`)
      window.setTimeout(() => setStatusLine(''), 3500)
    }
  }

  // 加载历史会话
  useEffect(() => {
    if (!convId) {
      setMessages([])
      return
    }
    api.conversation(convId).then((conv) => {
      const msgs = (conv.messages as Record<string, unknown>[]).map((m) => ({
        id: String(m.id),
        role: m.role as 'user' | 'assistant',
        content: String(m.content),
        route_requested: String(m.route_requested ?? ''),
        route_used: String(m.route_used ?? ''),
        citations: (m.citations as Citation[]) ?? [],
        trace: (m.trace as TraceItem[]) ?? [],
        latency_ms: Number(m.latency_ms ?? 0),
        status: (m.status as ChatMessageData['status']) ?? 'completed',
        error: (m.error as ChatMessageData['error']) ?? null,
        run_id: String(m.run_id ?? ''),
        feedback: m.feedback as ChatMessageData['feedback'],
      }))
      setMessages(msgs)
    }).catch(() => setMessages([]))
  }, [convId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, statusLine])

  const runAssistantStream = async (
    asstMsg: ChatMessageData,
    execute: (handlers: SSEHandlers, signal: AbortSignal) => Promise<void>,
  ) => {
    let currentMessageId = asstMsg.id
    let streamedConvId: string | null = convId ?? null
    const patchAsst = (
      patch: Partial<ChatMessageData> | ((m: ChatMessageData) => Partial<ChatMessageData>),
    ) => {
      const targetId = currentMessageId
      setMessages((prev) => prev.map((m) => (
        m.id === targetId ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m
      )))
    }

    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await execute({
        onMeta: (d) => {
          streamedConvId = d.conv_id
          const nextId = d.message_id || currentMessageId
          patchAsst({
            id: nextId,
            run_id: d.run_id,
            status: 'running',
            streaming: true,
          })
          currentMessageId = nextId
        },
        onRouteInfo: (d) => {
          patchAsst((m) => ({
            route_used: d.used,
            trace: [...m.trace, { type: 'route_info', data: d as unknown as Record<string, unknown>, ts: Date.now() / 1000 }],
          }))
          setStatusLine(`链路 ${d.used} 检索中…`)
        },
        onMemoryLoaded: (d) => {
          patchAsst((m) => ({
            trace: [...m.trace, { type: 'memory_loaded', data: d, ts: Date.now() / 1000 }],
          }))
          const count = Number(d.recent_messages ?? 0)
          if (count > 0) setStatusLine(`已恢复 ${count} 条上下文，正在理解追问…`)
        },
        onQueryRewritten: (d) => {
          patchAsst((m) => ({
            trace: [...m.trace, { type: 'query_rewritten', data: d, ts: Date.now() / 1000 }],
          }))
          setStatusLine('已结合对话上下文改写检索问题…')
        },
        onMemoryUpdated: (d) => patchAsst((m) => ({
          trace: [...m.trace, { type: 'memory_updated', data: d, ts: Date.now() / 1000 }],
        })),
        onMemoryCompacted: (d) => patchAsst((m) => ({
          trace: [...m.trace, { type: 'memory_compacted', data: d, ts: Date.now() / 1000 }],
        })),
        onToolCall: (d) => patchAsst((m) => ({
          trace: [...m.trace, { type: 'tool_call', data: d, ts: Date.now() / 1000 }],
        })),
        onToolResult: (d) => {
          patchAsst((m) => ({
            trace: [...m.trace, { type: 'tool_result', data: d, ts: Date.now() / 1000 }],
          }))
          setStatusLine('正在生成回答…')
        },
        onDeepRound: (d) => {
          patchAsst((m) => ({
            trace: [...m.trace, { type: 'deep_round', data: d, ts: Date.now() / 1000 }],
          }))
          if (d.verdict === 'insufficient') {
            setStatusLine(`第 ${d.round} 轮补充搜证:${String(d.query ?? '').slice(0, 30)}…`)
          } else if (d.verdict === 'sufficient') {
            setStatusLine('证据充分,正在生成回答…')
          }
        },
        onThinking: (d) => {
          patchAsst((m) => ({
            trace: [...m.trace, {
              type: 'thinking',
              data: d as unknown as Record<string, unknown>,
              ts: Date.now() / 1000,
            }],
          }))
          setStatusLine(d.text)
        },
        onTextDelta: (delta) => {
          setStatusLine('')
          patchAsst((m) => ({ content: m.content + delta }))
        },
        onCitations: (items) => patchAsst({ citations: items as Citation[] }),
        onStatus: (d) => {
          if (d.status === 'failed') {
            patchAsst({
              streaming: false,
              status: 'failed',
              run_id: d.run_id,
              error: {
                code: d.error_code,
                message: d.error ?? '本轮问答执行失败，请稍后重试。',
                stage: d.stage,
              },
            })
          } else if (d.status === 'done') {
            patchAsst({ status: 'completed' })
          }
          if (d.latency_ms) patchAsst({ latency_ms: d.latency_ms })
        },
        onSaved: (d) => {
          const nextId = d.message_id || currentMessageId
          patchAsst({
            id: nextId,
            run_id: d.run_id,
            status: d.status === 'failed' ? 'failed' : 'completed',
            streaming: false,
          })
          currentMessageId = nextId
        },
      }, ctrl.signal)
    } catch (err) {
      patchAsst({
        streaming: false,
        status: 'failed',
        error: {
          code: 'StreamError',
          message: `连接中断：${err instanceof Error ? err.message : String(err)}`,
          stage: 'stream',
        },
      })
    } finally {
      patchAsst({ streaming: false })
      abortRef.current = null
    }
    return streamedConvId
  }

  const send = async () => {
    const question = input.trim()
    if (!question || busy) return
    setInput('')
    setBusy(true)
    setStatusLine('正在检索…')

    const userMsg: ChatMessageData = {
      id: `tmp-u-${++tempIdCounter}`,
      role: 'user',
      content: question,
      citations: [],
      trace: [],
    }
    const asstMsg: ChatMessageData = {
      id: `tmp-a-${++tempIdCounter}`,
      role: 'assistant',
      content: '',
      route_requested: route,
      citations: [],
      trace: [],
      streaming: true,
      status: 'running',
    }
    setMessages((prev) => [...prev, userMsg, asstMsg])

    try {
      const newConvId = await runAssistantStream(
        asstMsg,
        (handlers, signal) => streamChat(
          { question, route, conv_id: convId ?? null, deep }, handlers, signal,
        ),
      )
      if (!convId && newConvId) navigate(`/chat/${newConvId}`, { replace: true })
    } finally {
      setBusy(false)
      setStatusLine('')
      void refreshConvs()
    }
  }

  const retryRun = async (runId: string) => {
    if (busy) return
    setBusy(true)
    setRetryingRunId(runId)
    setStatusLine('正在重新执行本轮问答…')
    const asstMsg: ChatMessageData = {
      id: `tmp-retry-${++tempIdCounter}`,
      role: 'assistant',
      content: '',
      citations: [],
      trace: [],
      streaming: true,
      status: 'running',
    }
    setMessages((prev) => [...prev, asstMsg])
    try {
      await runAssistantStream(
        asstMsg,
        (handlers, signal) => retryChat(runId, handlers, signal),
      )
    } finally {
      setBusy(false)
      setRetryingRunId(null)
      setStatusLine('')
      void refreshConvs()
    }
  }

  return (
    <div className="chat-shell flex h-full">
      <ConversationSidebar
        conversations={convs}
        activeId={convId}
        kbName={kbName}
        width={sideW}
        onNew={() => navigate('/chat')}
        onSelect={(id) => navigate(`/chat/${id}`)}
        onRename={renameConversation}
        onDelete={deleteConversation}
        onExport={exportConversation}
        onOpenTrash={() => setTrashOpen(true)}
      />
      <DragHandle {...handleProps} />

      {/* 对话区 */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="aurora-orb aurora-orb-one" />
          <span className="aurora-orb aurora-orb-two" />
          <span className="aurora-orb aurora-orb-three" />
        </div>
        <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-line/70 bg-surface-0/20 px-6 backdrop-blur-sm">
          <div>
            <p className="text-sm font-semibold tracking-tight text-ink-1">Research Copilot</p>
            <p className="text-[0.65rem] text-ink-3">{kbName || '知识库准备中'}</p>
          </div>
          <div className="flex items-center gap-2">
            {convId && (
              <button type="button" onClick={() => void forkCurrent()} className="memory-trigger" title="从当前记录创建对话分支">
                <GitFork size={13} />分支
              </button>
            )}
            <button
              type="button"
              onClick={() => setMemoryOpen(true)}
              className="memory-trigger"
              title="查看本次对话记忆"
            >
              <Brain size={14} />
              Memory
            </button>
          </div>
        </header>
        <div className="relative z-[1] flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-7">
            {messages.length === 0 && (
              <div className="hero-state flex min-h-[46vh] flex-col items-center justify-center text-center">
                <span className="hero-spark mb-5"><Sparkles size={24} /></span>
                <h1 className="hero-title">今天想研究什么？</h1>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-3">
                  我会记住对话主题、消解后续指代，并基于 {kbName || '当前知识库'}
                  给出可追溯的中英文证据。
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-ink-3">
                  <span className="hero-chip">中英文文献平衡</span>
                  <span className="hero-chip">多轮语义记忆</span>
                  <span className="hero-chip">原文引用溯源</span>
                </div>
              </div>
            )}
            <div className="space-y-6">
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  msg={m}
                  onRetry={(runId) => void retryRun(runId)}
                  retrying={retryingRunId === m.run_id}
                />
              ))}
            </div>
            {statusLine && (
              <div className="mt-4 flex items-center gap-2 text-xs text-ink-3">
                <Loader2 size={13} className="animate-spin text-accent" />
                {statusLine}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* 输入区 */}
        <div className="relative z-10 bg-gradient-to-t from-surface-0 via-surface-0/95 to-transparent pt-3">
          <div className="mx-auto max-w-4xl px-6 pb-5">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <RouteSelector routes={routes} value={route} onChange={setRoute} disabled={busy} />
              <span className="mx-1 h-4 w-px bg-line" />
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeep(!deep)}
                title="深度模式:回答前自动评估证据充分性,不足时循环补充检索(最多3轮)。更全面但更慢。"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  deep
                    ? 'bg-violet/15 text-violet ring-1 ring-violet/40'
                    : 'bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink-1'
                } ${busy ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <Telescope size={12} />
                深度模式
              </button>
              <button
                type="button"
                onClick={() => setMemoryOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-surface-2/80 px-3 py-1 text-xs font-medium text-ink-2 transition hover:bg-surface-3 hover:text-accent"
              >
                <Brain size={12} />记忆
              </button>
            </div>
            <div className="composer-shell flex items-end gap-2 rounded-[26px] border p-2.5 backdrop-blur-xl">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    void send()
                  }
                }}
                placeholder="输入问题,Enter 发送,Shift+Enter 换行"
                rows={Math.min(4, Math.max(1, input.split('\n').length))}
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ink-1 placeholder:text-ink-3 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || !input.trim()}
                className="send-button rounded-full p-2.5 text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      <MemoryPanel open={memoryOpen} convId={convId} onClose={() => setMemoryOpen(false)} />
      <RecycleBinPanel
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        onChanged={() => void refreshConvs()}
      />
      {lastDeleted && (
        <div className="fixed bottom-5 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-xs text-ink-2 shadow-xl">
          <span>“{lastDeleted.title || '未命名对话'}”已移入回收站</span>
          <button type="button" onClick={() => void undoDelete()} className="font-semibold text-accent hover:underline">
            撤销
          </button>
          <button type="button" onClick={() => setLastDeleted(null)} className="text-ink-3 hover:text-ink-1" aria-label="关闭提示">
            ×
          </button>
        </div>
      )}
    </div>
  )
}
