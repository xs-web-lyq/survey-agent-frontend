import type { RunEvent, TraceItem } from './types'

const TRACE_EVENT_TYPES = new Set<TraceItem['type']>([
  'thinking',
  'tool_call',
  'tool_result',
  'route_info',
  'deep_round',
  'memory_loaded',
  'query_rewritten',
  'memory_updated',
  'memory_compacted',
  'task_status',
])

function isTraceEventType(value: string): value is TraceItem['type'] {
  return TRACE_EVENT_TYPES.has(value as TraceItem['type'])
}

/** Build the user-facing timeline projection from the immutable run event log. */
export function traceFromRunEvents(events: RunEvent[]): TraceItem[] {
  return [...events]
    .sort((left, right) => left.seq - right.seq)
    .filter((event) => isTraceEventType(event.event_type))
    .map((event) => ({
      type: event.event_type as TraceItem['type'],
      data: event.payload,
      ts: event.created_at,
    }))
}
