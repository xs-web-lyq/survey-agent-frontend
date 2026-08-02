export type AutomationFieldType = 'number' | 'text' | 'select' | 'boolean'

export interface AutomationOption {
  label: string
  value: string
}

export interface AutomationFieldDefinition {
  id: string
  label: string
  type: AutomationFieldType
  group: 'geometry' | 'process' | 'advanced'
  placeholder?: string
  unit?: string
  description?: string
  required?: boolean
  defaultValue?: string | number | boolean
  min?: number
  max?: number
  options?: AutomationOption[]
  provisional?: boolean
}

export interface AutomationArtifactDefinition {
  id: string
  label: string
  format: string
  description: string
}

export interface AutomationStageDefinition {
  id: string
  label: string
  description: string
}

export interface AutomationToolManifest {
  schemaVersion: '1.0'
  id: string
  slug: string
  name: string
  shortName: string
  version: string
  domain: string
  summary: string
  status: 'draft' | 'ready'
  capabilities: string[]
  fields: AutomationFieldDefinition[]
  artifacts: AutomationArtifactDefinition[]
  stages: AutomationStageDefinition[]
}

export type AutomationRunStatus = 'idle' | 'validating' | 'running' | 'completed' | 'failed'

export interface AutomationRunSnapshot {
  id: string
  status: AutomationRunStatus
  stageIndex: number
  startedAt?: string
  finishedAt?: string
  message: string
}
