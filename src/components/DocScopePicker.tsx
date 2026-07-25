/** 文献范围选择器:综述创建时圈定检索范围(空 = 全库) */

import { useEffect, useMemo, useState } from 'react'
import { BookMarked, ChevronDown, ChevronRight, Search } from 'lucide-react'

interface KbDoc {
  doc_id: string
  file_path: string
  summary: string
  chunks_count: number
}

function fileName(p: string): string {
  return (p || '').replace(/\\/g, '/').split('/').pop() ?? ''
}

export function DocScopePicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (names: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [docs, setDocs] = useState<KbDoc[]>([])
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    fetch('/api/documents')
      .then((r) => r.json())
      .then((d: KbDoc[]) => { setDocs(d); setLoaded(true) })
      .catch(() => {})
  }, [open, loaded])

  const names = useMemo(() => docs.map((d) => fileName(d.file_path)), [docs])
  const selectedSet = useMemo(() => new Set(selected), [selected])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return docs
    return docs.filter((d) =>
      fileName(d.file_path).toLowerCase().includes(q) ||
      (d.summary || '').toLowerCase().includes(q),
    )
  }, [docs, query])

  const toggle = (name: string) => {
    const next = new Set(selectedSet)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChange([...next])
  }

  const label = selected.length === 0
    ? `全库${docs.length ? ` ${docs.length} 篇` : ''}`
    : `已选 ${selected.length} 篇`

  return (
    <div className="rounded-lg border border-line bg-surface-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-ink-2 transition-colors hover:text-ink-1"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <BookMarked size={13} className="text-ink-3" />
        文献范围:<span className={selected.length ? 'font-medium text-accent' : ''}>{label}</span>
        <span className="ml-auto text-[0.65rem] text-ink-3">
          {selected.length === 0 ? '不限定,检索全部文献' : '引用将严格限定在所选文献内'}
        </span>
      </button>

      {open && (
        <div className="border-t border-line p-2.5">
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute top-1/2 left-2 -translate-y-1/2 text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="按文件名或摘要搜索…"
                className="w-full rounded-md border border-line bg-surface-1 py-1 pr-2 pl-6.5 text-xs text-ink-1 placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
              />
            </div>
            <button type="button" onClick={() => onChange(names)}
              className="rounded-md px-2 py-1 text-[0.68rem] text-ink-3 hover:bg-surface-2 hover:text-ink-1">
              全选
            </button>
            <button type="button" onClick={() => onChange([])}
              className="rounded-md px-2 py-1 text-[0.68rem] text-ink-3 hover:bg-surface-2 hover:text-ink-1">
              清空
            </button>
            <button
              type="button"
              onClick={() => onChange(names.filter((n) => !selectedSet.has(n)))}
              className="rounded-md px-2 py-1 text-[0.68rem] text-ink-3 hover:bg-surface-2 hover:text-ink-1"
            >
              反选
            </button>
          </div>

          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {filtered.map((d) => {
              const name = fileName(d.file_path)
              return (
                <label
                  key={d.doc_id}
                  className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 transition-colors hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(name)}
                    onChange={() => toggle(name)}
                    className="mt-0.5 accent-(--accent)"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-ink-1">{name}</span>
                    <span className="block truncate text-[0.65rem] text-ink-3">
                      {d.chunks_count} chunks{d.summary ? ` · ${d.summary.slice(0, 60)}` : ''}
                    </span>
                  </span>
                </label>
              )
            })}
            {loaded && filtered.length === 0 && (
              <p className="py-4 text-center text-xs text-ink-3">无匹配文献</p>
            )}
            {!loaded && (
              <p className="py-4 text-center text-xs text-ink-3">加载文献清单…</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
