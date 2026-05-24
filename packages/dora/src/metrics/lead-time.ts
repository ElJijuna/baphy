import type {
  ChangeEvent,
  DoraLevel,
  DoraLevelResult,
  LabelFormatter,
  LeadTimeThresholds,
} from '../types.js'
import { DEFAULT_THRESHOLDS } from '../thresholds.js'
import { labelLeadTime } from '../formatters.js'

function classify(
  value: number,
  thresholds: { elite: number; high: number; medium: number },
): DoraLevel {
  if (value <= thresholds.elite) return 'elite'
  if (value <= thresholds.high) return 'high'
  if (value <= thresholds.medium) return 'medium'
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

export function calcLeadTime(
  changes: ChangeEvent[],
  options?: {
    thresholds?: Partial<LeadTimeThresholds>
    label?: LabelFormatter
  },
): DoraLevelResult {
  if (changes.length === 0) {
    return { value: 0, level: 'low', label: '—' }
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS.leadTime,
    ...options?.thresholds,
  }

  const totalHours = changes.reduce((sum, c) => {
    const ms = c.deployedAt.getTime() - c.startedAt.getTime()
    return sum + ms / (1000 * 60 * 60)
  }, 0)

  const value = totalHours / changes.length
  const level = classify(value, thresholds)
  const label = resolveLabel(options?.label, labelLeadTime, value, level)

  return { value, level, label }
}
