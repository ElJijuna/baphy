import { labelMttr } from '../formatters.js';
import { DEFAULT_THRESHOLDS } from '../thresholds.js';
import type {
  AggregateMethod,
  DoraLevelResult,
  IncidentEvent,
  LabelFormatter,
  MttrThresholds,
} from '../types.js';
import { aggregate, classify, EMPTY_RESULT, resolveLabel } from './shared.js';

export function calcMttr(
  incidents: IncidentEvent[],
  options?: {
    thresholds?: Partial<MttrThresholds>;
    label?: LabelFormatter;
    aggregate?: AggregateMethod;
  },
): DoraLevelResult {
  if (incidents.length === 0) {
    return EMPTY_RESULT;
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS.mttr,
    ...options?.thresholds,
  };

  const hours = incidents.map(
    (i) => (i.restoredAt.getTime() - i.failedAt.getTime()) / (1000 * 60 * 60),
  );

  const value = aggregate(hours, options?.aggregate ?? 'mean');
  const level = classify(value, thresholds, 'lowerIsBetter');
  const label = resolveLabel(options?.label, labelMttr, value, level);

  return { value, level, label };
}
