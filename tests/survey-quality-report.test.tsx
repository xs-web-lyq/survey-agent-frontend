import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SurveyQualityReport } from '../src/components/SurveyQualityReport'


afterEach(() => {
  vi.unstubAllGlobals()
})


describe('SurveyQualityReport', () => {
  it('shows actionable evidence, citation, and bibliography gates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schema_version: 1,
        task_id: 'survey-test',
        generated_at: 1,
        overall_status: 'review_required',
        summary: {
          gates_passed: 0,
          gates_action_required: 3,
          brief_questions_total: 1,
          brief_questions_covered: 0,
          research_questions_total: 1,
          research_questions_covered: 0,
          citations_total: 2,
          citations_passed: 1,
          citations_failed: 1,
          references_total: 1,
          references_complete: 0,
        },
        gates: [
          {
            id: 'evidence_coverage',
            label: '研究问题证据覆盖',
            status: 'action_required',
            detail: '0/1 个研究问题满足证据块和独立来源门槛',
          },
          {
            id: 'citation_verification',
            label: '正文引用核查',
            status: 'action_required',
            detail: '1/2 个唯一引用通过原文核查，1 个需人工复核',
          },
          {
            id: 'bibliography_metadata',
            label: '参考文献元数据',
            status: 'action_required',
            detail: '0/1 条达到论文引用字段要求',
          },
        ],
        brief_questions: [],
        sections: [],
        citation_review: { failed_chunk_ids: ['chunk-failed'] },
        bibliography_review: {
          incomplete_references: [{
            source: 'paper.pdf',
            title: '连铸工业试验',
            missing_fields: ['authors', 'pages'],
          }],
        },
        recommendations: ['对未覆盖研究问题执行定向补证。'],
      }),
    }))

    render(<SurveyQualityReport taskId="survey-test" revision={1} />)

    expect(await screen.findByText('需要处理后再提交')).toBeInTheDocument()
    expect(screen.getByText('3 项待处理')).toBeInTheDocument()
    expect(screen.getByText('研究问题证据覆盖')).toBeInTheDocument()
    expect(screen.getByText('缺少：作者、页码')).toBeInTheDocument()
    expect(screen.getByText('对未覆盖研究问题执行定向补证。')).toBeInTheDocument()
  })
})
