/** 综述工作台右栏:产物面板(文件树 + Markdown 实时渲染 + 下载) */

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Download, FileText, ListTree } from 'lucide-react'
import type { SurveyRunState } from '../lib/useSurveyEvents'
import { DragHandle, useDragWidth } from '../lib/useDragWidth'
import { EvidenceMatrix } from './EvidenceMatrix'
import { OutlineEditor } from './OutlineEditor'
import { SurveyQualityReport } from './SurveyQualityReport'

const FILE_ORDER = [
  'outline.md',
  'evidence_matrix.json',
  'survey.md',
  'quality_report.json',
  'references.md',
  'bibliography.json',
  'notes.md',
]

function citationMarkdown(markdown: string): string {
  const chunkNumbers = new Map<string, number>()
  let inCodeFence = false

  return markdown.split('\n').map((line) => {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence
      return line
    }
    if (inCodeFence) return line

    const reference = /^(\s*)\[(\d+)\](\s+)/.exec(line)
    if (reference) {
      return `${line.replace(
        /^(\s*)\[(\d+)\](\s+)/,
        '$1[$2](#citation-source-$2)$3',
      )}\n`
    }

    const withChunkLinks = line.replace(
      /\[\[(chunk-[A-Za-z0-9._:-]+)\]\]/g,
      (_match, chunkId: string) => {
        let number = chunkNumbers.get(chunkId)
        if (!number) {
          number = chunkNumbers.size + 1
          chunkNumbers.set(chunkId, number)
        }
        return `[${number}](#chunk-evidence-${number})`
      },
    )
    return withChunkLinks.replace(
      /(?<!!)\[(\d+)\](?!\()/g,
      '[$1](#citation-ref-$1)',
    )
  }).join('\n')
}

function fileLabel(p: string): string {
  if (p === 'outline.md') return '📋 大纲'
  if (p === 'evidence_matrix.json') return '🧭 证据矩阵'
  if (p === 'survey.md') return '📄 综述全文'
  if (p === 'quality_report.json') return '🛡️ 质量报告'
  if (p === 'references.md') return '📚 参考文献'
  if (p === 'bibliography.json') return '🧾 文献元数据'
  if (p === 'notes.md') return '📝 要点笔记'
  const m = /^sections\/(.+)\.md$/.exec(p)
  if (m) return `§ ${m[1]}`
  return p
}

