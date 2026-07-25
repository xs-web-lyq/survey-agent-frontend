/** 问答 SSE 客户端:POST /api/chat 并逐事件回调。
 *
 * 后端是 sse-starlette(EventSource 协议),但 EventSource 原生只支持 GET,
 * 这里用 fetch + ReadableStream 手工解析 SSE 帧。
 */

export interface SSEHandlers {
  onMeta?: (d: { conv_id: string }) => void
  onRouteInfo?: (d: { requested: string; used: string; decision?: unknown }) => void
  onToolCall?: (d: Record<string, unknown>) => void
  onToolResult?: (d: Record<string, unknown>) => void
  onTextDelta?: (delta: string) => void
  onCitations?: (items: unknown[]) => void
  onDeepRound?: (d: Record<string, unknown>) => void
  onMemoryLoaded?: (d: Record<string, unknown>) => void
  onQueryRewritten?: (d: Record<string, unknown>) => void
  onMemoryUpdated?: (d: Record<string, unknown>) => void
  onMemoryCompacted?: (d: Record<string, unknown>) => void
  onThinking?: (d: {
    text: string
    stage?: string
    status?: 'running' | 'completed' | 'failed'
    detail?: string
    duration_ms?: number
  }) => void
  onStatus?: (d: { status: string; latency_ms?: number; error?: string }) => void
  onSaved?: (d: { message_id: string }) => void
  onError?: (err: Error) => void
}

export async function streamChat(
  body: { question: string; route: string; conv_id?: string | null; deep?: boolean },
  handlers: SSEHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return streamSSE('/api/chat', body, handlers, signal)
}

/** 通用 SSE POST:brainstorm 等复用同一事件协议 */
export async function streamSSE(
  url: string,
  body: Record<string, unknown>,
  handlers: SSEHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!resp.ok || !resp.body) {
    throw new Error(`sse failed: ${resp.status}`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const dispatch = (event: string, dataRaw: string) => {
    let payload: Record<string, unknown> = {}
    try {
      payload = JSON.parse(dataRaw)
    } catch {
      return
    }
    // 后端事件包一层 {type, data, seq...};meta/saved 是裸 JSON
    const data = (payload.data ?? payload) as Record<string, unknown>
    switch (event) {
      case 'meta':
        handlers.onMeta?.(data as { conv_id: string })
        break
      case 'route_info':
        handlers.onRouteInfo?.(data as { requested: string; used: string })
        break
      case 'tool_call':
        handlers.onToolCall?.(data)
        break
      case 'tool_result':
        handlers.onToolResult?.(data)
        break
      case 'text_delta':
        handlers.onTextDelta?.(String(data.delta ?? ''))
        break
      case 'citations':
        handlers.onCitations?.((data.items as unknown[]) ?? [])
        break
      case 'deep_round':
        handlers.onDeepRound?.(data)
        break
      case 'memory_loaded':
        handlers.onMemoryLoaded?.(data)
        break
      case 'query_rewritten':
        handlers.onQueryRewritten?.(data)
        break
      case 'memory_updated':
        handlers.onMemoryUpdated?.(data)
        break
      case 'memory_compacted':
        handlers.onMemoryCompacted?.(data)
        break
      case 'thinking':
        handlers.onThinking?.({
          text: String(data.text ?? ''),
          stage: data.stage ? String(data.stage) : undefined,
          status: data.status as 'running' | 'completed' | 'failed' | undefined,
          detail: data.detail ? String(data.detail) : undefined,
          duration_ms: Number(data.duration_ms ?? 0) || undefined,
        })
        break
      case 'task_status':
        handlers.onStatus?.(data as { status: string })
        break
      case 'saved':
        handlers.onSaved?.(data as { message_id: string })
        break
    }
  }

  let curEvent = 'message'
  let curData: string[] = []

  const flushFrame = () => {
    if (curData.length) dispatch(curEvent, curData.join('\n'))
    curEvent = 'message'
    curData = []
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line === '') {
        flushFrame()
      } else if (line.startsWith('event:')) {
        curEvent = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        curData.push(line.slice(5).trimStart())
      }
    }
  }
  flushFrame()
}
