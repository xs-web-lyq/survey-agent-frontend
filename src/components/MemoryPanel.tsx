import { useEffect, useState } from 'react'
import { Brain, Database, Loader2, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import { api } from '../lib/api'
import type { MemoryDebug } from '../lib/types'

const KIND_LABEL: Record<string, string> = {
  preference: '偏好',
  goal: '目标',
  decision: '决策',
  episode: '经历',
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 py-2 text-left">
      <span className="text-sm text-ink-2">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${active ? 'bg-accent' : 'bg-surface-3'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
      </span>
    </button>
  )
}

export function MemoryPanel({ open, convId, onClose }: {
  open: boolean
  convId?: string
  onClose: () => void
}) {
  const [data, setData] = useState<MemoryDebug | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!convId) return
    setLoading(true)
    try { setData(await api.conversationMemory(convId)) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (open && convId) void load()
    if (!open) setData(null)
  }, [open, convId])

  const update = async (patch: Partial<MemoryDebug['settings']>) => {
    if (!convId || !data) return
    const settings = { ...data.settings, ...patch }
    await api.updateConversationMemory(convId, settings)
    setData({ ...data, settings })
  }

  const forget = async (id: string) => {
    await api.forgetMemory(id)
    setData((prev) => prev ? { ...prev, memories: prev.memories.filter((m) => m.id !== id) } : prev)
  }

  return (
    <div className={`fixed inset-0 z-50 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!open}>
      <button
        type="button"
        aria-label="关闭记忆面板"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside className={`absolute right-3 top-3 bottom-3 flex w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px] border border-line-bright/70 bg-surface-1/95 shadow-2xl shadow-black/25 backdrop-blur-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-[110%]'}`}>
        <header className="flex items-center gap-3 border-b border-line/70 px-5 py-4">
          <span className="memory-icon"><Brain size={18} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-ink-1">对话记忆</h2>
            <p className="text-xs text-ink-3">工作记忆、压缩摘要与长期偏好分层保存</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-3 hover:bg-surface-2 hover:text-ink-1"><X size={17} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {!convId && (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-3">
              发送第一条消息后即可查看本次对话的记忆状态。
            </div>
          )}
          {loading && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" /></div>}
          {data && !loading && (
            <div className="space-y-5">
              <section className="memory-card memory-card-blue">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-1"><Sparkles size={15} className="text-accent" />当前工作记忆</div>
                <p className="text-xs text-ink-3">当前主题</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-1">{data.state.current_topic || '尚未建立主题'}</p>
                {data.state.constraints && data.state.constraints.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {data.state.constraints.slice(-4).map((item) => <span key={item} className="memory-chip">{item}</span>)}
                  </div>
                )}
              </section>

              <section className="memory-card">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-1"><Database size={15} className="text-violet" />上下文压缩</div>
                {data.summary.version ? (
                  <div className="flex items-center justify-between text-xs text-ink-3">
                    <span>摘要版本 v{data.summary.version}</span><span>约 {data.summary.token_count ?? 0} tokens</span>
                  </div>
                ) : <p className="text-xs text-ink-3">对话尚短，当前无需压缩。</p>}
              </section>

              <section className="memory-card">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium text-ink-1"><ShieldCheck size={15} className="text-green" />隐私与使用范围</div>
                <Toggle active={data.settings.use_memories} onClick={() => void update({ use_memories: !data.settings.use_memories })} label="在本对话中使用长期记忆" />
                <Toggle active={data.settings.generate_memories} onClick={() => void update({ generate_memories: !data.settings.generate_memories })} label="允许本对话生成长期记忆" />
                <p className="mt-2 text-[0.68rem] leading-relaxed text-ink-3">论文事实不会写入长期记忆；长期层只保存明确偏好、目标和决策。</p>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-ink-1">已保存的长期记忆</h3>
                  <span className="text-xs text-ink-3">{data.memories.length} 条</span>
                </div>
                <div className="space-y-2">
                  {data.memories.length === 0 && <p className="rounded-2xl bg-surface-2/70 p-4 text-xs text-ink-3">当你说“我希望以后优先……”或明确研究目标时，系统会在这里保存。</p>}
                  {data.memories.map((memory) => (
                    <article key={memory.id} className="group rounded-2xl border border-line/70 bg-surface-1 p-3.5 shadow-sm">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[0.65rem] font-medium text-violet">{KIND_LABEL[memory.kind] ?? memory.kind}</span>
                        <button type="button" onClick={() => void forget(memory.id)} title="忘记此条" className="rounded-full p-1.5 text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-red/10 hover:text-red"><Trash2 size={13} /></button>
                      </div>
                      <p className="text-xs leading-relaxed text-ink-2">{memory.content}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
