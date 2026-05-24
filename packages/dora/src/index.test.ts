import { describe, it, expect } from 'vitest'
import {
  calcDeploymentFrequency,
  calcLeadTime,
  calcChangeFailureRate,
  calcMttr,
  calcDora,
  mergeThresholds,
  DEFAULT_THRESHOLDS,
  labelDeploymentFrequency,
  labelLeadTime,
  labelMttr,
  labelChangeFailureRate,
} from './index.js'
import type { DeploymentEvent, ChangeEvent, IncidentEvent, Period } from './index.js'

// --- helpers ---

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function period(days = 30): Period {
  return { start: daysAgo(days), end: new Date() }
}

function deployments(count: number, successRate = 1, withinPeriod = true): DeploymentEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    deployedAt: withinPeriod ? daysAgo(i % 28) : new Date(2000, 0, i + 1),
    success: i / count < successRate,
  }))
}

// --- calcDeploymentFrequency ---

describe('calcDeploymentFrequency', () => {
  it('elite: > 1 deploy/day', () => {
    const p = period(30)
    const events = deployments(60)
    const result = calcDeploymentFrequency(events, p)
    expect(result.level).toBe('elite')
    expect(result.value).toBeGreaterThanOrEqual(1)
  })

  it('high: ~1 deploy/week', () => {
    const p = period(28)
    const events = deployments(4)
    const result = calcDeploymentFrequency(events, p)
    expect(result.level).toBe('high')
  })

  it('medium: ~1 deploy/month', () => {
    const p = period(60)
    const events = deployments(2)
    const result = calcDeploymentFrequency(events, p)
    expect(result.level).toBe('medium')
  })

  it('low: less than monthly', () => {
    const p = period(90)
    const events = deployments(1)
    const result = calcDeploymentFrequency(events, p)
    expect(result.level).toBe('low')
  })

  it('empty events → { value: 0, level: low }', () => {
    const result = calcDeploymentFrequency([], period())
    expect(result).toEqual({ value: 0, level: 'low', label: '—' })
  })

  it('only counts events within period', () => {
    const p = period(30)
    const inside: DeploymentEvent[] = [{ deployedAt: daysAgo(5), success: true }]
    const outside: DeploymentEvent[] = [{ deployedAt: new Date(2000, 0, 1), success: true }]
    const withOutside = calcDeploymentFrequency([...inside, ...outside], p)
    const withoutOutside = calcDeploymentFrequency(inside, p)
    expect(withOutside.value).toBeCloseTo(withoutOutside.value)
  })

  it('only counts successful deployments', () => {
    const p = period(30)
    const events: DeploymentEvent[] = [
      { deployedAt: daysAgo(1), success: true },
      { deployedAt: daysAgo(2), success: false },
      { deployedAt: daysAgo(3), success: false },
    ]
    const result = calcDeploymentFrequency(events, p)
    const expected = 1 / 30
    expect(result.value).toBeCloseTo(expected)
  })

  it('custom thresholds override defaults', () => {
    const p = period(30)
    const events = deployments(5)
    const result = calcDeploymentFrequency(events, p, {
      thresholds: { elite: 100 },
    })
    expect(result.level).not.toBe('elite')
  })
})

// --- calcLeadTime ---

describe('calcLeadTime', () => {
  it('elite: < 1 hour mean', () => {
    const changes: ChangeEvent[] = [
      { startedAt: new Date(Date.now() - 30 * 60 * 1000), deployedAt: new Date() },
    ]
    const result = calcLeadTime(changes)
    expect(result.level).toBe('elite')
    expect(result.value).toBeLessThan(1)
  })

  it('high: < 1 week mean', () => {
    const changes: ChangeEvent[] = [
      { startedAt: daysAgo(3), deployedAt: new Date() },
    ]
    const result = calcLeadTime(changes)
    expect(result.level).toBe('high')
  })

  it('medium: < 1 month mean', () => {
    const changes: ChangeEvent[] = [
      { startedAt: daysAgo(20), deployedAt: new Date() },
    ]
    const result = calcLeadTime(changes)
    expect(result.level).toBe('medium')
  })

  it('low: > 1 month mean', () => {
    const changes: ChangeEvent[] = [
      { startedAt: daysAgo(45), deployedAt: new Date() },
    ]
    const result = calcLeadTime(changes)
    expect(result.level).toBe('low')
  })

  it('correct mean across multiple changes', () => {
    const changes: ChangeEvent[] = [
      { startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), deployedAt: new Date() },
      { startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), deployedAt: new Date() },
    ]
    const result = calcLeadTime(changes)
    expect(result.value).toBeCloseTo(3)
  })

  it('empty changes → { value: 0, level: low }', () => {
    const result = calcLeadTime([])
    expect(result).toEqual({ value: 0, level: 'low', label: '—' })
  })

  it('label uses minutes when < 1 hour', () => {
    const changes: ChangeEvent[] = [
      { startedAt: new Date(Date.now() - 30 * 60 * 1000), deployedAt: new Date() },
    ]
    const result = calcLeadTime(changes)
    expect(result.label).toMatch(/minutes?/)
  })

  it('label uses days when > 24 hours', () => {
    const changes: ChangeEvent[] = [
      { startedAt: daysAgo(3), deployedAt: new Date() },
    ]
    const result = calcLeadTime(changes)
    expect(result.label).toMatch(/days?/)
  })
})

