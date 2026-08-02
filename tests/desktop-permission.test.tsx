import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DesktopPermissionPrompt } from '../src/components/DesktopPermissionPrompt'
import type { AgentPermissionRequest, SurveyDesktopBridge } from '../src/lib/desktop'

describe('DesktopPermissionPrompt', () => {
  afterEach(() => {
    delete window.surveyDesktop
  })

  it('shows a capability prompt and returns an explicit decision', async () => {
    let permissionListener: ((request: AgentPermissionRequest) => void) | undefined
    const resolvePermission = vi.fn(async () => true)
    const bridge = {
      onPermissionRequested: vi.fn((listener: (request: AgentPermissionRequest) => void) => {
        permissionListener = listener
        return vi.fn()
      }),
      resolvePermission,
    } as unknown as SurveyDesktopBridge
    window.surveyDesktop = bridge
    render(<DesktopPermissionPrompt />)

    act(() => permissionListener?.({
      id: 'permission-1',
      tool: {
        id: 'backend.check_health',
        title: '检查检索服务',
        description: '访问健康检查端点。',
        source: 'builtin',
        capabilities: ['read', 'network'],
      },
      reason: '访问网络服务',
      createdAt: 1,
    }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('访问网络')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '仅本次允许' }))
    await waitFor(() => expect(resolvePermission).toHaveBeenCalledWith('permission-1', 'allow_once'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
