import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EvidenceMatrix } from '../src/components/EvidenceMatrix'


afterEach(() => {
  vi.unstubAllGlobals()
})


describe('EvidenceMatrix', () => {
  it('explains why the automatic evidence loop stopped', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schema_version: 1,
        task_id: 'survey-test',
        updated_at: 1,
        summary: {
          sections_total: 1,
          sections_sufficient: 0,
          questions_total: 1,
          questions_covered: 0,
          source_count: 1,
        },
        sections: [{
          section_id: '01',
          title: '工业验证',
          status: 'partial',
          round: 3,
          max_rounds: 4,
          stop_reason: 'plateau',
          coverage: {
            sufficient: false,
            covered_questions: 0,
            total_questions: 1,
            source_count: 1,
            required_sources: 2,
            gap: '未覆盖：工业效果（证据块差 1、独立来源差 1）',
          },
          questions: [{
            id: 'Q1',
            question: '工业效果是否经过独立来源验证？',
            covered: false,
            status: 'missing_sources',
            chunks: 1,
            sources: 1,
            missing_chunks: 1,
            missing_sources: 1,
            evidence: [],
          }],
        }],
      }),
    }))

    render(
      <EvidenceMatrix taskId="survey-test" revision={0} runStatus="done" />,
    )

    expect(await screen.findByText(
      '平台停止：连续两轮未发现新的有效证据',
    )).toBeInTheDocument()
    expect(screen.getByText(/尚缺 1 个证据块、 1 个独立来源/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '补证' })).toBeEnabled()
  })
})
