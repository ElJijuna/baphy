import type {
  ChangeEvent,
  DeploymentEvent,
  DoraLevel,
  DoraResult,
  DoraThresholds,
  IncidentEvent,
  LabelFormatter,
  Period,
} from './types.js'
import { calcDeploymentFrequency } from './metrics/deployment-frequency.js'
import { calcLeadTime } from './metrics/lead-time.js'
import { calcChangeFailureRate } from './metrics/change-failure-rate.js'
import { calcMttr } from './metrics/mttr.js'

export interface CalcDoraLabels {
  deploymentFrequency?: LabelFormatter
  leadTime?: LabelFormatter
  changeFailureRate?: LabelFormatter
  mttr?: LabelFormatter
}

export interface CalcDoraInput {
  deployments?: DeploymentEvent[]
  changes?: ChangeEvent[]
  incidents?: IncidentEvent[]
  period?: Period
  thresholds?: Partial<DoraThresholds>
  labels?: CalcDoraLabels
}

const LEVEL_RANK: Record<DoraLevel, number> = {
  elite: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function calcDora(input: CalcDoraInput): DoraResult {
  const period: Period = input.period ?? {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    end: new Date(),
  }

  const result: DoraResult = {}
  const levels: DoraLevel[] = []

  if (input.deployments !== undefined) {
    const df = calcDeploymentFrequency(input.deployments, period, {
      thresholds: input.thresholds?.deploymentFrequency,
      label: input.labels?.deploymentFrequency,
    })
    result.deploymentFrequency = df
    levels.push(df.level)

    const cfr = calcChangeFailureRate(input.deployments, {
      thresholds: input.thresholds?.changeFailureRate,
      label: input.labels?.changeFailureRate,
    })
    result.changeFailureRate = cfr
    levels.push(cfr.level)
  }

  if (input.changes !== undefined) {
    const lt = calcLeadTime(input.changes, {
      thresholds: input.thresholds?.leadTime,
      label: input.labels?.leadTime,
    })
    result.leadTime = lt
    levels.push(lt.level)
  }

  if (input.incidents !== undefined) {
    const mttr = calcMttr(input.incidents, {
      thresholds: input.thresholds?.mttr,
      label: input.labels?.mttr,
    })
    result.mttr = mttr
    levels.push(mttr.level)
  }

  if (levels.length > 0) {
    result.overall = levels.reduce((worst, current) =>
      LEVEL_RANK[current] > LEVEL_RANK[worst] ? current : worst,
    )
  }

  return result
}
