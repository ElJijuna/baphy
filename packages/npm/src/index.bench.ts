import { bench, describe } from 'vitest'
import { detectMonoRepo } from './index.js'

function makeTree(
  size: number,
  options: { indicator?: boolean; packages?: number } = {},
): string[] {
  const paths: string[] = []

  if (options.indicator) {
    paths.push('pnpm-workspace.yaml')
  }

  const pkgCount = options.packages ?? 0
  for (let i = 0; i < pkgCount; i++) {
    paths.push(`packages/pkg-${i}/package.json`)
  }

  const remaining = Math.max(0, size - paths.length)
  for (let i = 0; i < remaining; i++) {
    paths.push(`src/deeply/nested/file-${i}.ts`)
  }

  return paths
}

describe('detectMonoRepo — tree size scaling (O(n) validation)', () => {
  bench('100 items, no monorepo', () => {
    detectMonoRepo(makeTree(100))
  })

  bench('1,000 items, no monorepo', () => {
    detectMonoRepo(makeTree(1_000))
  })

  bench('10,000 items, no monorepo', () => {
    detectMonoRepo(makeTree(10_000))
  })

  bench('100,000 items, no monorepo (GitHub tree max)', () => {
    detectMonoRepo(makeTree(100_000))
  })
})

describe('detectMonoRepo — detection scenarios at scale', () => {
  bench('indicator at position 0 in 100k tree', () => {
    detectMonoRepo(makeTree(100_000, { indicator: true }))
  })

  bench('10 workspace packages in 100k tree', () => {
    detectMonoRepo(makeTree(100_000, { packages: 10 }))
  })

  bench('indicator + 10 packages in 100k tree', () => {
    detectMonoRepo(makeTree(100_000, { indicator: true, packages: 10 }))
  })

  bench('empty tree', () => {
    detectMonoRepo([])
  })
})
