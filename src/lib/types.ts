/** 与后端事件协议/API 对应的类型定义 */

export interface CitationImage {
  token: string
  caption: string
  doc: string
}

export interface Citation {
  n: number
  chunk_id: string
  source: string
  preview: string
  score?: number | null
  page_range?: { start?: number | null; end?: number | null; label?: string } | null
  section_title?: string
  images?: CitationImage[]
}

export interface TraceItem {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'route_info' | 'deep_round'
    | 'memory_loaded' | 'query_rewritten' | 'memory_updated' | 'memory_compacted'
  data: Record<string, unknown>
  ts: number
}

export interface FeedbackData {
  rating: number
  score?: number | null
  tags: string[]
  comment?: string
  better_answer?: string
}

export interface ChatMessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  route_requested?: string
  route_used?: string
  citations: Citation[]
  trace: TraceItem[]
  model?: string
  latency_ms?: number
  feedback?: FeedbackData | null
  status?: 'running' | 'completed' | 'failed'
  error?: { code?: string; message?: string; stage?: string } | null
  run_id?: string
  /** 流式中(尚未落库) */
  streaming?: boolean
}

export interface ConversationSummary {
  id: string
  title: string
  kb_name: string
  created_at: number
  message_count: number
  last_message_at: number | null
  deleted_at?: number | null
}

export interface Meta {
  kb_name: string
  llm_model: string
  routes: string[]
}

export interface DurableMemory {
  id: string
  kind: 'preference' | 'goal' | 'decision' | 'episode' | string
  content: string
  confidence: number
  status: string
  updated_at: number
  evidence: string[]
}

export interface MemoryDebug {
  settings: {
    use_memories: boolean
    generate_memories: boolean
  }
  state: {
    current_topic?: string
    user_goal?: string
    entities?: string[]
    constraints?: string[]
    open_questions?: string[]
    cited_sources?: string[]
  }
  summary: {
    version?: number
    token_count?: number
    summary?: Record<string, unknown>
  }
  memories: DurableMemory[]
}

export interface EvidenceMatrixItem {
  chunk_id: string
  source: string
  score?: number | null
  preview: string
}

export interface EvidenceQuestion {
  id: string
  question: string
  covered: boolean
  chunks: number
  sources: number
  evidence: EvidenceMatrixItem[]
}

export interface EvidenceSection {
  section_id: string
  title: string
  status: 'pending' | 'retrieving' | 'ready' | 'partial' | 'written' | string
  round: number
  max_rounds: number
  coverage: {
    sufficient: boolean
    covered_questions: number
    total_questions: number
    source_count: number
    required_sources: number
    gap?: string
  }
  questions: EvidenceQuestion[]
  updated_at?: number
}

export interface EvidenceMatrixData {
  schema_version: number
  task_id: string
  updated_at: number
  summary: {
    sections_total: number
    sections_sufficient: number
    questions_total: number
    questions_covered: number
    source_count: number
  }
  sections: EvidenceSection[]
}

export const ROUTE_LABELS: Record<string, { label: string; desc: string }> = {
  mix: { label: '图谱增强', desc: '实体+关系+向量的知识图谱检索,证据最全(较慢)' },
  progressive: { label: '章节渐进', desc: '文档结构感知的章节级检索,引用带页码' },
  hybrid: { label: '快速混合', desc: 'BM25 词法 + 向量语义融合,响应最快' },
}