// --- calcChangeFailureRate ---

describe('calcChangeFailureRate', () => {
  it('0% failure → elite', () => {
    const events = deployments(10, 1)
    const result = calcChangeFailureRate(events)
    expect(result.level).toBe('elite')
    expect(result.value).toBe(0)
  })

  it('100% failure → low', () => {
    const events: DeploymentEvent[] = [
      { deployedAt: new Date(), success: false },
      { deployedAt: new Date(), success: false },
    ]
    const result = calcChangeFailureRate(events)
    expect(result.level).toBe('low')
    expect(result.value).toBe(100)
  })

  it('mixed → correct percentage and level', () => {
    const events: DeploymentEvent[] = [
      { deployedAt: new Date(), success: true },
      { deployedAt: new Date(), success: true },
      { deployedAt: new Date(), success: false },
      { deployedAt: new Date(), success: false },
    ]
    const result = calcChangeFailureRate(events)
    expect(result.value).toBe(50)
    expect(result.level).toBe('low')
  })

  it('empty events → { value: 0, level: low }', () => {
    const result = calcChangeFailureRate([])
    expect(result).toEqual({ value: 0, level: 'low', label: '—' })
  })

  it('custom thresholds', () => {
    const events: DeploymentEvent[] = [
      { deployedAt: new Date(), success: false },
      ...Array.from({ length: 9 }, () => ({ deployedAt: new Date(), success: true })),
    ]
    const result = calcChangeFailureRate(events, { thresholds: { elite: 20 } })
    expect(result.level).toBe('elite')
  })
})

// --- calcMttr ---

describe('calcMttr', () => {
  it('< 1 hour mean → elite', () => {
    const incidents: IncidentEvent[] = [
      { failedAt: new Date(Date.now() - 30 * 60 * 1000), restoredAt: new Date() },
    ]
    const result = calcMttr(incidents)
    expect(result.level).toBe('elite')
  })

  it('correct mean across multiple incidents', () => {
    const incidents: IncidentEvent[] = [
      { failedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), restoredAt: new Date() },
      { failedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), restoredAt: new Date() },
    ]
    const result = calcMttr(incidents)
    expect(result.value).toBeCloseTo(3)
  })

  it('empty incidents → { value: 0, level: low }', () => {
    const result = calcMttr([])
    expect(result).toEqual({ value: 0, level: 'low', label: '—' })
  })

  it('label formatting: minutes for < 1 hour', () => {
    const incidents: IncidentEvent[] = [
      { failedAt: new Date(Date.now() - 30 * 60 * 1000), restoredAt: new Date() },
    ]
    const result = calcMttr(incidents)
    expect(result.label).toMatch(/minutes?/)
  })

  it('label formatting: hours for 1–24 hours', () => {
    const incidents: IncidentEvent[] = [
      { failedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), restoredAt: new Date() },
    ]
    const result = calcMttr(incidents)
    expect(result.label).toMatch(/hours?/)
  })

  it('label formatting: days for > 24 hours', () => {
    const incidents: IncidentEvent[] = [
      { failedAt: daysAgo(3), restoredAt: new Date() },
    ]
    const result = calcMttr(incidents)
    expect(result.label).toMatch(/days?/)
  })
})

// --- calcDora ---

