import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ChatMessage } from '../src/components/ChatMessage'
import type { ChatMessageData } from '../src/lib/types'


test('failed answer keeps trace visible and exposes retry', () => {
  const onRetry = vi.fn()
  const message: ChatMessageData = {
    id: 'msg-failed',
    role: 'assistant',
    content: '',
    citations: [],
    status: 'failed',
    run_id: 'run-failed',
    error: {
      code: 'ProviderError',
      message: '本轮问答执行失败，请稍后重试。',
      stage: 'retrieving',
    },
    trace: [{
      type: 'thinking',
      data: {
        text: '本轮执行失败',
        stage: 'retrieving',
        status: 'failed',
      },
      ts: 1,
    }],
  }

  render(<ChatMessage msg={message} onRetry={onRetry} />)
  expect(screen.getByText('思考过程中断')).toBeInTheDocument()
  expect(screen.getByText(/失败阶段：retrieving/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '重试' }))
  expect(onRetry).toHaveBeenCalledWith('run-failed')
})
