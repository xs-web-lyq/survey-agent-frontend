import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  FileBox,
  FileJson,
  FileText,
  Layers3,
  LoaderCircle,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { billetModelerManifest, initialBilletParameters } from '../features/automations/billetModelerManifest'
import type { AutomationFieldDefinition, AutomationRunSnapshot } from '../features/automations/types'

const GROUP_LABELS = {
  geometry: ['几何参数', '定义方坯断面与计算域'],
  process: ['工艺参数', '描述钢种及连铸过程条件'],
  advanced: ['高级设置', '控制网格、对称与输出策略'],
} as const

const EMPTY_RUN: AutomationRunSnapshot = {
  id: '',
  status: 'idle',
  stageIndex: -1,
  message: '等待参数预检查',
}

export function BilletModelerPage() {
  const [parameters, setParameters] = useState(initialBilletParameters)
  const [activeInspector, setActiveInspector] = useState<'preview' | 'checks' | 'artifacts'>('preview')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [run, setRun] = useState<AutomationRunSnapshot>(EMPTY_RUN)
  const timers = useRef<number[]>([])

  const fieldsByGroup = useMemo(() => ({
    geometry: billetModelerManifest.fields.filter((field) => field.group === 'geometry'),
    process: billetModelerManifest.fields.filter((field) => field.group === 'process'),
    advanced: billetModelerManifest.fields.filter((field) => field.group === 'advanced'),
  }), [])

  const validationIssues = useMemo(() => billetModelerManifest.fields.flatMap((field) => {
    const value = parameters[field.id]
    if (field.required && (value === '' || value === undefined)) return [`${field.label}为必填项`]
    if (field.type === 'number' && value !== '') {
      const numberValue = Number(value)
      if (!Number.isFinite(numberValue)) return [`${field.label}需要填写数值`]
      if (field.min !== undefined && numberValue < field.min) return [`${field.label}不能小于 ${field.min}${field.unit ?? ''}`]
      if (field.max !== undefined && numberValue > field.max) return [`${field.label}不能大于 ${field.max}${field.unit ?? ''}`]
    }
    return []
  }), [parameters])

  const updateParameter = (id: string, value: string | boolean) => {
    setParameters((current) => ({ ...current, [id]: value }))
    if (run.status !== 'idle') setRun(EMPTY_RUN)
  }

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }

  useEffect(() => clearTimers, [])

  const preflight = () => {
    clearTimers()
    setActiveInspector('checks')
    setRun({ id: '', status: 'validating', stageIndex: 0, message: '正在校验字段与输入范围…' })
    timers.current.push(window.setTimeout(() => {
      setRun({
        id: '',
        status: validationIssues.length ? 'failed' : 'idle',
        stageIndex: validationIssues.length ? 0 : -1,
        message: validationIssues.length ? `发现 ${validationIssues.length} 个参数问题` : '预检查通过，可以生成模型',
      })
    }, 450))
  }

  const startSimulation = () => {
    clearTimers()
    setActiveInspector('checks')
    if (validationIssues.length) {
      setRun({ id: '', status: 'failed', stageIndex: 0, message: `发现 ${validationIssues.length} 个参数问题` })
      return
    }
    const runId = `run-${Date.now().toString(36)}`
    const startedAt = new Date().toISOString()
    setRun({ id: runId, status: 'running', stageIndex: 0, startedAt, message: billetModelerManifest.stages[0].description })
    billetModelerManifest.stages.slice(1).forEach((stage, offset) => {
      timers.current.push(window.setTimeout(() => {
        setRun({ id: runId, status: 'running', stageIndex: offset + 1, startedAt, message: stage.description })
      }, (offset + 1) * 720))
    })
    timers.current.push(window.setTimeout(() => {
      setRun({ id: runId, status: 'completed', stageIndex: billetModelerManifest.stages.length - 1, startedAt, finishedAt: new Date().toISOString(), message: '模拟运行完成，已生成示例产物' })
      setActiveInspector('artifacts')
    }, billetModelerManifest.stages.length * 720))
  }

  const reset = () => {
    clearTimers()
    setParameters(initialBilletParameters)
    setRun(EMPTY_RUN)
    setActiveInspector('preview')
  }

  const width = Number(parameters.width_mm) || 160
  const thickness = Number(parameters.thickness_mm) || 160
  const ratio = Math.max(0.65, Math.min(1.55, width / thickness))

  return (
    <div className="modeler-shell flex h-full min-h-0 flex-col bg-surface-0">
      <header className="flex min-h-16 shrink-0 items-center gap-4 border-b border-line bg-surface-1/88 px-5 backdrop-blur-xl">
        <Link to="/automations" className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 transition hover:bg-surface-2 hover:text-ink-1" aria-label="返回自动化工具库">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <span className="automation-tool-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"><Box size={18} /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-ink-1">{billetModelerManifest.name}</h1>
              <span className="rounded-full border border-amber/20 bg-amber/10 px-2 py-0.5 text-[0.58rem] text-amber">页面原型</span>
            </div>
            <p className="mt-0.5 text-[0.65rem] text-ink-3">{billetModelerManifest.id} · v{billetModelerManifest.version}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={reset} className="modeler-button-secondary"><RotateCcw size={14} />重置</button>
          <button type="button" className="modeler-button-secondary" title="参数预设将在真实存储接入后启用"><Save size={14} />保存预设</button>
          <button type="button" onClick={preflight} disabled={run.status === 'running' || run.status === 'validating'} className="modeler-button-secondary"><ShieldCheck size={14} />参数预检查</button>
          <button type="button" onClick={startSimulation} disabled={run.status === 'running' || run.status === 'validating'} className="modeler-button-primary">
            {run.status === 'running' ? <LoaderCircle size={14} className="animate-spin" /> : <Play size={14} />}
            {run.status === 'running' ? '模拟生成中' : '生成模型'}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[210px_minmax(440px,1fr)_minmax(300px,390px)] max-[1180px]:grid-cols-[190px_minmax(420px,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-r border-line bg-surface-1/68 p-3">
          <p className="px-2 pb-2 pt-1 text-[0.62rem] font-semibold tracking-[0.12em] text-ink-3 uppercase">工作区</p>
          <button type="button" className="flex w-full items-center gap-2.5 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2.5 text-left text-xs font-medium text-accent">
            <Layers3 size={15} /> 参数配置
          </button>
          <button type="button" onClick={() => setActiveInspector('checks')} className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs text-ink-2 hover:bg-surface-2">
            <ShieldCheck size={15} /> 运行检查
          </button>
          <button type="button" onClick={() => setActiveInspector('artifacts')} className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs text-ink-2 hover:bg-surface-2">
            <FileBox size={15} /> 产物记录
          </button>

          <div className="mt-7 border-t border-line pt-5">
            <p className="px-2 text-[0.62rem] font-semibold tracking-[0.12em] text-ink-3 uppercase">参数预设</p>
            {['160 × 160 基准方坯', '180 × 220 矩形坯', '新建空白预设'].map((preset, index) => (
              <button key={preset} type="button" className="mt-1.5 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[0.68rem] text-ink-2 hover:bg-surface-2">
                <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? 'bg-accent' : 'bg-ink-3/50'}`} /> {preset}
              </button>
            ))}
          </div>

          <div className="mt-7 rounded-xl border border-dashed border-line bg-surface-2/50 p-3">
            <p className="text-[0.65rem] font-medium text-ink-1">脚本适配状态</p>
            <p className="mt-1.5 text-[0.62rem] leading-5 text-ink-3">当前仅运行前端模拟流程。待确认脚本入口、参数映射与软件权限。</p>
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto px-5 py-5 lg:px-7">
          <div className="mx-auto max-w-3xl">
            <div className="mb-5">
              <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-accent uppercase">Input schema</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.025em] text-ink-1">配置本次建模参数</h2>
              <p className="mt-2 text-xs leading-6 text-ink-3">参数值会随运行记录保存。橙色虚线字段是等待脚本接口确认的占位项。</p>
            </div>

            <ParameterGroup group="geometry" fields={fieldsByGroup.geometry} values={parameters} onChange={updateParameter} />
            <ParameterGroup group="process" fields={fieldsByGroup.process} values={parameters} onChange={updateParameter} />
            <section className="modeler-section mt-4 overflow-hidden rounded-2xl border border-line bg-surface-1/82">
              <button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-ink-1">{GROUP_LABELS.advanced[0]}</h3>
                  <p className="mt-1 text-[0.68rem] text-ink-3">{GROUP_LABELS.advanced[1]}</p>
                </div>
                <ChevronDown size={16} className={`text-ink-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              </button>
              {advancedOpen && <div className="border-t border-line px-5 py-5"><FieldGrid fields={fieldsByGroup.advanced} values={parameters} onChange={updateParameter} /></div>}
            </section>
          </div>
        </main>

        <aside className="min-h-0 overflow-hidden border-l border-line bg-surface-1/74 max-[1180px]:hidden">
          <div className="flex border-b border-line px-3 pt-3">
            {(['preview', 'checks', 'artifacts'] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveInspector(tab)} className={`border-b-2 px-3 py-2.5 text-[0.68rem] font-medium transition ${activeInspector === tab ? 'border-accent text-accent' : 'border-transparent text-ink-3 hover:text-ink-1'}`}>
                {tab === 'preview' ? '模型预览' : tab === 'checks' ? '运行检查' : '产物'}
              </button>
            ))}
          </div>
          <div className="h-[calc(100%-3.2rem)] overflow-y-auto p-4">
            {activeInspector === 'preview' && <BilletPreview width={width} thickness={thickness} ratio={ratio} />}
            {activeInspector === 'checks' && <RunChecks run={run} issues={validationIssues} />}
            {activeInspector === 'artifacts' && <ArtifactList completed={run.status === 'completed'} />}
          </div>
        </aside>
      </div>

      <RunTimeline run={run} />
    </div>
  )
}

function ParameterGroup({ group, fields, values, onChange }: { group: 'geometry' | 'process'; fields: AutomationFieldDefinition[]; values: Record<string, string | number | boolean>; onChange: (id: string, value: string | boolean) => void }) {
  return (
    <section className="modeler-section mt-4 rounded-2xl border border-line bg-surface-1/82 px-5 py-5 first:mt-0">
      <h3 className="text-sm font-semibold text-ink-1">{GROUP_LABELS[group][0]}</h3>
      <p className="mt-1 text-[0.68rem] text-ink-3">{GROUP_LABELS[group][1]}</p>
      <div className="mt-5"><FieldGrid fields={fields} values={values} onChange={onChange} /></div>
    </section>
  )
}

function FieldGrid({ fields, values, onChange }: { fields: AutomationFieldDefinition[]; values: Record<string, string | number | boolean>; onChange: (id: string, value: string | boolean) => void }) {
  return (
    <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
      {fields.map((field) => <ParameterField key={field.id} field={field} value={values[field.id]} onChange={onChange} />)}
    </div>
  )
}

function ParameterField({ field, value, onChange }: { field: AutomationFieldDefinition; value: string | number | boolean; onChange: (id: string, value: string | boolean) => void }) {
  return (
    <label className={`block rounded-xl ${field.provisional ? 'modeler-placeholder-field p-3' : ''}`}>
      <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-ink-2">
        {field.label}{field.required && <span className="text-red">*</span>}
        {field.provisional && <span className="ml-auto text-[0.55rem] font-normal text-amber">占位</span>}
      </span>
      <div className="relative mt-1.5">
        {field.type === 'select' ? (
          <select aria-label={field.label} value={String(value)} onChange={(event) => onChange(field.id, event.target.value)} className="modeler-input appearance-none pr-9">
            {!field.defaultValue && <option value="">请选择</option>}
            {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : (
          <input aria-label={field.label} type={field.type === 'number' ? 'number' : 'text'} value={String(value)} min={field.min} max={field.max} placeholder={field.placeholder} onChange={(event) => onChange(field.id, event.target.value)} className="modeler-input" />
        )}
        {field.unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[0.62rem] text-ink-3">{field.unit}</span>}
        {field.type === 'select' && <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />}
      </div>
      {field.description && <span className="mt-1.5 block text-[0.59rem] leading-4 text-ink-3">{field.description}</span>}
    </label>
  )
}

function BilletPreview({ width, thickness, ratio }: { width: number; thickness: number; ratio: number }) {
  return (
    <div>
      <div className="modeler-preview relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-0">
        <div className="modeler-grid absolute inset-0" />
        <div className="billet-block relative" style={{ width: `${Math.min(72, 50 * ratio)}%`, height: `${Math.min(72, 50 / ratio)}%` }}>
          <div className="billet-face" />
          <div className="billet-top" />
          <div className="billet-side" />
        </div>
        <span className="absolute bottom-3 left-3 rounded-md bg-surface-1/85 px-2 py-1 font-mono text-[0.58rem] text-ink-3">概念预览 · 非真实 CAD</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <PreviewMetric label="断面宽度" value={`${width} mm`} />
        <PreviewMetric label="断面厚度" value={`${thickness} mm`} />
        <PreviewMetric label="断面面积" value={`${(width * thickness / 100).toFixed(1)} cm²`} />
        <PreviewMetric label="宽厚比" value={(width / thickness).toFixed(2)} />
      </div>
      <div className="mt-5 rounded-xl border border-line bg-surface-2/55 p-3 text-[0.64rem] leading-5 text-ink-3">
        <div className="mb-1.5 flex items-center gap-2 font-medium text-ink-2"><AlertCircle size={13} className="text-accent" />预览说明</div>
        当前预览只反映宽厚比。真实几何、网格与边界条件将在脚本适配器接入后返回。
      </div>
    </div>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-surface-2/60 px-3 py-2.5"><p className="text-[0.58rem] text-ink-3">{label}</p><p className="mt-1 font-mono text-xs text-ink-1">{value}</p></div>
}

function RunChecks({ run, issues }: { run: AutomationRunSnapshot; issues: string[] }) {
  return (
    <div>
      <div className={`rounded-xl border p-4 ${run.status === 'failed' ? 'border-red/25 bg-red/5' : run.status === 'completed' || (!issues.length && run.message.includes('通过')) ? 'border-green/25 bg-green/5' : 'border-line bg-surface-2/50'}`}>
        <div className="flex items-center gap-2 text-sm font-medium text-ink-1">
          {run.status === 'running' || run.status === 'validating' ? <LoaderCircle size={16} className="animate-spin text-accent" /> : run.status === 'failed' ? <AlertCircle size={16} className="text-red" /> : <ShieldCheck size={16} className="text-green" />}
          {run.message}
        </div>
        {run.id && <p className="mt-2 font-mono text-[0.58rem] text-ink-3">{run.id}</p>}
      </div>
      <div className="mt-4 space-y-2">
        {(issues.length ? issues : ['必填字段完整', '数值均在声明范围内', '工具清单协议可解析']).map((item) => (
          <div key={item} className="flex items-start gap-2 rounded-lg border border-line bg-surface-2/45 px-3 py-2.5 text-[0.66rem] leading-5 text-ink-2">
            {issues.length ? <AlertCircle size={13} className="mt-0.5 shrink-0 text-red" /> : <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-green" />}{item}
          </div>
        ))}
      </div>
    </div>
  )
}

function ArtifactList({ completed }: { completed: boolean }) {
  const icons = [FileBox, FileJson, Box, FileText]
  return (
    <div className="space-y-2">
      {billetModelerManifest.artifacts.map((artifact, index) => {
        const Icon = icons[index] ?? FileText
        return (
          <div key={artifact.id} className="rounded-xl border border-line bg-surface-2/55 p-3">
            <div className="flex items-center gap-2.5"><Icon size={15} className={completed ? 'text-accent' : 'text-ink-3'} /><span className="text-xs font-medium text-ink-1">{artifact.label}</span><span className="ml-auto rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.55rem] text-ink-3">{artifact.format}</span></div>
            <p className="mt-2 text-[0.61rem] leading-5 text-ink-3">{completed ? artifact.description : '运行完成后生成'}</p>
          </div>
        )
      })}
    </div>
  )
}

function RunTimeline({ run }: { run: AutomationRunSnapshot }) {
  return (
    <footer className="shrink-0 border-t border-line bg-surface-1/95 px-5 py-3">
      <div className="flex items-center gap-4">
        <div className="flex w-40 shrink-0 items-center gap-2">
          <Clock3 size={14} className="text-ink-3" />
          <div><p className="text-[0.6rem] text-ink-3">运行状态</p><p className="mt-0.5 text-[0.68rem] font-medium text-ink-1">{run.status === 'idle' ? '未运行' : run.status === 'validating' ? '预检查中' : run.status === 'running' ? '模拟运行中' : run.status === 'completed' ? '模拟完成' : '需要修正'}</p></div>
        </div>
        <div className="flex min-w-0 flex-1 items-start">
          {billetModelerManifest.stages.map((stage, index) => {
            const done = run.status === 'completed' || (run.status === 'running' && index < run.stageIndex)
            const active = (run.status === 'running' || run.status === 'validating') && index === run.stageIndex
            return (
              <div key={stage.id} className="relative flex min-w-0 flex-1 items-center">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${done ? 'border-green bg-green/15 text-green' : active ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-surface-2 text-ink-3'}`}>
                  {done ? <Check size={11} /> : active ? <LoaderCircle size={11} className="animate-spin" /> : <Circle size={7} />}
                </div>
                <span className={`ml-2 truncate text-[0.61rem] ${active ? 'font-medium text-accent' : done ? 'text-ink-2' : 'text-ink-3'}`}>{stage.label}</span>
                {index < billetModelerManifest.stages.length - 1 && <span className={`mx-3 h-px min-w-3 flex-1 ${done ? 'bg-green/45' : 'bg-line'}`} />}
              </div>
            )
          })}
        </div>
      </div>
    </footer>
  )
}
