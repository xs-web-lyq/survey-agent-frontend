import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import {
  getDesktopBridge,
  type AgentPermissionRequest,
  type PermissionDecision,
  type ToolCapability,
} from '../lib/desktop'

const CAPABILITY_LABELS: Record<ToolCapability, string> = {
  read: '读取信息',
  write: '修改数据',
  execute: '执行本地操作',
  network: '访问网络',
}

export function DesktopPermissionPrompt() {
  const bridge = getDesktopBridge()
  const [request, setRequest] = useState<AgentPermissionRequest | null>(null)

  useEffect(() => {
    if (!bridge) return
    return bridge.onPermissionRequested(setRequest)
  }, [bridge])

  if (!bridge || !request) return null

  const decide = (decision: PermissionDecision) => {
    const requestId = request.id
    setRequest(null)
    void bridge.resolvePermission(requestId, decision)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="desktop-permission-title"
        className="w-full max-w-md rounded-2xl border border-line bg-surface-1 p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="rounded-xl bg-amber-500/15 p-2 text-amber-400">
            <ShieldAlert size={20} />
          </span>
          <div>
            <h2 id="desktop-permission-title" className="font-semibold text-ink-1">允许 Agent 使用工具？</h2>
            <p className="mt-1 text-sm text-ink-3">{request.tool.title}</p>
          </div>
        </div>
        <p className="rounded-xl bg-surface-2 p-3 text-sm leading-6 text-ink-2">
          {request.tool.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {request.tool.capabilities.map((capability) => (
            <span key={capability} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-3">
              {CAPABILITY_LABELS[capability]}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-3">请求原因：{request.reason}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-surface-2" onClick={() => decide('deny')}>
            拒绝
          </button>
          <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm text-ink-1 hover:bg-surface-2" onClick={() => decide('allow_once')}>
            仅本次允许
          </button>
          <button type="button" className="rounded-lg bg-accent px-3 py-2 text-sm text-white hover:opacity-90" onClick={() => decide('allow_session')}>
            本次会话允许
          </button>
        </div>
      </section>
    </div>
  )
}
