import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { billetModelerManifest } from '../src/features/automations/billetModelerManifest'
import { AutomationHub } from '../src/pages/AutomationHub'
import { BilletModelerPage } from '../src/pages/BilletModelerPage'

describe('automation workbench', () => {
  it('exposes the billet modeler as a domain tool instead of an MCP setting', () => {
    render(<MemoryRouter><AutomationHub /></MemoryRouter>)

    const link = screen.getByRole('link', { name: /方坯连铸自动建模/ })
    expect(link).toHaveAttribute('href', '/automations/billet-modeler')
    expect(screen.getByText('尚未接入真实脚本')).toBeInTheDocument()
  })

  it('renders manifest fields and clearly marks provisional parameters', async () => {
    render(<MemoryRouter><BilletModelerPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: '配置本次建模参数' })).toBeInTheDocument()
    expect(screen.getByLabelText('断面宽度')).toHaveValue(160)
    expect(screen.getAllByText('占位')).toHaveLength(2)
    expect(billetModelerManifest.fields.filter((field) => field.provisional)).toHaveLength(3)

    await userEvent.click(screen.getByRole('button', { name: /高级设置/ }))
    expect(screen.getByLabelText('待确认参数 03')).toBeInTheDocument()
  })

  it('keeps the geometry preview synchronized with edited dimensions', async () => {
    render(<MemoryRouter><BilletModelerPage /></MemoryRouter>)

    const width = screen.getByLabelText('断面宽度')
    await userEvent.clear(width)
    await userEvent.type(width, '200')

    expect(screen.getByText('200 mm')).toBeInTheDocument()
    expect(screen.getByText('320.0 cm²')).toBeInTheDocument()
  })
})
