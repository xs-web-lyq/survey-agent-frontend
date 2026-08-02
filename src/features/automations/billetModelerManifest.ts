import type { AutomationToolManifest } from './types'

/**
 * UI 与领域脚本之间的稳定协议。真实脚本接入时只需补齐字段映射与执行适配器，
 * 页面不直接依赖 Python 参数名或 MCP 工具实现。
 */
export const billetModelerManifest: AutomationToolManifest = {
  schemaVersion: '1.0',
  id: 'continuous-casting.billet-modeler',
  slug: 'billet-modeler',
  name: '方坯连铸自动建模',
  shortName: '方坯建模',
  version: '0.1.0-draft',
  domain: '连铸 · 自动化建模',
  summary: '通过几何、钢种与工艺参数生成可复用的方坯模型、参数快照与运行报告。',
  status: 'draft',
  capabilities: ['参数校验', '几何生成', '网格准备', '模型导出', '运行审计'],
  fields: [
    { id: 'width_mm', label: '断面宽度', type: 'number', group: 'geometry', unit: 'mm', required: true, defaultValue: 160, min: 80, max: 500, description: '方坯横截面宽度' },
    { id: 'thickness_mm', label: '断面厚度', type: 'number', group: 'geometry', unit: 'mm', required: true, defaultValue: 160, min: 80, max: 500, description: '方坯横截面厚度' },
    { id: 'length_mm', label: '计算域长度', type: 'number', group: 'geometry', unit: 'mm', required: true, defaultValue: 1200, min: 100, max: 10000 },
    { id: 'corner_radius_mm', label: '圆角半径', type: 'number', group: 'geometry', unit: 'mm', defaultValue: 12, min: 0, max: 100 },
    { id: 'steel_grade', label: '钢种', type: 'text', group: 'process', placeholder: '例如：Q235B', required: true, defaultValue: 'Q235B' },
    { id: 'casting_speed_m_min', label: '拉坯速度', type: 'number', group: 'process', unit: 'm/min', required: true, defaultValue: 2.2, min: 0.1, max: 10 },
    { id: 'pouring_temperature_c', label: '浇注温度', type: 'number', group: 'process', unit: '°C', required: true, defaultValue: 1545, min: 1300, max: 1800 },
    { id: 'placeholder_param_01', label: '待确认参数 01', type: 'number', group: 'process', placeholder: '等待脚本参数定义', description: '占位字段：接入师兄脚本时替换名称、单位与约束', provisional: true },
    { id: 'placeholder_param_02', label: '待确认参数 02', type: 'select', group: 'process', description: '占位字段：用于尚未确认的枚举型工艺参数', provisional: true, options: [{ label: '方案 A', value: 'option_a' }, { label: '方案 B', value: 'option_b' }] },
    { id: 'mesh_size_mm', label: '目标网格尺寸', type: 'number', group: 'advanced', unit: 'mm', defaultValue: 4, min: 0.1, max: 50 },
    { id: 'symmetry_mode', label: '对称建模', type: 'select', group: 'advanced', defaultValue: 'quarter', options: [{ label: '四分之一模型', value: 'quarter' }, { label: '二分之一模型', value: 'half' }, { label: '完整模型', value: 'full' }] },
    { id: 'output_format', label: '输出格式', type: 'select', group: 'advanced', defaultValue: 'step', options: [{ label: 'STEP', value: 'step' }, { label: 'IGES', value: 'iges' }, { label: 'STL', value: 'stl' }] },
    { id: 'placeholder_param_03', label: '待确认参数 03', type: 'text', group: 'advanced', placeholder: '等待脚本参数定义', provisional: true },
  ],
  artifacts: [
    { id: 'model', label: '方坯模型', format: 'STEP', description: '可交付至后续仿真或 CAD 流程' },
    { id: 'parameters', label: '参数快照', format: 'JSON', description: '完整记录输入、默认值与工具版本' },
    { id: 'preview', label: '模型预览', format: 'PNG', description: '用于快速检查几何与尺寸' },
    { id: 'report', label: '运行报告', format: 'MD', description: '阶段、耗时、校验结果与异常说明' },
  ],
  stages: [
    { id: 'validate', label: '参数校验', description: '检查必填值、范围与字段映射' },
    { id: 'prepare', label: '准备环境', description: '确认脚本、软件与工作目录可用' },
    { id: 'geometry', label: '生成几何', description: '建立方坯几何及圆角特征' },
    { id: 'mesh', label: '网格准备', description: '应用网格与对称策略' },
    { id: 'export', label: '导出产物', description: '输出模型、快照与运行报告' },
  ],
}

export const initialBilletParameters = Object.fromEntries(
  billetModelerManifest.fields.map((field) => [field.id, field.defaultValue ?? '']),
) as Record<string, string | number | boolean>
