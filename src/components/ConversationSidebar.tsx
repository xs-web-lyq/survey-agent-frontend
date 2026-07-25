import { useEffect, useMemo, useState } from 'react'
import { Check, CirclePlus, Database, Download, MessageSquareText, MoreHorizontal, Pencil, Search, Sparkles, Trash2, X } from 'lucide-react'
import type { ConversationSummary } from '../lib/types'

interface ConversationSidebarProps {
  conversations: ConversationSummary[]
  activeId?: string
  kbName: string
  width: number
  onNew: () => void
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onExport: (id: string) => Promise<void>
}

function displayTitle(title: string) {
  return (title || '未命名对话').replace(/^[💡🧠]\s*/u, '')
}

function relativeTime(value: number | null) {
  if (!value) return '尚无消息'
  const seconds = Math.max(0, Date.now() / 1000 - value)
  if (seconds < 60) return '刚刚'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} 天前`
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' })
    .format(new Date(value * 1000))
}

export function ConversationSidebar({
  conversations,
  activeId,
  kbName,
  width,
  onNew,
  onSelect,
  onRename,
  onDelete,
  onExport,
}: ConversationSidebarProps) {
  const [query, setQuery] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!menuId) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.sidebar-conversation-actions')) return
      setMenuId(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuId(null)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer, true)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuId])
  const groups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    const filtered = normalized
      ? conversations.filter((item) => displayTitle(item.title).toLocaleLowerCase().includes(normalized))
      : conversations
    const recentBoundary = Date.now() / 1000 - 7 * 86400
    return {
      recent: filtered.filter((item) => (item.last_message_at ?? item.created_at) >= recentBoundary),
      earlier: filtered.filter((item) => (item.last_message_at ?? item.created_at) < recentBoundary),
      total: filtered.length,
    }
  }, [conversations, query])

  const renderGroup = (label: string, items: ConversationSummary[]) => {
    if (!items.length) return null
    return (
      <section className="conversation-group" aria-label={label}>
        <div className="conversation-group-label">
          <span>{label}</span>
          <span>{items.length}</span>
        </div>
        <div className="space-y-1">
          {items.map((item) => {
            const active = item.id === activeId
            const renaming = renamingId === item.id
            const busy = busyId === item.id
            const startRename = () => {
              setMenuId(null)
              setRenamingId(item.id)
              setRenameValue(displayTitle(item.title))
            }
            const submitRename = async () => {
              const nextTitle = renameValue.trim()
              if (!nextTitle || busy) return
              setBusyId(item.id)
              try {
                await onRename(item.id, nextTitle)
                setRenamingId(null)
              } finally {
                setBusyId(null)
              }
            }
            return (
              <div
                key={item.id}
                className={`sidebar-conversation-card group ${active ? 'is-active' : ''} ${menuId === item.id ? 'is-menu-open' : ''}`}
              >
                {renaming ? (
                  <div className="sidebar-conversation-rename">
                    <Pencil size={13} className="text-ink-3" aria-hidden="true" />
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void submitRename()
                        if (event.key === 'Escape') setRenamingId(null)
                      }}
                      maxLength={120}
                      autoFocus
                      aria-label="会话名称"
                    />
                    <button type="button" onClick={() => void submitRename()} disabled={busy || !renameValue.trim()} aria-label="保存名称">
                      <Check size={14} />
                    </button>
                    <button type="button" onClick={() => setRenamingId(null)} disabled={busy} aria-label="取消重命名">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className="sidebar-conversation-main"
                    >
                      <span className="sidebar-conversation-icon" aria-hidden="true">
                        <MessageSquareText size={15} />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="line-clamp-2 text-[0.76rem] font-medium leading-[1.35] text-ink-1">
                          {displayTitle(item.title)}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-[0.62rem] text-ink-3">
                          <span>{item.message_count} 条消息</span>
                          <span aria-hidden="true">·</span>
                          <span>{relativeTime(item.last_message_at ?? item.created_at)}</span>
                        </span>
                      </span>
                    </button>
                    <span className="sidebar-active-dot" aria-hidden="true" />
                    <div className="sidebar-conversation-actions">
                      <button
                        type="button"
                        className="sidebar-conversation-more"
                        onClick={(event) => {
                          event.stopPropagation()
                          setMenuId(menuId === item.id ? null : item.id)
                        }}
                        aria-label={`管理会话：${displayTitle(item.title)}`}
                        aria-expanded={menuId === item.id}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {menuId === item.id && (
                        <div className="sidebar-conversation-menu" role="menu">
                          <button type="button" role="menuitem" onClick={startRename}>
                            <Pencil size={13} /> 重命名
                          </button>
                          <button type="button" role="menuitem" onClick={() => { setMenuId(null); void onExport(item.id) }}>
                            <Download size={13} /> 导出 Markdown
                          </button>
                          <button type="button" role="menuitem" className="is-danger" onClick={() => {
                            setMenuId(null)
                            if (window.confirm(`确定删除“${displayTitle(item.title)}”吗？\n删除后无法恢复。`)) void onDelete(item.id)
                          }}>
                            <Trash2 size={13} /> 删除会话
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <aside className="chat-sidebar flex shrink-0 flex-col" style={{ width }}>
      <div className="sidebar-command-zone">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-3">研究对话</p>
            <p className="mt-0.5 text-[0.62rem] text-ink-3">{conversations.length} 个对话线程</p>
          </div>
          <Sparkles size={15} className="text-violet/70" aria-hidden="true" />
        </div>

        <button type="button" onClick={onNew} className="sidebar-new-chat">
          <span className="sidebar-new-chat-icon"><CirclePlus size={17} /></span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[0.78rem] font-semibold text-ink-1">新对话</span>
            <span className="block text-[0.62rem] text-ink-3">开始一次新的研究</span>
          </span>
        </button>

        <label className="sidebar-search">
          <Search size={14} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索对话"
            aria-label="搜索对话"
          />
          {query && <span className="text-[0.58rem] text-ink-3">{groups.total}</span>}
        </label>
      </div>

      <nav className="sidebar-conversation-list" aria-label="历史对话">
        {renderGroup('最近 7 天', groups.recent)}
        {renderGroup('更早', groups.earlier)}
        {groups.total === 0 && (
          <div className="mx-2 rounded-xl border border-dashed border-line/80 px-3 py-7 text-center text-[0.68rem] text-ink-3">
            没有找到匹配的对话
          </div>
        )}
      </nav>

      {kbName && (
        <div className="sidebar-kb-footer" title={kbName}>
          <span className="sidebar-kb-icon"><Database size={13} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.58rem] uppercase tracking-[0.1em] text-ink-3">当前知识库</span>
            <span className="block truncate text-[0.66rem] font-medium text-ink-2">{kbName}</span>
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-green shadow-[0_0_8px_var(--color-green)]" aria-label="知识库在线" />
        </div>
      )}
    </aside>
  )
}
