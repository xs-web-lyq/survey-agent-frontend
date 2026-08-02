import { useCallback, useEffect, useState } from 'react'
import { Bot, Plus, RefreshCw, Server, Trash2, X } from 'lucide-react'
import {
  getDesktopBridge,
  type AgentToolDescriptor,
  type McpServerConfigInput,
  type McpServerSummary,
} from '../lib/desktop'

interface DesktopToolCenterProps {
  open: boolean
  onClose(): void
}

const STATUS_LABELS = {
  disabled: '已停用',
  connecting: '连接中',
  online: '在线',
  error: '异常',
}

export function DesktopToolCenter({ open, onClose }: DesktopToolCenterProps) {
  const bridge = getDesktopBridge()
  const [servers, setServers] = useState<McpServerSummary[]>([])
  const [tools, setTools] = useState<AgentToolDescriptor[]>([])
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!bridge) return
    try {
      const [nextServers, nextTools] = await Promise.all([
        bridge.listMcpServers(),
        bridge.listAgentTools(),
      ])
      setServers(nextServers)
      setTools(nextTools)
    } catch {
      setError('MCP_LIST_FAILED')
    }
  }, [bridge])

  useEffect(() => {
    if (!bridge || !open) return
    void load()
    return bridge.onMcpStateChanged(() => void load())
  }, [bridge, load, open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!bridge || !open) return null

  const save = async (config: McpServerConfigInput) => {
    setBusy(true)
    setError(null)
    const result = await bridge.saveMcpServer(config)
    setBusy(false)
    if (!result.ok) {
      setError(result.errorCode ?? 'MCP_SAVE_FAILED')
      return
    }
    setShowForm(false)
    await load()
  }

  const toggle = async (server: McpServerSummary) => {
    await save({ ...server, enabled: !server.enabled })
  }

  const remove = async (serverId: string) => {
    setBusy(true)
    setError(null)
    const result = await bridge.removeMcpServer(serverId)
    setBusy(false)
    if (!result.ok) setError(result.errorCode ?? 'MCP_REMOVE_FAILED')
    else await load()
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/35 backdrop-blur-[2px]" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-line bg-surface-1 shadow-2xl" aria-label="工具中心">
        <header className="flex h-14 items-center gap-3 border-b border-line px-5">
          <Bot size={18} className="text-violet" />
          <div>
            <h2 className="font-semibold text-ink-1">工具中心</h2>
            <p className="text-xs text-ink-3">管理 MCP 服务和 Agent Core 工具</p>
          </div>
          <button type="button" onClick={() => void load()} className="ml-auto rounded-lg p-2 text-ink-3 hover:bg-surface-2" title="刷新">
            <RefreshCw size={16} />
          </button>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-3 hover:bg-surface-2" title="关闭">
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          {error && <div role="alert" className="rounded-xl border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">操作失败：{error}</div>}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink-1">MCP 服务</h3>
              <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs text-white">
                <Plus size={13} /> 添加服务
              </button>
            </div>
            {showForm && <McpServerForm busy={busy} onSubmit={save} />}
            <div className="space-y-2">
              {servers.length === 0 && !showForm && (
                <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-ink-3">尚未配置 MCP 服务</p>
              )}
              {servers.map((server) => (
                <div key={server.id} className="rounded-xl border border-line bg-surface-2/60 p-3">
                  <div className="flex items-start gap-3">
                    <Server size={16} className={server.runtime.status === 'online' ? 'mt-0.5 text-green' : 'mt-0.5 text-ink-3'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink-1">{server.name}</span>
                        <span className="rounded-full border border-line px-2 py-0.5 text-[0.65rem] text-ink-3">
                          {STATUS_LABELS[server.runtime.status]} · {server.runtime.toolCount} 工具
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[0.65rem] text-ink-3">{server.command} {server.args.join(' ')}</p>
                      {server.runtime.lastErrorCode && <p className="mt-1 text-xs text-red">{server.runtime.lastErrorCode}</p>}
                    </div>
                    <button type="button" disabled={busy} onClick={() => void toggle(server)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-2 hover:bg-surface-1 disabled:opacity-50">
                      {server.enabled ? '停用' : '启用'}
                    </button>
                    <button type="button" disabled={busy} onClick={() => void remove(server.id)} className="rounded-lg p-1.5 text-ink-3 hover:bg-red/10 hover:text-red disabled:opacity-50" title="移除">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium text-ink-1">已发现工具 <span className="text-ink-3">{tools.length}</span></h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {tools.map((tool) => (
                <div key={tool.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-ink-1">{tool.title}</span>
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.6rem] uppercase text-ink-3">{tool.source}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-3">{tool.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}

function McpServerForm({ busy, onSubmit }: { busy: boolean; onSubmit(config: McpServerConfigInput): Promise<void> }) {
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [cwd, setCwd] = useState('')
  const [inheritEnv, setInheritEnv] = useState('')
  const [enabled, setEnabled] = useState(false)

  return (
    <form className="mb-3 space-y-3 rounded-xl border border-accent/25 bg-accent/5 p-3" onSubmit={(event) => {
      event.preventDefault()
      void onSubmit({
        name,
        command,
        args: args.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
        cwd: cwd || undefined,
        enabled,
        inheritEnv: inheritEnv.split(',').map((value) => value.trim()).filter(Boolean),
      })
    }}>
      <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="服务名称" className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-ink-1 outline-none focus:border-accent" />
      <input required value={command} onChange={(event) => setCommand(event.target.value)} placeholder="可执行文件绝对路径，例如 C:\Program Files\nodejs\node.exe" className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 font-mono text-xs text-ink-1 outline-none focus:border-accent" />
      <textarea value={args} onChange={(event) => setArgs(event.target.value)} placeholder="启动参数，每行一个；路径中可以包含空格" rows={3} className="w-full resize-none rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-ink-1 outline-none focus:border-accent" />
      <input value={cwd} onChange={(event) => setCwd(event.target.value)} placeholder="工作目录绝对路径（可选）" className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-ink-1 outline-none focus:border-accent" />
      <input value={inheritEnv} onChange={(event) => setInheritEnv(event.target.value)} placeholder="继承环境变量名称，逗号分隔；不要填写密钥值" className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-ink-1 outline-none focus:border-accent" />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-ink-3"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> 保存后立即启用</label>
        <button type="submit" disabled={busy} className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white disabled:opacity-50">{busy ? '等待确认…' : '保存配置'}</button>
      </div>
      <p className="text-[0.68rem] leading-5 text-ink-3">MCP 服务以当前 Windows 用户权限运行。请只启用可信程序；工作目录不是操作系统级沙箱。</p>
    </form>
  )
}
