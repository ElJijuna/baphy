import { bench, describe } from 'vitest';
import type { ChangeEvent, DeploymentEvent, IncidentEvent, Period } from './index.js';
import {
  calcChangeFailureRate,
  calcDeploymentFrequency,
  calcDora,
  calcLeadTime,
  calcMttr,
} from './index.js';

function makePeriod(days = 90): Period {
  const end = new Date('2024-01-01T00:00:00Z');

  return { start: new Date(end.getTime() - days * 24 * 60 * 60 * 1000), end };
}

function makeDeployments(count: number, failureRate = 0.05): DeploymentEvent[] {
  const period = makePeriod();
  const span = period.end.getTime() - period.start.getTime();

  return Array.from({ length: count }, (_, i) => ({
    deployedAt: new Date(period.start.getTime() + (i / count) * span),
    success: i % Math.round(1 / failureRate) !== 0,
  }));
}

function makeChanges(count: number, leadHours = 4): ChangeEvent[] {
  const base = new Date('2024-01-01T00:00:00Z');

  return Array.from({ length: count }, (_, i) => ({
    startedAt: new Date(base.getTime() - (count - i) * 24 * 60 * 60 * 1000),
    deployedAt: new Date(
      base.getTime() - (count - i) * 24 * 60 * 60 * 1000 + leadHours * 60 * 60 * 1000,
    ),
  }));
}

function makeIncidents(count: number, mttrHours = 0.5): IncidentEvent[] {
  const base = new Date('2024-01-01T00:00:00Z');

  return Array.from({ length: count }, (_, i) => ({
    failedAt: new Date(base.getTime() - (count - i) * 24 * 60 * 60 * 1000),
    restoredAt: new Date(
      base.getTime() - (count - i) * 24 * 60 * 60 * 1000 + mttrHours * 60 * 60 * 1000,
    ),
  }));
}

// --- deployment frequency ---

describe('calcDeploymentFrequency — input size scaling', () => {
  const p = makePeriod();

  bench('100 deployments', () => {
    calcDeploymentFrequency(makeDeployments(100), p);
  });

  bench('1,000 deployments', () => {
    calcDeploymentFrequency(makeDeployments(1_000), p);
  });

  bench('10,000 deployments', () => {
    calcDeploymentFrequency(makeDeployments(10_000), p);
  });

  bench('100,000 deployments', () => {
    calcDeploymentFrequency(makeDeployments(100_000), p);
  });
});

// --- lead time ---

describe('calcLeadTime — input size scaling', () => {
  bench('100 changes', () => {
    calcLeadTime(makeChanges(100));
  });

  bench('1,000 changes', () => {
    calcLeadTime(makeChanges(1_000));
  });

  bench('10,000 changes', () => {
    calcLeadTime(makeChanges(10_000));
  });

  bench('100,000 changes', () => {
    calcLeadTime(makeChanges(100_000));
  });
});

describe('calcLeadTime — aggregation methods on 100,000 changes', () => {
  const changes = makeChanges(100_000);

  bench('mean', () => {
    calcLeadTime(changes, { aggregate: 'mean' });
  });

  bench('median', () => {
    calcLeadTime(changes, { aggregate: 'median' });
  });

  bench('p90', () => {
    calcLeadTime(changes, { aggregate: 'p90' });
  });
});

// --- change failure rate ---

describe('calcChangeFailureRate — input size scaling', () => {
  bench('100 deployments', () => {
    calcChangeFailureRate(makeDeployments(100));
  });

  bench('1,000 deployments', () => {
    calcChangeFailureRate(makeDeployments(1_000));
  });

  bench('10,000 deployments', () => {
    calcChangeFailureRate(makeDeployments(10_000));
  });

  bench('100,000 deployments', () => {
    calcChangeFailureRate(makeDeployments(100_000));
  });
});

// --- mttr ---

describe('calcMttr — input size scaling', () => {
  bench('100 incidents', () => {
    calcMttr(makeIncidents(100));
  });

  bench('1,000 incidents', () => {
    calcMttr(makeIncidents(1_000));
  });

  bench('10,000 incidents', () => {
    calcMttr(makeIncidents(10_000));
  });

  bench('100,000 incidents', () => {
    calcMttr(makeIncidents(100_000));
  });
});

// --- calcDora combined ---

describe('calcDora — all metrics combined', () => {
  const p = makePeriod();

  bench('100 of each', () => {
    calcDora({
      deployments: makeDeployments(100),
      changes: makeChanges(100),
      incidents: makeIncidents(100),
      period: p,
    });
  });

  bench('1,000 of each', () => {
    calcDora({
      deployments: makeDeployments(1_000),
      changes: makeChanges(1_000),
      incidents: makeIncidents(1_000),
      period: p,
    });
  });

  bench('10,000 of each', () => {
    calcDora({
      deployments: makeDeployments(10_000),
      changes: makeChanges(10_000),
      incidents: makeIncidents(10_000),
      period: p,
    });
  });
});
