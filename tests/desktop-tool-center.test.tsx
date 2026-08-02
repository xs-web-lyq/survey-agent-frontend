import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DesktopToolCenter } from '../src/components/DesktopToolCenter'
import type { SurveyDesktopBridge } from '../src/lib/desktop'

describe('DesktopToolCenter', () => {
  afterEach(() => {
    delete window.surveyDesktop
  })

  it('lists MCP servers and discovered tools from the desktop bridge', async () => {
    window.surveyDesktop = {
      listMcpServers: vi.fn(async () => [{
        id: 'echo-test',
        name: 'Echo Test',
        transport: 'stdio',
        command: 'C:\\node.exe',
        args: ['echo.cjs'],
        enabled: true,
        inheritEnv: [],
        runtime: { id: 'echo-test', status: 'online', toolCount: 1 },
      }]),
      listAgentTools: vi.fn(async () => [{
        id: 'mcp.echo-test.echo',
        title: 'echo',
        description: 'Echo a message',
        source: 'mcp',
        capabilities: ['execute'],
      }]),
      onMcpStateChanged: vi.fn(() => vi.fn()),
    } as unknown as SurveyDesktopBridge

    render(<DesktopToolCenter open onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Echo Test')).toBeInTheDocument())
    expect(screen.getByText('在线 · 1 工具')).toBeInTheDocument()
    expect(screen.getByText('echo')).toBeInTheDocument()
  })

  it('submits a disabled-by-default server configuration', async () => {
    const saveMcpServer = vi.fn(async () => ({ ok: true }))
    window.surveyDesktop = {
      listMcpServers: vi.fn(async () => []),
      listAgentTools: vi.fn(async () => []),
      onMcpStateChanged: vi.fn(() => vi.fn()),
      saveMcpServer,
    } as unknown as SurveyDesktopBridge

    render(<DesktopToolCenter open onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '添加服务' }))
    await userEvent.type(screen.getByPlaceholderText('服务名称'), 'Local Echo')
    await userEvent.type(screen.getByPlaceholderText(/可执行文件绝对路径/), 'C:\\node.exe')
    await userEvent.click(screen.getByRole('button', { name: '保存配置' }))
    await waitFor(() => expect(saveMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Local Echo',
      command: 'C:\\node.exe',
      enabled: false,
    })))
  })
})