describe('calcDora', () => {
  it('only deployments provided → deploymentFrequency + changeFailureRate in result', () => {
    const p = period(30)
    const result = calcDora({ deployments: deployments(10), period: p })
    expect(result.deploymentFrequency).toBeDefined()
    expect(result.changeFailureRate).toBeDefined()
    expect(result.leadTime).toBeUndefined()
    expect(result.mttr).toBeUndefined()
  })

  it('full input → all four metrics computed', () => {
    const p = period(30)
    const result = calcDora({
      deployments: deployments(10),
      changes: [{ startedAt: daysAgo(2), deployedAt: new Date() }],
      incidents: [{ failedAt: new Date(Date.now() - 60 * 60 * 1000), restoredAt: new Date() }],
      period: p,
    })
    expect(result.deploymentFrequency).toBeDefined()
    expect(result.changeFailureRate).toBeDefined()
    expect(result.leadTime).toBeDefined()
    expect(result.mttr).toBeDefined()
    expect(result.overall).toBeDefined()
  })

  it('overall = worst level', () => {
    const p = period(30)
    const result = calcDora({
      deployments: deployments(60),
      changes: [{ startedAt: daysAgo(45), deployedAt: new Date() }],
      period: p,
    })
    expect(result.overall).toBe('low')
  })

  it('default period applied when not provided', () => {
    const result = calcDora({ deployments: deployments(10) })
    expect(result.deploymentFrequency).toBeDefined()
  })

  it('custom labels passed through to each metric', () => {
    const p = period(30)
    const result = calcDora({
      deployments: deployments(10),
      period: p,
      labels: {
        deploymentFrequency: (v) => `${v.toFixed(2)} dep/day`,
        changeFailureRate: (v) => `${v.toFixed(0)}% fail`,
      },
    })
    expect(result.deploymentFrequency?.label).toMatch(/dep\/day/)
    expect(result.changeFailureRate?.label).toMatch(/fail/)
  })
})

// --- label formatters ---

describe('label formatters', () => {
  it('labelDeploymentFrequency: >= 1/day shows per-day', () => {
    expect(labelDeploymentFrequency(2.3, 'elite')).toMatch(/deploys\/day/)
  })

  it('labelDeploymentFrequency: < 1/day shows per-week', () => {
    expect(labelDeploymentFrequency(1 / 7, 'high')).toMatch(/deploy.*\/week/)
  })

  it('labelDeploymentFrequency: < 1/week shows per-month', () => {
    expect(labelDeploymentFrequency(1 / 30, 'medium')).toMatch(/deploy.*\/month/)
  })

  it('labelLeadTime: < 1h shows minutes', () => {
    expect(labelLeadTime(0.5, 'elite')).toMatch(/minutes?/)
  })

  it('labelLeadTime: > 24h shows days', () => {
    expect(labelLeadTime(48, 'medium')).toMatch(/days?/)
  })

  it('labelMttr: same unit logic as lead time', () => {
    expect(labelMttr(0.25, 'elite')).toMatch(/minutes?/)
    expect(labelMttr(3, 'high')).toMatch(/hours?/)
    expect(labelMttr(72, 'low')).toMatch(/days?/)
  })

  it('labelChangeFailureRate: rounds to 1 decimal', () => {
    expect(labelChangeFailureRate(8.25, 'high')).toBe('8.3%')
  })
})

// --- custom label option ---

describe('custom label option', () => {
  it('metric function uses custom label formatter when provided', () => {
    const events: DeploymentEvent[] = [{ deployedAt: new Date(), success: true }]
    const result = calcChangeFailureRate(events, {
      label: (v) => `${v}% de fallos`,
    })
    expect(result.label).toMatch(/de fallos/)
  })

  it('calcDora uses per-metric label override from labels map', () => {
    const p = period(30)
    const result = calcDora({
      changes: [{ startedAt: daysAgo(1), deployedAt: new Date() }],
      period: p,
      labels: {
        leadTime: (v) => `${v.toFixed(1)}h lead`,
      },
    })
    expect(result.leadTime?.label).toMatch(/h lead/)
  })
})

// --- mergeThresholds ---

describe('mergeThresholds', () => {
  it('partial override merges correctly', () => {
    const merged = mergeThresholds({ deploymentFrequency: { elite: 5, high: 1, medium: 0.5 } })
    expect(merged.deploymentFrequency.elite).toBe(5)
    expect(merged.leadTime).toEqual(DEFAULT_THRESHOLDS.leadTime)
  })

  it('undefined override returns defaults unchanged', () => {
    const merged = mergeThresholds(undefined)
    expect(merged).toBe(DEFAULT_THRESHOLDS)
  })
})
