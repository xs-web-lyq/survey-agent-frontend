import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { RecycleBinPanel } from '../src/components/RecycleBinPanel'


test('deleted conversation can be restored from recycle bin', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        id: 'conv-deleted',
        title: '已删除会话',
        kb_name: 'kb',
        created_at: 1,
        deleted_at: 2,
        message_count: 4,
        last_message_at: 1,
      }],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'conv-deleted', restored: true }),
    })
  vi.stubGlobal('fetch', fetchMock)
  const onChanged = vi.fn()

  render(<RecycleBinPanel open onClose={vi.fn()} onChanged={onChanged} />)
  expect(await screen.findByText('已删除会话')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '恢复' }))
  await waitFor(() => expect(onChanged).toHaveBeenCalled())
  expect(fetchMock).toHaveBeenLastCalledWith(
    '/api/trash/conversations/conv-deleted/restore',
    { method: 'POST' },
  )
  expect(screen.queryByText('已删除会话')).not.toBeInTheDocument()
  vi.unstubAllGlobals()
})
