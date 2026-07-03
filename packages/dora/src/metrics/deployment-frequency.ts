import { labelDeploymentFrequency } from '../formatters.js';
import { DEFAULT_THRESHOLDS } from '../thresholds.js';
import type {
  DeploymentEvent,
  DeploymentFrequencyThresholds,
  DoraLevelResult,
  LabelFormatter,
  Period,
} from '../types.js';
import { classify, EMPTY_RESULT, resolveLabel } from './shared.js';

export function calcDeploymentFrequency(
  events: DeploymentEvent[],
  period: Period,
  options?: {
    thresholds?: Partial<DeploymentFrequencyThresholds>;
    label?: LabelFormatter;
  },
): DoraLevelResult {
  if (events.length === 0) {
    return EMPTY_RESULT;
  }

  const thresholds = {
    ...DEFAULT_THRESHOLDS.deploymentFrequency,
    ...options?.thresholds,
  };

  const periodMs = period.end.getTime() - period.start.getTime();
  const periodDays = periodMs / (1000 * 60 * 60 * 24);
  if (periodDays <= 0) {
    return EMPTY_RESULT;
  }

  const successful = events.filter(
    (e) => e.success && e.deployedAt >= period.start && e.deployedAt <= period.end,
  );

  const value = successful.length / periodDays;
  const level = classify(value, thresholds, 'higherIsBetter');
  const label = resolveLabel(options?.label, labelDeploymentFrequency, value, level);

  return { value, level, label };
}
