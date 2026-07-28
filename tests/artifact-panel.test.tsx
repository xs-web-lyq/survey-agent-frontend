import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactPanel } from '../src/components/ArtifactPanel'
import type { SurveyRunState } from '../src/lib/useSurveyEvents'


afterEach(() => {
  vi.unstubAllGlobals()
})


describe('ArtifactPanel', () => {
  it('loads a persisted artifact when no streaming buffer exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: '# 已持久化综述' }),
    }))
    const run: SurveyRunState = {
      status: 'done',
      currentPhase: '',
      timeline: [],
      streams: {},
      files: ['survey.md'],
      needInput: null,
      stats: null,
      error: null,
      lastSeq: 1,
      coverageRevision: 0,
    }

    render(<ArtifactPanel taskId="survey-history" run={run} />)

    expect(await screen.findByRole('heading', {
      name: '已持久化综述',
    })).toBeInTheDocument()
  })
})
