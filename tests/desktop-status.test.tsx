import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DesktopStatusBar } from '../src/components/DesktopStatusBar'
import type { SurveyDesktopBridge } from '../src/lib/desktop'

describe('DesktopStatusBar', () => {
  afterEach(() => {
    delete window.surveyDesktop
  })

  it('stays absent in the browser build', () => {
    const { container } = render(<DesktopStatusBar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows runtime and connection state from the restricted bridge', async () => {
    const unsubscribe = vi.fn()
    const bridge: SurveyDesktopBridge = {
      getRuntimeInfo: vi.fn(async () => ({
        desktop: true,
        appVersion: '0.1.0',
        platform: 'win32',
        backendOrigin: 'http://127.0.0.1:8000',
      })),
      getConnectionState: vi.fn(async () => ({
        status: 'online',
        checkedAt: 1,
        latencyMs: 12,
      })),
      onConnectionChanged: vi.fn(() => unsubscribe),
      retryConnection: vi.fn(async () => undefined),
      getAgentState: vi.fn(async () => ({
        status: 'ready',
        restartCount: 0,
        pid: 123,
      })),
      onAgentStateChanged: vi.fn(() => vi.fn()),
      listAgentTools: vi.fn(async () => []),
      invokeAgentTool: vi.fn(async () => ({ invocationId: 'inv-1', ok: true, durationMs: 1 })),
      getAuditEvents: vi.fn(async () => []),
      onPermissionRequested: vi.fn(() => vi.fn()),
      resolvePermission: vi.fn(async () => true),
      listMcpServers: vi.fn(async () => []),
      saveMcpServer: vi.fn(async () => ({ ok: true })),
      removeMcpServer: vi.fn(async () => ({ ok: true })),
      onMcpStateChanged: vi.fn(() => vi.fn()),
    }
    window.surveyDesktop = bridge

    const { unmount } = render(<DesktopStatusBar />)
    await waitFor(() => expect(screen.getByText('检索服务在线 · 12 ms')).toBeInTheDocument())
    expect(screen.getByText('Agent Core 就绪')).toBeInTheDocument()
    expect(screen.getByText('Desktop v0.1.0')).toBeInTheDocument()
    expect(screen.getByText('http://127.0.0.1:8000')).toBeInTheDocument()
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
