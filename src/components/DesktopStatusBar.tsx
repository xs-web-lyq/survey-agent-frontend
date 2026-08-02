import { useEffect, useState } from 'react'
import { Bot, Cloud, CloudOff, LoaderCircle, Monitor } from 'lucide-react'
import {
  getDesktopBridge,
  type AgentCoreState,
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
  const [agent, setAgent] = useState<AgentCoreState>({
    status: 'starting',
    restartCount: 0,
  })

  useEffect(() => {
    if (!bridge) return
    let active = true
    void Promise.all([
      bridge.getRuntimeInfo(),
      bridge.getConnectionState(),
      bridge.getAgentState(),
    ]).then(([nextRuntime, nextConnection, nextAgent]) => {
      if (!active) return
      setRuntime(nextRuntime)
      setConnection(nextConnection)
      setAgent(nextAgent)
    })
    const unsubscribe = bridge.onConnectionChanged((next) => {
      if (active) setConnection(next)
    })
    const unsubscribeAgent = bridge.onAgentStateChanged((next) => {
      if (active) setAgent(next)
    })
    return () => {
      active = false
      unsubscribe()
      unsubscribeAgent()
    }
  }, [bridge])

  if (!bridge) return null

  const status = {
    connecting: {
      label: '正在连接检索服务',
      icon: <LoaderCircle size={11} className="animate-spin text-accent" />,
    },
    online: {
      label: connection.latencyMs != null
        ? `检索服务在线 · ${connection.latencyMs} ms`
        : '检索服务在线',
      icon: <Cloud size={11} className="text-green" />,
    },
    offline: {
      label: '检索服务离线',
      icon: <CloudOff size={11} className="text-red" />,
    },
  }[connection.status]

  const agentLabel = {
    starting: 'Agent Core 启动中',
    ready: 'Agent Core 就绪',
    stopped: 'Agent Core 已停止',
    error: `Agent Core 异常${agent.restartCount ? ` · 重启 ${agent.restartCount}` : ''}`,
  }[agent.status]

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
        {agent.status === 'starting'
          ? <LoaderCircle size={11} className="animate-spin text-violet" />
          : <Bot size={11} className={agent.status === 'ready' ? 'text-green' : 'text-red'} />}
        {agentLabel}
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
