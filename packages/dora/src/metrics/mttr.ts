import { labelMttr } from '../formatters.js';
import { DEFAULT_THRESHOLDS } from '../thresholds.js';
import type { DoraLevelResult, IncidentEvent, LabelFormatter, MttrThresholds } from '../types.js';
import { classify, EMPTY_RESULT, resolveLabel } from './shared.js';

export function calcMttr(
  incidents: IncidentEvent[],
  options?: {
    thresholds?: Partial<MttrThresholds>;
    label?: LabelFormatter;
  },
): DoraLevelResult {
  if (incidents.length === 0) {
    return EMPTY_RESULT;
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS.mttr,
    ...options?.thresholds,
  };

  const totalHours = incidents.reduce((sum, i) => {
    const ms = i.restoredAt.getTime() - i.failedAt.getTime();
    return sum + ms / (1000 * 60 * 60);
  }, 0);

  const value = totalHours / incidents.length;
  const level = classify(value, thresholds, 'lowerIsBetter');
  const label = resolveLabel(options?.label, labelMttr, value, level);

  return { value, level, label };
}
