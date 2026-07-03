import { labelLeadTime } from '../formatters.js';
import { DEFAULT_THRESHOLDS } from '../thresholds.js';
import type { ChangeEvent, DoraLevelResult, LabelFormatter, LeadTimeThresholds } from '../types.js';
import { classify, EMPTY_RESULT, resolveLabel } from './shared.js';

export function calcLeadTime(
  changes: ChangeEvent[],
  options?: {
    thresholds?: Partial<LeadTimeThresholds>;
    label?: LabelFormatter;
  },
): DoraLevelResult {
  if (changes.length === 0) {
    return EMPTY_RESULT;
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS.leadTime,
    ...options?.thresholds,
  };

  const totalHours = changes.reduce((sum, c) => {
    const ms = c.deployedAt.getTime() - c.startedAt.getTime();
    return sum + ms / (1000 * 60 * 60);
  }, 0);

  const value = totalHours / changes.length;
  const level = classify(value, thresholds, 'lowerIsBetter');
  const label = resolveLabel(options?.label, labelLeadTime, value, level);

  return { value, level, label };
}
