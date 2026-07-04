import type { AggregateMethod, DoraLevel, DoraLevelResult, LabelFormatter } from '../types.js';

/** Result returned when there is no data to compute a metric from. */
export const EMPTY_RESULT: DoraLevelResult = { value: 0, level: 'low', label: '—' };

/**
 * Aggregates a non-empty series. Median averages the middle pair on
 * even-sized input; p90 uses the nearest-rank method. Both sort a copy of
 * the series, so non-mean methods are O(n log n).
 */
export function aggregate(values: number[], method: AggregateMethod): number {
  if (method === 'mean') {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  const sorted = [...values].sort((a, b) => a - b);

  if (method === 'median') {
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[Math.ceil(sorted.length * 0.9) - 1];
}

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
