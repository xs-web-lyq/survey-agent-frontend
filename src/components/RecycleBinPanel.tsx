import { useEffect, useState } from 'react'
import { ArchiveRestore, Loader2, Trash2, X } from 'lucide-react'
import { api } from '../lib/api'
import type { ConversationSummary } from '../lib/types'

function titleOf(item: ConversationSummary) {
  return item.title || '未命名对话'
}

export function RecycleBinPanel({
  open,
  onClose,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteMemories, setDeleteMemories] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setItems(await api.deletedConversations())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void load()
  }, [open])

  if (!open) return null

  const restore = async (id: string) => {
    setBusyId(id)
    try {
      await api.restoreConversation(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  const purge = async (item: ConversationSummary) => {
    const memoryNotice = deleteMemories ? '，并删除由它生成的长期记忆' : ''
    if (!window.confirm(`永久删除“${titleOf(item)}”${memoryNotice}？此操作无法恢复。`)) return
    setBusyId(item.id)
    try {
      await api.purgeConversation(item.id, deleteMemories)
      setItems((prev) => prev.filter((candidate) => candidate.id !== item.id))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/35 backdrop-blur-[2px]" onMouseDown={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-line bg-surface-1 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        aria-label="会话回收站"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-1">会话回收站</h2>
            <p className="mt-0.5 text-xs text-ink-3">删除的会话可恢复，永久清除后不可撤销</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-3 hover:bg-surface-2 hover:text-ink-1">
            <X size={16} />
          </button>
        </header>

        <label className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-xs text-ink-2">
          <input
            type="checkbox"
            checked={deleteMemories}
            onChange={(event) => setDeleteMemories(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            永久清除时，同时删除由该会话生成的长期记忆
            <span className="mt-0.5 block text-[0.67rem] text-ink-3">默认关闭，以避免误删跨会话使用的用户偏好与研究目标。</span>
          </span>
        </label>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-ink-3">
              <Loader2 size={14} className="animate-spin" /> 正在读取回收站
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="rounded-xl border border-dashed border-line px-4 py-12 text-center text-xs text-ink-3">
              回收站为空
            </div>
          )}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-line bg-surface-2/45 p-3">
                <p className="line-clamp-2 text-sm font-medium text-ink-1">{titleOf(item)}</p>
                <p className="mt-1 text-[0.67rem] text-ink-3">
                  {item.message_count} 条消息 · {item.deleted_at
                    ? new Date(item.deleted_at * 1000).toLocaleString('zh-CN')
                    : '删除时间未知'}
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void restore(item.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-2 hover:border-accent/40 hover:text-accent disabled:opacity-50"
                  >
                    <ArchiveRestore size={12} /> 恢复
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void purge(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red/25 px-2.5 py-1.5 text-xs text-red hover:bg-red/5 disabled:opacity-50"
                  >
                    <Trash2 size={12} /> 永久删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
