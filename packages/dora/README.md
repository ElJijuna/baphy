<div align="center">

<img src="https://translate.google.com/website?sl=en&tl=es&hl=es&client=srp&u=https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Baphomet_by_%25C3%2589liphas_L%25C3%25A9vi.jpg/500px-Baphomet_by_%25C3%2589liphas_L%25C3%25A9vi.jpg" alt="Baphomet — baphy mascot" width="130" />

# `@baphy/dora`

**Calculate the four DORA engineering performance metrics from any data source**

[![npm version](https://img.shields.io/npm/v/@baphy/dora?style=flat-square&color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@baphy/dora)
[![npm downloads](https://img.shields.io/npm/dm/@baphy/dora?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/dora)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@baphy/dora?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@baphy/dora)
[![CI](https://img.shields.io/github/actions/workflow/status/ElJijuna/baphy/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/ElJijuna/baphy/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@baphy/dora?style=flat-square)](https://github.com/ElJijuna/baphy/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Overview

`@baphy/dora` calculates the four [DORA](https://dora.dev/) engineering performance metrics:

| Metric | Measures |
|---|---|
| **Deployment Frequency** | How often you deploy to production |
| **Lead Time for Changes** | Time from first commit to production |
| **Change Failure Rate** | Percentage of deployments that cause incidents |
| **MTTR** | Time to restore service after an incident |

Each metric returns a `level` (`elite` · `high` · `medium` · `low`) based on the [Google DORA 2023 thresholds](https://dora.dev/research/), which are fully overridable.

**Platform-agnostic** — the library defines normalized input types. Map your own data (GitHub, GitLab, Bitbucket, Jira, or anything else) to those types before calling the functions. No adapters, no platform lock-in.

**Zero dependencies · Synchronous · O(n) · Configurable labels and thresholds**

## Installation

```bash
npm install @baphy/dora
```

## Usage

### All four metrics at once

```ts
import { calcDora } from '@baphy/dora'
import type { DeploymentEvent, ChangeEvent, IncidentEvent } from '@baphy/dora'

const result = calcDora({
  deployments,  // DeploymentEvent[]
  changes,      // ChangeEvent[]
  incidents,    // IncidentEvent[]
  period: { start, end },
})

console.log(result)
// {
//   deploymentFrequency: { value: 1.4, level: 'elite', label: '1.4 deploys/day' },
//   leadTime:            { value: 3,   level: 'high',  label: '3 hours' },
//   changeFailureRate:   { value: 8.9, level: 'high',  label: '8.9%' },
//   mttr:                { value: 0.5, level: 'elite', label: '30 minutes' },
//   overall: 'high',
// }
```

Only provide the data you have — any omitted input means that metric is absent from the result:

```ts
// only deployments → only deploymentFrequency + changeFailureRate are computed
calcDora({ deployments })
```

### Individual metric functions

```ts
import { calcDeploymentFrequency, calcLeadTime, calcChangeFailureRate, calcMttr } from '@baphy/dora'

const df  = calcDeploymentFrequency(deployments, period)
const lt  = calcLeadTime(changes)
const cfr = calcChangeFailureRate(deployments)
const mtr = calcMttr(incidents)
```

## Input Types

Map your data to these normalized types before calling any function:

```ts
interface DeploymentEvent {
  deployedAt: Date
  success: boolean   // false if the deploy triggered an incident / was rolled back
}

interface ChangeEvent {
  startedAt: Date    // first commit, PR open, ticket created — whatever fits your workflow
  deployedAt: Date   // when it reached production
}

interface IncidentEvent {
  failedAt: Date
  restoredAt: Date
}

interface Period {
  start: Date
  end: Date
}
```

### Mapping from GitHub data

```ts
import { calcDora } from '@baphy/dora'
import type { DeploymentEvent } from '@baphy/dora'

// GitHub Deployments API → DeploymentEvent[]
const deployments: DeploymentEvent[] = githubDeployments.map((d) => ({
  deployedAt: new Date(d.created_at),
  success: d.statuses.some((s) => s.state === 'success'),
}))

calcDora({ deployments, period: { start, end } })
```

## API

### `calcDora(input)`

```ts
function calcDora(input: CalcDoraInput): DoraResult

interface CalcDoraInput {
  deployments?: DeploymentEvent[]
  changes?: ChangeEvent[]
  incidents?: IncidentEvent[]
  period?: Period                     // defaults to last 90 days
  thresholds?: Partial<DoraThresholds>
  labels?: CalcDoraLabels             // per-metric label formatter overrides
  aggregates?: CalcDoraAggregates     // per-metric aggregation overrides
}

interface DoraResult {
  deploymentFrequency?: DoraLevelResult
  leadTime?: DoraLevelResult
  changeFailureRate?: DoraLevelResult
  mttr?: DoraLevelResult
  overall?: DoraLevel                 // worst level among computed metrics
}
```

**Period filtering** — inside `calcDora`, deployment-based metrics (`deploymentFrequency` and `changeFailureRate`) only count deployments within `period`. The individual metric functions do not filter by period — `calcChangeFailureRate` uses every event it receives.

### Individual metric functions

```ts
function calcDeploymentFrequency(
  events: DeploymentEvent[],
  period: Period,
  options?: { thresholds?: Partial<DeploymentFrequencyThresholds>; label?: LabelFormatter }
): DoraLevelResult

function calcLeadTime(
  changes: ChangeEvent[],
  options?: { thresholds?: Partial<LeadTimeThresholds>; label?: LabelFormatter; aggregate?: AggregateMethod }
): DoraLevelResult

function calcChangeFailureRate(
  events: DeploymentEvent[],
  options?: { thresholds?: Partial<ChangeFailureRateThresholds>; label?: LabelFormatter }
): DoraLevelResult

function calcMttr(
  incidents: IncidentEvent[],
  options?: { thresholds?: Partial<MttrThresholds>; label?: LabelFormatter; aggregate?: AggregateMethod }
): DoraLevelResult
```

### Aggregation

Lead time and MTTR aggregate their series with the **mean** by default. The mean is sensitive to outliers — one week-long incident drags an otherwise-elite MTTR — so both metrics accept an `aggregate` option (the DORA research program reports percentile-based figures):

```ts
type AggregateMethod = 'mean' | 'median' | 'p90'

calcLeadTime(changes, { aggregate: 'median' })
calcMttr(incidents, { aggregate: 'p90' })

// per-metric overrides via calcDora
calcDora({ changes, incidents, aggregates: { leadTime: 'median', mttr: 'p90' } })
```

Median averages the middle pair on even-sized series; `p90` uses the nearest-rank method. Non-mean methods sort a copy of the series, so they are O(n log n) instead of O(n).

### Return type

```ts
type DoraLevel = 'elite' | 'high' | 'medium' | 'low'

interface DoraLevelResult {
  value: number    // raw computed value (deploys/day, hours, or percentage)
  level: DoraLevel
  label: string    // human-readable string produced by the formatter
}
```

**Empty-input contract** — all functions return `{ value: 0, level: 'low', label: '—' }` when given an empty array. They never throw.

## Thresholds

Default thresholds follow the [Google DORA 2023 Research Program](https://dora.dev/research/):

| Metric | Elite | High | Medium | Low |
|---|---|---|---|---|
| Deployment Frequency | ≥ 1/day | ≥ 1/week | ≥ 1/month | < 1/month |
| Lead Time for Changes | ≤ 1 hour | ≤ 1 week | ≤ 1 month | > 1 month |
| Change Failure Rate | ≤ 5% | ≤ 10% | ≤ 15% | > 15% |
| MTTR | ≤ 1 hour | ≤ 24 hours | ≤ 1 week | > 1 week |

Override any threshold globally via `calcDora({ thresholds })` or per-call via each function's `options.thresholds`:

```ts
import { mergeThresholds, DEFAULT_THRESHOLDS } from '@baphy/dora'

// partial override — unspecified fields keep the defaults
const thresholds = mergeThresholds({
  deploymentFrequency: { elite: 2, high: 0.5, medium: 0.1 },
})

calcDora({ deployments, thresholds })
```

## Configurable Labels

Each metric has a built-in English label formatter. Provide your own `LabelFormatter` to customise the output — including locale, units, or appending extra context:

```ts
type LabelFormatter = (value: number, level: DoraLevel) => string
```

**Consumer with Spanish locale:**

```ts
import { calcDeploymentFrequency } from '@baphy/dora'

const n = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })

calcDeploymentFrequency(events, period, {
  label: (v) => v >= 1
    ? `${n.format(v)} despliegues/día`
    : `${n.format(v * 7)} despliegues/semana`,
})
// → "1,4 despliegues/día"
```

**Extending the built-in formatter:**

```ts
import { calcDeploymentFrequency, labelDeploymentFrequency } from '@baphy/dora'

calcDeploymentFrequency(events, period, {
  label: (v, l) => `${labelDeploymentFrequency(v, l)} · ${l.toUpperCase()}`,
})
// → "1.4 deploys/day · ELITE"
```

**Per-metric overrides via `calcDora`:**

```ts
calcDora({
  deployments,
  labels: {
    deploymentFrequency: (v) => `${v.toFixed(2)} dep/day`,
    changeFailureRate: (v, l) => `${v.toFixed(1)}% (${l})`,
  },
})
```

The built-in default formatters are also exported for direct use:

```ts
import { labelDeploymentFrequency, labelLeadTime, labelChangeFailureRate, labelMttr } from '@baphy/dora'
```

All default formatters use `Intl.NumberFormat('en-US')` with an explicit locale — output is consistent and predictable regardless of the runtime environment.

## Performance

Benchmarked with [vitest bench](https://vitest.dev/guide/features.html#benchmarking-experimental). Each metric function is a single O(n) pass. Reproduce locally:

```bash
npm run bench
```

**`calcDeploymentFrequency`**

| Input size | Mean time |
|---|---|
| 100 events | ~0.013 ms |
| 1,000 events | ~0.12 ms |
| 10,000 events | ~1.2 ms |
| **100,000 events** | **~13 ms** |

**`calcLeadTime`**

| Input size | Mean time |
|---|---|
| 100 changes | ~0.008 ms |
| 1,000 changes | ~0.073 ms |
| 10,000 changes | ~0.73 ms |
| **100,000 changes** | **~9.1 ms** |

**`calcChangeFailureRate`**

| Input size | Mean time |
|---|---|
| 100 events | ~0.005 ms |
| 1,000 events | ~0.046 ms |
| 10,000 events | ~0.46 ms |
| **100,000 events** | **~5 ms** |

**`calcMttr`**

| Input size | Mean time |
|---|---|
| 100 incidents | ~0.007 ms |
| 1,000 incidents | ~0.071 ms |
| 10,000 incidents | ~0.71 ms |
| **100,000 incidents** | **~9.3 ms** |

**`calcDora` (all four metrics)**

| Input size (each) | Mean time |
|---|---|
| 100 | ~0.03 ms |
| 1,000 | ~0.27 ms |
| **10,000** | **~2.7 ms** |

## License

MIT © [pilmee](https://github.com/ElJijuna)
