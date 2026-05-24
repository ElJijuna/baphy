import type {
  DoraLevel,
  DoraLevelResult,
  IncidentEvent,
  LabelFormatter,
  MttrThresholds,
} from '../types.js'
import { DEFAULT_THRESHOLDS } from '../thresholds.js'
import { labelMttr } from '../formatters.js'

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

export function calcMttr(
  incidents: IncidentEvent[],
  options?: {
    thresholds?: Partial<MttrThresholds>
    label?: LabelFormatter
  },
): DoraLevelResult {
  if (incidents.length === 0) {
    return { value: 0, level: 'low', label: '—' }
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS.mttr,
    ...options?.thresholds,
  }

  const totalHours = incidents.reduce((sum, i) => {
    const ms = i.restoredAt.getTime() - i.failedAt.getTime()
    return sum + ms / (1000 * 60 * 60)
  }, 0)

  const value = totalHours / incidents.length
  const level = classify(value, thresholds)
  const label = resolveLabel(options?.label, labelMttr, value, level)

  return { value, level, label }
}
