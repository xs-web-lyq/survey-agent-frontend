export type DesktopConnectionStatus = 'connecting' | 'online' | 'offline'

export interface DesktopConnectionState {
  status: DesktopConnectionStatus
  checkedAt: number
  latencyMs?: number
  errorCode?: string
}
export interface DesktopRuntimeInfo {
  desktop: true
  appVersion: string
  platform: string
  backendOrigin: string
}

export type AgentCoreStatus = 'starting' | 'ready' | 'stopped' | 'error'

export interface AgentCoreState {
  status: AgentCoreStatus
  restartCount: number
  pid?: number
  startedAt?: number
  lastErrorCode?: string
}

export type ToolCapability = 'read' | 'write' | 'execute' | 'network'

export interface AgentToolDescriptor {
  id: string
  title: string
  description: string
  source: 'builtin' | 'mcp' | 'script'
  capabilities: ToolCapability[]
}

export interface AgentToolInvocation {
  toolId: string
  input?: unknown
}

export interface AgentToolResult {
  invocationId: string
  ok: boolean
  durationMs: number
  output?: unknown
  errorCode?: string
}

export type PermissionDecision = 'allow_once' | 'allow_session' | 'deny'

export interface AgentPermissionRequest {
  id: string
  tool: AgentToolDescriptor
  reason: string
  createdAt: number
}

export interface AgentAuditEvent {
  id: string
  timestamp: number
  eventType: 'core.started' | 'core.stopped' | 'permission.requested' | 'permission.resolved' | 'tool.completed'
  toolId?: string
  decision?: PermissionDecision
  outcome?: 'success' | 'failure'
  durationMs?: number
  errorCode?: string
}

export interface SurveyDesktopBridge {
  getRuntimeInfo(): Promise<DesktopRuntimeInfo>
  getConnectionState(): Promise<DesktopConnectionState>
  onConnectionChanged(listener: (state: DesktopConnectionState) => void): () => void
  retryConnection(): Promise<void>
  getAgentState(): Promise<AgentCoreState>
  onAgentStateChanged(listener: (state: AgentCoreState) => void): () => void
  listAgentTools(): Promise<AgentToolDescriptor[]>
  invokeAgentTool(invocation: AgentToolInvocation): Promise<AgentToolResult>
  getAuditEvents(limit?: number): Promise<AgentAuditEvent[]>
  onPermissionRequested(listener: (request: AgentPermissionRequest) => void): () => void
  resolvePermission(requestId: string, decision: PermissionDecision): Promise<boolean>
}

declare global {
  interface Window {
    surveyDesktop?: SurveyDesktopBridge
  }
}

export function getDesktopBridge(): SurveyDesktopBridge | null {
  return window.surveyDesktop ?? null
}
