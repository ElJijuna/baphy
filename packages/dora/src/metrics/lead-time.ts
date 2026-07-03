import { labelLeadTime } from '../formatters.js';
import { DEFAULT_THRESHOLDS } from '../thresholds.js';
import type {
  AggregateMethod,
  ChangeEvent,
  DoraLevelResult,
  LabelFormatter,
  LeadTimeThresholds,
} from '../types.js';
import { aggregate, classify, EMPTY_RESULT, resolveLabel } from './shared.js';

export function calcLeadTime(
  changes: ChangeEvent[],
  options?: {
    thresholds?: Partial<LeadTimeThresholds>;
    label?: LabelFormatter;
    aggregate?: AggregateMethod;
  },
): DoraLevelResult {
  if (changes.length === 0) {
    return EMPTY_RESULT;
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS.leadTime,
    ...options?.thresholds,
  };

  const hours = changes.map(
    (c) => (c.deployedAt.getTime() - c.startedAt.getTime()) / (1000 * 60 * 60),
  );

  const value = aggregate(hours, options?.aggregate ?? 'mean');
  const level = classify(value, thresholds, 'lowerIsBetter');
  const label = resolveLabel(options?.label, labelLeadTime, value, level);

  return { value, level, label };
}
