import { useEffect, useState } from 'react'
import { Cloud, CloudOff, LoaderCircle, Monitor } from 'lucide-react'
import {
  getDesktopBridge,
  type DesktopConnectionState,
  type DesktopRuntimeInfo,
} from '../lib/desktop'

export function DesktopStatusBar() {
  const bridge = getDesktopBridge()
  const [runtime, setRuntime] = useState<DesktopRuntimeInfo | null>(null)
  const [connection, setConnection] = useState<DesktopConnectionState>({
    status: 'connecting',
    checkedAt: Date.now(),
  })

  useEffect(() => {
    if (!bridge) return
    let active = true
    void Promise.all([
      bridge.getRuntimeInfo(),
      bridge.getConnectionState(),
    ]).then(([nextRuntime, nextConnection]) => {
      if (!active) return
      setRuntime(nextRuntime)
      setConnection(nextConnection)
    })
    const unsubscribe = bridge.onConnectionChanged((next) => {
      if (active) setConnection(next)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [bridge])

  if (!bridge) return null

  const status = {
    connecting: {
      label: '正在连接 Agent Core',
      icon: <LoaderCircle size={11} className="animate-spin text-accent" />,
    },
    online: {
      label: connection.latencyMs != null
        ? `Agent Core 在线 · ${connection.latencyMs} ms`
        : 'Agent Core 在线',
      icon: <Cloud size={11} className="text-green" />,
    },
    offline: {
      label: 'Agent Core 离线',
      icon: <CloudOff size={11} className="text-red" />,
    },
  }[connection.status]

  return (
    <footer
      className="flex h-7 shrink-0 items-center gap-3 border-t border-line bg-surface-1 px-3 text-[0.65rem] text-ink-3"
      aria-label="桌面运行状态"
    >
      <span className="inline-flex items-center gap-1.5">
        <Monitor size={11} className="text-violet" />
        Desktop {runtime ? `v${runtime.appVersion}` : ''}
      </span>
      <span className="h-3 w-px bg-line" />
      <span className="inline-flex items-center gap-1.5" role="status">
        {status.icon}
        {status.label}
      </span>
      {runtime && <span className="ml-auto font-mono">{runtime.backendOrigin}</span>}
    </footer>
  )
}
