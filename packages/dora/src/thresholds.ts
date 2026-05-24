import type { DoraThresholds } from './types.js'

export const DEFAULT_THRESHOLDS: DoraThresholds = {
  deploymentFrequency: {
    elite: 1,        // >= 1/day
    high: 1 / 7,     // >= 1/week
    medium: 1 / 30,  // >= 1/month, else low
  },
  leadTime: {
    elite: 1,        // <= 1 hour
    high: 24 * 7,    // <= 1 week
    medium: 24 * 30, // <= 1 month, else low
  },
  changeFailureRate: {
    elite: 5,        // <= 5%
    high: 10,        // <= 10%
    medium: 15,      // <= 15%, else low
  },
  mttr: {
    elite: 1,        // <= 1 hour
    high: 24,        // <= 1 day
    medium: 24 * 7,  // <= 1 week, else low
  },
}

export function mergeThresholds(overrides?: Partial<DoraThresholds>): DoraThresholds {
  if (!overrides) return DEFAULT_THRESHOLDS
  return {
    deploymentFrequency: { ...DEFAULT_THRESHOLDS.deploymentFrequency, ...overrides.deploymentFrequency },
    leadTime: { ...DEFAULT_THRESHOLDS.leadTime, ...overrides.leadTime },
    changeFailureRate: { ...DEFAULT_THRESHOLDS.changeFailureRate, ...overrides.changeFailureRate },
    mttr: { ...DEFAULT_THRESHOLDS.mttr, ...overrides.mttr },
  }
}
