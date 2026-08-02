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

export interface SurveyDesktopBridge {
  getRuntimeInfo(): Promise<DesktopRuntimeInfo>
  getConnectionState(): Promise<DesktopConnectionState>
  onConnectionChanged(listener: (state: DesktopConnectionState) => void): () => void
  retryConnection(): Promise<void>
}

declare global {
  interface Window {
    surveyDesktop?: SurveyDesktopBridge
  }
}

export function getDesktopBridge(): SurveyDesktopBridge | null {
  return window.surveyDesktop ?? null
}
