import { labelChangeFailureRate } from '../formatters.js';
import { DEFAULT_THRESHOLDS } from '../thresholds.js';
import type {
  ChangeFailureRateThresholds,
  DeploymentEvent,
  DoraLevel,
  DoraLevelResult,
  LabelFormatter,
} from '../types.js';

function classify(
  value: number,
  thresholds: { elite: number; high: number; medium: number },
): DoraLevel {
  if (value <= thresholds.elite) {
    return 'elite';
  }
  if (value <= thresholds.high) {
    return 'high';
  }
  if (value <= thresholds.medium) {
    return 'medium';
  }
  return 'low';
}

function resolveLabel(
  formatter: LabelFormatter | undefined,
  defaultFormatter: LabelFormatter,
  value: number,
  level: DoraLevel,
): string {
  return (formatter ?? defaultFormatter)(value, level);
}

export function calcChangeFailureRate(
  events: DeploymentEvent[],
  options?: {
    thresholds?: Partial<ChangeFailureRateThresholds>;
    label?: LabelFormatter;
  },
): DoraLevelResult {
  if (events.length === 0) {
    return { value: 0, level: 'low', label: '—' };
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS.changeFailureRate,
    ...options?.thresholds,
  };

  const failures = events.filter((e) => !e.success).length;
  const value = (failures / events.length) * 100;
  const level = classify(value, thresholds);
  const label = resolveLabel(options?.label, labelChangeFailureRate, value, level);

  return { value, level, label };
}
