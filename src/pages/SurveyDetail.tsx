/** 综述工作台:双栏(左轨迹 / 右产物,分隔线可拖拽)+ 人在环输入条 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSurveyEvents } from '../lib/useSurveyEvents'
import { DragHandle, useDragWidth } from '../lib/useDragWidth'
import { AgentTimeline } from '../components/AgentTimeline'
import { ArtifactPanel } from '../components/ArtifactPanel'
import { ApprovalBar } from '../components/ApprovalBar'

export function SurveyDetail() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const run = useSurveyEvents(taskId)
  const [topic, setTopic] = useState('')
  const [scopeCount, setScopeCount] = useState(0)
  // 左栏(轨迹)宽度可拖拽,280 ~ 900px
  const { width: leftW, handleProps } = useDragWidth(
    'survey-left-width', 480, 280, 900,
  )

  useEffect(() => {
    if (!taskId) return
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((tasks: { task_id: string; topic: string; doc_scope?: string[] }[]) => {
        const t = tasks.find((x) => x.task_id === taskId)
        if (t) {
          setTopic(t.topic)
          setScopeCount(t.doc_scope?.length ?? 0)
        }
      })
      .catch(() => {})
  }, [taskId])

  if (!taskId) return null

  return (
    <div className="flex h-full flex-col">
      {/* 顶栏 */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2.5">
        <button
          type="button"
          onClick={() => navigate('/surveys')}
          className="rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="truncate text-sm font-medium text-ink-1">
          {topic || taskId}
        </h1>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
            scopeCount ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-ink-3'
          }`}
          title={scopeCount ? '检索与引用限定在所选文献内' : '检索全部文献'}
        >
          {scopeCount ? `范围 ${scopeCount} 篇` : '全库'}
        </span>
        <span className="ml-auto font-mono text-[0.65rem] text-ink-3">{taskId}</span>
      </header>

      {/* 双栏(拖拽分隔) */}
      <div className="flex min-h-0 flex-1">
        <div
          className="flex shrink-0 flex-col border-r border-line"
          style={{ width: leftW }}
        >
          <div className="min-h-0 flex-1">
            <AgentTimeline run={run} />
          </div>
          <ApprovalBar taskId={taskId} run={run} />
        </div>
        <DragHandle {...handleProps} />
        <div className="min-w-0 flex-1">
          <ArtifactPanel taskId={taskId} run={run} />
        </div>
      </div>
    </div>
  )
}
