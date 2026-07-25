import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ConversationSidebar } from '../src/components/ConversationSidebar'


test('conversation action menu closes after outside click', () => {
  render(
    <ConversationSidebar
      conversations={[{
        id: 'conv-1',
        title: '测试会话',
        kb_name: 'kb',
        created_at: 1,
        message_count: 2,
        last_message_at: 1,
      }]}
      activeId="conv-1"
      kbName="kb"
      width={264}
      onNew={vi.fn()}
      onSelect={vi.fn()}
      onRename={vi.fn()}
      onDelete={vi.fn()}
      onExport={vi.fn()}
      onOpenTrash={vi.fn()}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /管理会话/ }))
  expect(screen.getByRole('menuitem', { name: /导出 Markdown/ })).toBeInTheDocument()
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole('menuitem', { name: /导出 Markdown/ })).not.toBeInTheDocument()
})
