import type { DoraLevel } from './types.js';

const numFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export function labelDeploymentFrequency(value: number, _level: DoraLevel): string {
  if (value >= 1) {
    const n = numFmt.format(value);
    return `${n} ${value === 1 ? 'deploy' : 'deploys'}/day`;
  }
  const perWeek = value * 7;
  if (perWeek >= 1) {
    const n = numFmt.format(perWeek);
    return `${n} ${perWeek === 1 ? 'deploy' : 'deploys'}/week`;
  }
  const perMonth = value * 30;
  const n = numFmt.format(perMonth);
  return `${n} ${perMonth === 1 ? 'deploy' : 'deploys'}/month`;
}

export function labelLeadTime(value: number, _level: DoraLevel): string {
  return formatHours(value);
}

export function labelChangeFailureRate(value: number, _level: DoraLevel): string {
  return `${numFmt.format(value)}%`;
}

export function labelMttr(value: number, _level: DoraLevel): string {
  return formatHours(value);
}

function formatHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  if (hours <= 24) {
    return `${numFmt.format(hours)} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  const days = hours / 24;
  return `${numFmt.format(days)} ${days === 1 ? 'day' : 'days'}`;
}
