import type {
  DeploymentEvent,
  DeploymentFrequencyThresholds,
  DoraLevel,
  DoraLevelResult,
  LabelFormatter,
  Period,
} from '../types.js'
import { DEFAULT_THRESHOLDS } from '../thresholds.js'
import { labelDeploymentFrequency } from '../formatters.js'

function classify(
  value: number,
  thresholds: { elite: number; high: number; medium: number },
  lowerIsBetter: boolean,
): DoraLevel {
  if (lowerIsBetter) {
    if (value <= thresholds.elite) return 'elite'
    if (value <= thresholds.high) return 'high'
    if (value <= thresholds.medium) return 'medium'
    return 'low'
  }
  if (value >= thresholds.elite) return 'elite'
  if (value >= thresholds.high) return 'high'
  if (value >= thresholds.medium) return 'medium'
  return 'low'
}

function resolveLabel(
  formatter: LabelFormatter | undefined,
  defaultFormatter: LabelFormatter,
  value: number,
  level: DoraLevel,
): string {
  return (formatter ?? defaultFormatter)(value, level)
}

export function calcDeploymentFrequency(
  events: DeploymentEvent[],
  period: Period,
  options?: {
    thresholds?: Partial<DeploymentFrequencyThresholds>
    label?: LabelFormatter
  },
): DoraLevelResult {
  if (events.length === 0) {
    return { value: 0, level: 'low', label: '—' }
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS.deploymentFrequency,
    ...options?.thresholds,
  }

  const periodMs = period.end.getTime() - period.start.getTime()
  const periodDays = periodMs / (1000 * 60 * 60 * 24)

  const successful = events.filter(
    (e) =>
      e.success &&
      e.deployedAt >= period.start &&
      e.deployedAt <= period.end,
  )

  const value = successful.length / periodDays
  const level = classify(value, thresholds, false)
  const label = resolveLabel(options?.label, labelDeploymentFrequency, value, level)

  return { value, level, label }
}
