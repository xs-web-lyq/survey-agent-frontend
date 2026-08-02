import { describe, expect, it } from 'vitest'
import { traceFromRunEvents } from '../src/lib/runEvents'
import type { RunEvent } from '../src/lib/types'

function event(seq: number, eventType: string): RunEvent {
  return {
    id: `event-${seq}`,
    run_id: 'run-1',
    seq,
    event_type: eventType,
    stage: 'retrieving',
    payload: { seq },
    created_at: seq,
  }
}

describe('traceFromRunEvents', () => {
  it('sorts semantic events and excludes lifecycle-only events', () => {
    const trace = traceFromRunEvents([
      event(3, 'tool_result'),
      event(1, 'run.started'),
      event(2, 'tool_call'),
      event(4, 'run.completed'),
    ])

    expect(trace.map((item) => item.type)).toEqual(['tool_call', 'tool_result'])
    expect(trace.map((item) => item.data.seq)).toEqual([2, 3])
  })
})