export function ArtifactPanel({
  taskId,
  run,
}: {
  taskId: string
  run: SurveyRunState
}) {
  const [selected, setSelected] = useState('')
  const [content, setContent] = useState('')
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit')
  // 文件树列宽可拖拽,120 ~ 400px
  const { width: treeW, handleProps } = useDragWidth(
    'artifact-tree-width', 176, 120, 400,
  )

  // 大纲确认等待期 → 右栏切换为大纲编辑器
  const outlineEditing =
    run.status === 'waiting_input' && run.needInput?.kind === 'approve_outline'

  // 文件清单:已落盘 + 流式中的 target 合并
  const files = useMemo(() => {
    const set = new Set(run.files)
    Object.keys(run.streams).forEach((t) => t !== 'output' && set.add(t))
    return [...set].sort((a, b) => {
      const ia = FILE_ORDER.indexOf(a)
      const ib = FILE_ORDER.indexOf(b)
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      return a.localeCompare(b)
    })
  }, [run.files, run.streams])

  // 自动跟随:流式中的文件优先显示
  const streamingTarget = useMemo(() => {
    const targets = Object.keys(run.streams).filter((t) => t !== 'output')
    return targets[targets.length - 1] ?? ''
  }, [run.streams])

  useEffect(() => {
    if (run.status === 'running' && streamingTarget) setSelected(streamingTarget)
    else if (run.status === 'done' && files.includes('survey.md')) setSelected('survey.md')
    else if (!selected && files.length) setSelected(files[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamingTarget, run.status, files.length])

  // 内容:优先流式缓冲,否则拉文件
  const streamContent = selected ? (run.streams[selected] ?? '') : ''
  useEffect(() => {
    const persisted = run.files.includes(selected)
    if (
      !selected
      || selected === 'evidence_matrix.json'
      || selected === 'quality_report.json'
      || !persisted
      || (streamContent && run.status === 'running')
    ) return
    fetch(`/api/tasks/${taskId}/files/${selected}`)
      .then((r) => r.json())
      .then((d) => setContent(String(d.content ?? '')))
      .catch(() => setContent(''))
  }, [selected, taskId, streamContent, run.files, run.status])

  const shown = run.status === 'running' && streamContent
    ? streamContent
    : content || streamContent
  const rendered = useMemo(() => {
    if (selected.endsWith('.json')) return `\`\`\`json\n${shown}\n\`\`\``
    return citationMarkdown(shown)
  }, [selected, shown])
  const isStreaming = !!streamContent && run.status === 'running'

  const download = () => {
    const blob = new Blob([shown], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = selected.split('/').pop() ?? 'survey.md'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex h-full">
      {/* 文件树(宽度可拖拽) */}
      <div
        className="shrink-0 space-y-0.5 overflow-y-auto border-r border-line p-2"
        style={{ width: treeW }}
      >
        {files.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setSelected(f)}
            className={`w-full truncate rounded-md px-2 py-1.5 text-left text-[0.72rem] transition-colors ${
              f === selected
                ? 'bg-surface-3 text-ink-1'
                : 'text-ink-2 hover:bg-surface-2'
            }`}
          >
            {fileLabel(f)}
          </button>
        ))}
        {files.length === 0 && (
          <p className="px-2 py-4 text-center text-[0.7rem] text-ink-3">尚无产物</p>
        )}
      </div>
      <DragHandle {...handleProps} />

      {/* 预览 / 大纲编辑 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {outlineEditing && (
          <div className="flex items-center gap-1 border-b border-line bg-amber/5 px-4 py-2">
            <ListTree size={13} className="text-amber" />
            <span className="mr-2 text-xs font-medium text-amber">大纲待确认</span>
            {(['edit', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setEditorTab(tab)}
                className={`rounded-md px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${
                  editorTab === tab
                    ? 'bg-accent/15 text-accent'
                    : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                {tab === 'edit' ? '编辑' : '预览'}
              </button>
            ))}
          </div>
        )}

        {outlineEditing && editorTab === 'edit' ? (
          <OutlineEditor taskId={taskId} payload={run.needInput?.payload} />
        ) : selected === 'evidence_matrix.json' ? (
          <EvidenceMatrix
            taskId={taskId}
            revision={run.coverageRevision}
            runStatus={run.status}
          />
        ) : selected === 'quality_report.json' ? (
          <SurveyQualityReport
            taskId={taskId}
            revision={run.files.length}
          />
        ) : (
          <>
            {selected && (
              <div className="flex items-center gap-2 border-b border-line px-4 py-2">
                <FileText size={13} className="text-ink-3" />
                <span className="text-xs text-ink-2">{selected}</span>
                {isStreaming && <span className="text-[0.65rem] text-accent">写作中…</span>}
                <button
                  type="button"
                  onClick={download}
                  disabled={!shown}
                  className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[0.7rem] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1 disabled:opacity-40"
                >
                  <Download size={12} />
                  下载
                </button>
                {run.status === 'done' && (
                  <a
                    href={`/api/tasks/${taskId}/export.zip`}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[0.7rem] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1"
                    title="打包 survey.md(图片重写为相对路径)+ images/ + 参考文献"
                  >
                    <Download size={12} />
                    导出 ZIP
                  </a>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className={`md-body ${isStreaming ? 'typing-cursor' : ''}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    a: ({ href, children, ...props }) => {
                      if (href?.startsWith('#citation-ref-')) {
                        return (
                          <sup className="citation-sup">
                            <a href={href.replace('#citation-ref-', '#reference-')} title="跳转到参考文献">
                              {children}
                            </a>
                          </sup>
                        )
                      }
                      if (href?.startsWith('#chunk-evidence-')) {
                        return <sup className="citation-sup" title="知识库证据">{children}</sup>
                      }
                      if (href?.startsWith('#citation-source-')) {
                        return (
                          <span
                            id={href.replace('#citation-source-', 'reference-')}
                            className="reference-index"
                          >
                            {children}
                          </span>
                        )
                      }
                      return <a href={href} {...props}>{children}</a>
                    },
                  }}
                >
                  {rendered}
                </ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
