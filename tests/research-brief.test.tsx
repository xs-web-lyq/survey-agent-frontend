import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ResearchBriefCard,
  type BrainstormConclusion,
} from '../src/pages/BrainstormPage'


const brief: BrainstormConclusion = {
  brief_id: 'brief-123',
  conv_id: 'conv-123',
  version: 2,
  status: 'draft',
  task_id: '',
  topic: '连铸电磁搅拌对凝固组织与偏析的影响',
  section_hints: ['作用机理', '工艺参数'],
  doc_keywords: ['EMS', '偏析'],
  summary: '聚焦作用机制、工艺窗口与质量响应。',
  research_questions: ['搅拌强度如何影响流场？', '流场如何影响偏析？'],
  inclusion_criteria: ['纳入连铸过程研究'],
  exclusion_criteria: ['排除非连铸凝固'],
  evidence_gaps: ['工业尺度对照不足'],
  readiness_score: 82,
  readiness_reason: '问题与边界清晰',
  evidence_documents: 18,
  search_rounds: 3,
  doc_scope: ['a.pdf', 'b.pdf'],
}


describe('ResearchBriefCard', () => {
  it('edits and saves the structured brief before confirmation', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    render(
      <ResearchBriefCard
        brief={brief}
        starting={false}
        saving={false}
        onAdjust={vi.fn()}
        onSave={onSave}
        onConfirm={onConfirm}
        onStart={vi.fn()}
      />,
    )

    expect(screen.getByText('v2 · 待确认')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '编辑研究简报' }))
    fireEvent.change(screen.getByLabelText('综述主题'), {
      target: { value: '编辑后的连铸电磁搅拌综述主题' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存简报' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0].topic).toBe('编辑后的连铸电磁搅拌综述主题')

    fireEvent.click(screen.getByRole('button', { name: '确认研究简报' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })

  it('only offers survey handoff after the brief is confirmed', () => {
    render(
      <ResearchBriefCard
        brief={{ ...brief, status: 'confirmed' }}
        starting={false}
        saving={false}
        onAdjust={vi.fn()}
        onSave={vi.fn()}
        onConfirm={vi.fn()}
        onStart={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: '确认研究简报' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成大纲并开始综述' })).toBeInTheDocument()
  })
})
