import { labelChangeFailureRate } from '../formatters.js';
import { DEFAULT_THRESHOLDS } from '../thresholds.js';
import type {
  ChangeFailureRateThresholds,
  DeploymentEvent,
  DoraLevelResult,
  LabelFormatter,
} from '../types.js';
import { classify, EMPTY_RESULT, resolveLabel } from './shared.js';

export function calcChangeFailureRate(
  events: DeploymentEvent[],
  options?: {
    thresholds?: Partial<ChangeFailureRateThresholds>;
    label?: LabelFormatter;
  },
): DoraLevelResult {
  if (events.length === 0) {
    return EMPTY_RESULT;
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS.changeFailureRate,
    ...options?.thresholds,
  };
  const failures = events.filter((e) => !e.success).length;
  const value = (failures / events.length) * 100;
  const level = classify(value, thresholds, 'lowerIsBetter');
  const label = resolveLabel(options?.label, labelChangeFailureRate, value, level);

  return { value, level, label };
}
