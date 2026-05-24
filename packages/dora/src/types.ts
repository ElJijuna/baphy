export type DoraLevel = 'elite' | 'high' | 'medium' | 'low'

export interface DoraLevelResult {
  value: number
  level: DoraLevel
  label: string
}

export interface DoraResult {
  deploymentFrequency?: DoraLevelResult
  leadTime?: DoraLevelResult
  changeFailureRate?: DoraLevelResult
  mttr?: DoraLevelResult
  overall?: DoraLevel
}

export type LabelFormatter = (value: number, level: DoraLevel) => string

export interface DeploymentFrequencyThresholds {
  elite: number
  high: number
  medium: number
}

export interface LeadTimeThresholds {
  elite: number
  high: number
  medium: number
}

export interface ChangeFailureRateThresholds {
  elite: number
  high: number
  medium: number
}

export interface MttrThresholds {
  elite: number
  high: number
  medium: number
}

export interface DoraThresholds {
  deploymentFrequency: DeploymentFrequencyThresholds
  leadTime: LeadTimeThresholds
  changeFailureRate: ChangeFailureRateThresholds
  mttr: MttrThresholds
}

export interface DeploymentEvent {
  deployedAt: Date
  success: boolean
}

export interface ChangeEvent {
  startedAt: Date
  deployedAt: Date
}

export interface IncidentEvent {
  failedAt: Date
  restoredAt: Date
}

export interface Period {
  start: Date
  end: Date
}
