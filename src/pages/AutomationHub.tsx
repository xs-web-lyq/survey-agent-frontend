import { ArrowRight, Box, Braces, Clock3, DatabaseZap, FlaskConical, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { billetModelerManifest } from '../features/automations/billetModelerManifest'

const UPCOMING_TOOLS = [
  { name: '结晶器参数分析', icon: FlaskConical, copy: '面向工艺窗口与参数敏感性的分析工作流。' },
  { name: '仿真数据批处理', icon: DatabaseZap, copy: '批量整理算例、结果文件和可追溯元数据。' },
]

export function AutomationHub() {
  return (
    <div className="automation-shell h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1380px] px-6 py-7 lg:px-10">
        <header className="automation-hero relative overflow-hidden rounded-[1.75rem] border border-line/80 px-7 py-8 lg:px-10 lg:py-10">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-accent uppercase">
              <Sparkles size={15} /> Domain automation
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-ink-1 lg:text-4xl">把领域脚本变成可审计的研究工作台</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-2">
              自动化页负责参数输入、预检查、执行过程和产物交付；MCP 工具中心继续负责连接与权限，两者职责分离。
            </p>
          </div>
          <div className="automation-hero-orb" />
        </header>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-ink-3">已配置工具</p>
              <h2 className="mt-1 text-xl font-semibold text-ink-1">连铸自动化</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface-1/80 px-3 py-1.5 text-[0.68rem] text-ink-3">
              <ShieldCheck size={13} className="text-green" /> 执行前需要权限确认
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
            <Link to="/automations/billet-modeler" className="automation-tool-card group block rounded-2xl border border-line bg-surface-1/88 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="automation-tool-icon flex h-12 w-12 items-center justify-center rounded-2xl text-white">
                    <Box size={23} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink-1">{billetModelerManifest.name}</h3>
                      <span className="rounded-full border border-amber/20 bg-amber/10 px-2 py-0.5 text-[0.62rem] font-medium text-amber">原型</span>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-2">{billetModelerManifest.summary}</p>
                  </div>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink-3 transition group-hover:border-accent/40 group-hover:bg-accent/10 group-hover:text-accent">
                  <ArrowRight size={17} />
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {billetModelerManifest.capabilities.map((item) => (
                  <span key={item} className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-[0.68rem] text-ink-2">{item}</span>
                ))}
              </div>
              <div className="mt-6 grid gap-3 border-t border-line/80 pt-5 sm:grid-cols-3">
                <ToolMetric icon={Braces} label="参数协议" value={`${billetModelerManifest.fields.length} 个字段`} />
                <ToolMetric icon={Clock3} label="运行阶段" value={`${billetModelerManifest.stages.length} 个检查点`} />
                <ToolMetric icon={Box} label="交付产物" value={`${billetModelerManifest.artifacts.length} 类文件`} />
              </div>
            </Link>

            <aside className="rounded-2xl border border-line bg-surface-1/72 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-ink-3">工作区状态</p>
                  <h3 className="mt-1 text-sm font-semibold text-ink-1">尚未接入真实脚本</h3>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-amber shadow-[0_0_12px_var(--amber)]" />
              </div>
              <ol className="mt-5 space-y-4">
                {['确认脚本入口与版本', '替换占位参数并补齐约束', '配置 MCP 或本地进程适配器', '完成样例模型验收'].map((item, index) => (
                  <li key={item} className="flex gap-3 text-xs leading-5 text-ink-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-[0.62rem] text-ink-3">{index + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-medium text-ink-3">能力路线图</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {UPCOMING_TOOLS.map(({ name, icon: Icon, copy }) => (
              <div key={name} className="rounded-2xl border border-dashed border-line bg-surface-1/45 p-5 opacity-80">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-ink-3"><Icon size={17} /></span>
                  <div>
                    <h3 className="text-sm font-medium text-ink-1">{name}</h3>
                    <p className="mt-1 text-xs text-ink-3">{copy}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-surface-2 px-2 py-1 text-[0.6rem] text-ink-3">规划中</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function ToolMetric({ icon: Icon, label, value }: { icon: typeof Box; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={15} className="text-accent" />
      <div>
        <p className="text-[0.62rem] text-ink-3">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-ink-1">{value}</p>
      </div>
    </div>
  )
}
