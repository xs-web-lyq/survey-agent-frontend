/** 结构化大纲编辑器:大纲确认等待期,直接编辑章节(标题/要点/检索词)、
 *  拖拽排序(HTML5 原生 + ↑↓ 按钮兜底)、增删章节,提交 update_outline。 */

import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown, ArrowUp, Check, GripVertical, Loader2, Plus, X,
} from 'lucide-react'

export interface OutlineSection {
  id?: string
  title: string
  points: string[]
  queries: string[]
}

export interface Outline {
  title: string
  sections: OutlineSection[]
}

/** 把 needInput.payload 规范化为可编辑草稿 */
function toDraft(payload: unknown): Outline {
  const p = (payload ?? {}) as Record<string, unknown>
  const sections = Array.isArray(p.sections) ? p.sections : []
  return {
    title: String(p.title ?? ''),
    sections: sections.map((s) => {
      const o = (s ?? {}) as Record<string, unknown>
      return {
        id: o.id ? String(o.id) : undefined,
        title: String(o.title ?? ''),
        points: Array.isArray(o.points) ? o.points.map(String) : [],
        queries: Array.isArray(o.queries) ? o.queries.map(String) : [],
      }
    }),
  }
}

export function OutlineEditor({
  taskId,
  payload,
}: {
  taskId: string
  payload: unknown
}) {
  const [draft, setDraft] = useState<Outline>(() => toDraft(payload))
  const [submitting, setSubmitting] = useState(false)
  const dragFrom = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // revise 后收到新大纲(payload 变化)→ 重置草稿
  useEffect(() => {
    setDraft(toDraft(payload))
  }, [payload])

  const patchSection = (i: number, patch: Partial<OutlineSection>) => {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }))
  }

  const move = (from: number, to: number) => {
    setDraft((d) => {
      if (to < 0 || to >= d.sections.length) return d
      const arr = [...d.sections]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return { ...d, sections: arr }
    })
  }

  const remove = (i: number) => {
    setDraft((d) => ({ ...d, sections: d.sections.filter((_, j) => j !== i) }))
  }

  const add = () => {
    setDraft((d) => ({
      ...d,
      sections: [...d.sections, { title: '', points: [], queries: [] }],
    }))
  }

  const invalid = draft.sections.length === 0 ||
    draft.sections.some((s) => !s.title.trim())

  const submit = async () => {
    if (invalid || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/tasks/${taskId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'update_outline', payload: draft }),
      })
      // 提交后后端进入写作,task_status running 会清 needInput,编辑器自动卸载
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-2 text-xs text-ink-2">
        直接编辑大纲:改标题/要点、拖拽调序、增删章节,然后应用;或在左下输入修改意见让 AI 重写。
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {/* 综述标题 */}
        <div>
          <label className="mb-1 block text-[0.68rem] text-ink-3">综述标题</label>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="w-full rounded-lg border border-line bg-surface-0 px-3 py-1.5 text-sm text-ink-1 focus:border-accent/50 focus:outline-none"
          />
        </div>

        {/* 章节卡片 */}
        {draft.sections.map((sec, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => { dragFrom.current = i }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(i) }}
            onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
            onDrop={(e) => {
              e.preventDefault()
              if (dragFrom.current !== null && dragFrom.current !== i) {
                move(dragFrom.current, i)
              }
              dragFrom.current = null
              setDragOver(null)
            }}
            onDragEnd={() => { dragFrom.current = null; setDragOver(null) }}
            className={`rounded-xl border bg-surface-1 p-3 transition-colors ${
              dragOver === i ? 'border-accent/60' : 'border-line'
            }`}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className="cursor-grab text-ink-3 active:cursor-grabbing" title="拖拽调序">
                <GripVertical size={14} />
              </span>
              <span className="w-6 text-center font-mono text-[0.68rem] text-ink-3">
                {String(i + 1).padStart(2, '0')}
              </span>
              <input
                value={sec.title}
                onChange={(e) => patchSection(i, { title: e.target.value })}
                placeholder="章节标题(必填)"
                className={`min-w-0 flex-1 rounded-md border bg-surface-0 px-2 py-1 text-sm text-ink-1 focus:outline-none ${
                  sec.title.trim() ? 'border-line focus:border-accent/50' : 'border-red/60'
                }`}
              />
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0}
                className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink-1 disabled:opacity-30">
                <ArrowUp size={13} />
              </button>
              <button type="button" onClick={() => move(i, i + 1)}
                disabled={i === draft.sections.length - 1}
                className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink-1 disabled:opacity-30">
                <ArrowDown size={13} />
              </button>
              <button type="button" onClick={() => remove(i)} title="删除本节"
                className="rounded p-1 text-ink-3 hover:bg-red/10 hover:text-red">
                <X size={13} />
              </button>
            </div>
            <div className="grid gap-2 pl-7">
              <div>
                <label className="mb-0.5 block text-[0.65rem] text-ink-3">要点(一行一条)</label>
                <textarea
                  value={sec.points.join('\n')}
                  onChange={(e) =>
                    patchSection(i, { points: e.target.value.split('\n') })}
                  rows={Math.max(2, sec.points.length)}
                  className="w-full resize-y rounded-md border border-line bg-surface-0 px-2 py-1 text-xs leading-relaxed text-ink-2 focus:border-accent/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[0.65rem] text-ink-3">检索关键词(逗号分隔)</label>
                <input
                  value={sec.queries.join(', ')}
                  onChange={(e) =>
                    patchSection(i, {
                      queries: e.target.value.split(/[,,]/).map((q) => q.trim()),
                    })}
                  className="w-full rounded-md border border-line bg-surface-0 px-2 py-1 text-xs text-ink-2 focus:border-accent/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-xs text-ink-3 transition-colors hover:border-accent/40 hover:text-accent"
        >
          <Plus size={13} />
          添加章节
        </button>
      </div>

      {/* 底部操作 */}
      <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
        <span className="text-[0.68rem] text-ink-3">
          {draft.sections.length} 节
          {invalid && <span className="ml-2 text-red">有章节缺标题</span>}
        </span>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={invalid || submitting}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent/15 px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-40"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          应用此大纲并开始撰写
        </button>
      </div>
    </div>
  )
}
