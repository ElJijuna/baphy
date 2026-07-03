import type { DoraLevel, DoraLevelResult, LabelFormatter } from '../types.js';

/** Result returned when there is no data to compute a metric from. */
export const EMPTY_RESULT: DoraLevelResult = { value: 0, level: 'low', label: '—' };

export function classify(
  value: number,
  thresholds: { elite: number; high: number; medium: number },
  direction: 'higherIsBetter' | 'lowerIsBetter',
): DoraLevel {
  if (direction === 'lowerIsBetter') {
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
  if (value >= thresholds.elite) {
    return 'elite';
  }
  if (value >= thresholds.high) {
    return 'high';
  }
  if (value >= thresholds.medium) {
    return 'medium';
  }
  return 'low';
}

export function resolveLabel(
  formatter: LabelFormatter | undefined,
  defaultFormatter: LabelFormatter,
  value: number,
  level: DoraLevel,
): string {
  return (formatter ?? defaultFormatter)(value, level);
}
