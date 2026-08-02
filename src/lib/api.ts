/** REST API 封装 */

import type { ConversationSummary, MemoryDebug, Meta, RunEventPage } from './types'

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  return r.json()
}

export const api = {
  meta: () => getJSON<Meta>('/api/meta'),
  conversations: () => getJSON<ConversationSummary[]>('/api/conversations'),
  deletedConversations: () =>
    getJSON<ConversationSummary[]>('/api/trash/conversations'),
  conversation: (id: string) =>
    getJSON<Record<string, unknown>>(`/api/conversations/${id}`),
  renameConversation: async (id: string, title: string) => {
    const r = await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (!r.ok) throw new Error(`rename conversation: ${r.status}`)
    return r.json() as Promise<{ id: string; title: string }>
  },
  deleteConversation: async (id: string) => {
    const r = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (!r.ok) throw new Error(`delete conversation: ${r.status}`)
    return r.json() as Promise<{ id: string; deleted: boolean; moved_to_trash: boolean }>
  },
  restoreConversation: async (id: string) => {
    const r = await fetch(`/api/trash/conversations/${id}/restore`, { method: 'POST' })
    if (!r.ok) throw new Error(`restore conversation: ${r.status}`)
    return r.json() as Promise<{ id: string; restored: boolean }>
  },
  purgeConversation: async (id: string, deleteDurableMemories = false) => {
    const query = deleteDurableMemories ? '?delete_durable_memories=true' : ''
    const r = await fetch(`/api/trash/conversations/${id}${query}`, { method: 'DELETE' })
    if (!r.ok) throw new Error(`purge conversation: ${r.status}`)
    return r.json() as Promise<{
      id: string
      purged: boolean
      durable_memories_deleted: boolean
    }>
  },
  exportConversation: async (id: string) => {
    const r = await fetch(`/api/conversations/${id}/export.md`)
    if (!r.ok) throw new Error(`export conversation: ${r.status}`)
    const blob = await r.blob()
    const disposition = r.headers.get('Content-Disposition') ?? ''
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    const plain = disposition.match(/filename="([^"]+)"/i)?.[1]
    const filename = encoded ? decodeURIComponent(encoded) : (plain ?? `${id}.md`)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  },
  conversationMemory: (id: string) =>
    getJSON<MemoryDebug>(`/api/conversations/${id}/memory`),
  runEvents: (id: string, afterSeq = 0) =>
    getJSON<RunEventPage>(`/api/runs/${id}/events?after_seq=${afterSeq}`),
  forkConversation: async (id: string, through_message_id?: string) => {
    const r = await fetch(`/api/conversations/${id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ through_message_id: through_message_id ?? null }),
    })
    if (!r.ok) throw new Error(`fork conversation: ${r.status}`)
    return r.json() as Promise<{ id: string }>
  },
  updateConversationMemory: async (
    id: string,
    body: { use_memories: boolean; generate_memories: boolean },
  ) => {
    const r = await fetch(`/api/conversations/${id}/memory`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`memory settings: ${r.status}`)
    return r.json() as Promise<MemoryDebug['settings']>
  },
  forgetMemory: async (id: string) => {
    const r = await fetch(`/api/memories/${id}`, { method: 'DELETE' })
    if (!r.ok) throw new Error(`forget memory: ${r.status}`)
    return r.json()
  },
  submitFeedback: async (body: {
    message_id: string
    rating: number
    score?: number | null
    tags?: string[]
    comment?: string
    better_answer?: string
  }) => {
    const r = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`feedback: ${r.status}`)
    return r.json()
  },
  feedbackList: (params?: { route?: string; min_score?: number }) => {
    const q = new URLSearchParams()
    if (params?.route) q.set('route', params.route)
    if (params?.min_score != null) q.set('min_score', String(params.min_score))
    return getJSON<Record<string, unknown>[]>(`/api/feedback?${q}`)
  },
  feedbackStats: () =>
    getJSON<{ by_route: Record<string, unknown>[] }>('/api/feedback/stats'),
}
