import { describe, expect, it } from 'vitest'
import { detectMonoRepo } from './index.js'
import type { GitTree } from './index.js'

function tree(paths: string[], truncated = false): GitTree {
  return { tree: paths.map((path) => ({ path })), truncated }
}

// ─── Definitive indicators ─────────────────────────────────────────────────

describe('definitive monorepo indicators', () => {
  it.each([
    'pnpm-workspace.yaml',
    'pnpm-workspace.yml',
    'lerna.json',
    'nx.json',
    'rush.json',
    '.moon/workspace.yml',
  ])('detects %s at root as monorepo', (indicator) => {
    const result = detectMonoRepo(tree([indicator, 'package.json', 'src/index.ts']))
    expect(result.isMonoRepo).toBe(true)
    expect(result.truncated).toBe(false)
  })

  it('returns empty packages when indicator present but no workspace packages found', () => {
    const result = detectMonoRepo(tree(['pnpm-workspace.yaml', 'package.json']))
    expect(result.isMonoRepo).toBe(true)
    expect(result.packages).toEqual([])
  })

  it('returns packages when indicator and workspace packages both present', () => {
    const result = detectMonoRepo(
      tree(['pnpm-workspace.yaml', 'packages/a/package.json', 'packages/b/package.json']),
    )
    expect(result.isMonoRepo).toBe(true)
    expect(result.packages).toHaveLength(2)
    expect(result.packages[0]).toEqual({ path: 'packages/a', packageJsonPath: 'packages/a/package.json' })
    expect(result.packages[1]).toEqual({ path: 'packages/b', packageJsonPath: 'packages/b/package.json' })
  })

  it('all definitive indicators simultaneously → monorepo', () => {
    const result = detectMonoRepo(
      tree(['pnpm-workspace.yaml', 'lerna.json', 'nx.json', 'rush.json']),
    )
    expect(result.isMonoRepo).toBe(true)
  })
})

// ─── Soft indicators (turbo.json) ──────────────────────────────────────────

describe('turbo.json soft indicator', () => {
  it('turbo.json alone → not a monorepo', () => {
    const result = detectMonoRepo(tree(['turbo.json', 'package.json', 'src/index.ts']))
    expect(result.isMonoRepo).toBe(false)
    expect(result.packages).toEqual([])
  })

  it('turbo.json + one workspace package → monorepo', () => {
    const result = detectMonoRepo(tree(['turbo.json', 'packages/a/package.json']))
    expect(result.isMonoRepo).toBe(true)
    expect(result.packages).toHaveLength(1)
  })

  it('turbo.json + two workspace packages → monorepo', () => {
    const result = detectMonoRepo(
      tree(['turbo.json', 'packages/a/package.json', 'packages/b/package.json']),
    )
    expect(result.isMonoRepo).toBe(true)
    expect(result.packages).toHaveLength(2)
  })

  it('turbo.json + apps/ packages → monorepo', () => {
    const result = detectMonoRepo(
      tree(['turbo.json', 'apps/web/package.json', 'packages/ui/package.json']),
    )
    expect(result.isMonoRepo).toBe(true)
    expect(result.packages).toHaveLength(2)
  })
})

// ─── Package discovery (no indicator files) ────────────────────────────────

describe('package discovery without indicator files', () => {
  it('zero workspace packages → not a monorepo', () => {
    const result = detectMonoRepo(tree(['package.json', 'src/index.ts', 'README.md']))
    expect(result.isMonoRepo).toBe(false)
    expect(result.packages).toEqual([])
  })

  it('exactly one workspace package → not a monorepo', () => {
    const result = detectMonoRepo(tree(['packages/a/package.json', 'src/index.ts']))
    expect(result.isMonoRepo).toBe(false)
    expect(result.packages).toEqual([])
  })

  it('two workspace packages → inferred monorepo (npm/yarn workspaces)', () => {
    const result = detectMonoRepo(
      tree(['package.json', 'packages/a/package.json', 'packages/b/package.json']),
    )
    expect(result.isMonoRepo).toBe(true)
    expect(result.packages).toHaveLength(2)
  })

  it.each(['packages', 'apps', 'libs', 'services', 'tools', 'plugins'])(
    'detects packages in %s/ directory',
    (dir) => {
      const result = detectMonoRepo(tree([`${dir}/a/package.json`, `${dir}/b/package.json`]))
      expect(result.isMonoRepo).toBe(true)
      expect(result.packages[0].path).toBe(`${dir}/a`)
      expect(result.packages[1].path).toBe(`${dir}/b`)
    },
  )

  it('root package.json (depth 1) is not counted as workspace package', () => {
    const result = detectMonoRepo(tree(['package.json']))
    expect(result.isMonoRepo).toBe(false)
  })

  it('depth-3+ package.json is not counted as workspace package', () => {
    const result = detectMonoRepo(
      tree(['packages/scope/name/package.json', 'packages/other/deep/package.json']),
    )
    expect(result.isMonoRepo).toBe(false)
  })

  it('package.json in non-workspace dir at depth 2 is not counted', () => {
    const result = detectMonoRepo(
      tree(['scripts/helper/package.json', 'examples/demo/package.json']),
    )
    expect(result.isMonoRepo).toBe(false)
  })

  it('mixes valid and invalid paths — only valid ones count', () => {
    const result = detectMonoRepo(
      tree([
        'packages/a/package.json',   // valid
        'examples/b/package.json',   // non-workspace dir — ignored
        'packages/c/src/package.json', // depth 3 — ignored
        'package.json',               // root — ignored
      ]),
    )
    // Only 1 valid package, not enough to infer monorepo
    expect(result.isMonoRepo).toBe(false)
  })
})

// ─── This repo itself ──────────────────────────────────────────────────────

describe('baphy repo fixture', () => {
  it('detects baphy itself as a monorepo', () => {
    const result = detectMonoRepo(
      tree([
        'package.json',
        'turbo.json',
        'tsconfig.base.json',
        'packages/npm/package.json',
        'packages/npm/src/index.ts',
        'packages/npm/src/index.test.ts',
        'packages/npm/tsconfig.json',
        '.changeset/config.json',
      ]),
    )
    // turbo.json + 1 workspace package → soft indicator confirmed = monorepo
    expect(result.isMonoRepo).toBe(true)
    expect(result.packages).toHaveLength(1)
    expect(result.packages[0]).toEqual({
      path: 'packages/npm',
      packageJsonPath: 'packages/npm/package.json',
    })
  })

  it('detects baphy as monorepo once a second package is added', () => {
    const result = detectMonoRepo(
      tree([
        'package.json',
        'turbo.json',
        'packages/npm/package.json',
        'packages/git/package.json',
      ]),
    )
    expect(result.isMonoRepo).toBe(true)
    expect(result.packages).toHaveLength(2)
  })
})

// ─── Edge cases ────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('empty tree → not a monorepo', () => {
    const result = detectMonoRepo({ tree: [] })
    expect(result.isMonoRepo).toBe(false)
    expect(result.packages).toEqual([])
    expect(result.truncated).toBe(false)
  })

  it('truncated: true is surfaced in result', () => {
    const result = detectMonoRepo(tree([], true))
    expect(result.truncated).toBe(true)
  })

  it('truncated tree with definitive indicator → isMonoRepo: true, truncated: true', () => {
    const result = detectMonoRepo(tree(['pnpm-workspace.yaml'], true))
    expect(result.isMonoRepo).toBe(true)
    expect(result.truncated).toBe(true)
  })

  it('truncated tree with no indicators → isMonoRepo: false, truncated: true', () => {
    const result = detectMonoRepo(tree(['src/index.ts', 'README.md'], true))
    expect(result.isMonoRepo).toBe(false)
    expect(result.truncated).toBe(true)
  })

  it('tree items with type field do not affect detection', () => {
    const result = detectMonoRepo({
      tree: [
        { path: 'packages', type: 'tree' },
        { path: 'packages/a', type: 'tree' },
        { path: 'packages/a/package.json', type: 'blob' },
        { path: 'packages/b', type: 'tree' },
        { path: 'packages/b/package.json', type: 'blob' },
      ],
    })
    expect(result.isMonoRepo).toBe(true)
    expect(result.packages).toHaveLength(2)
  })

  it('gitTree with no truncated field defaults to false', () => {
    const result = detectMonoRepo({ tree: [] })
    expect(result.truncated).toBe(false)
  })
})

// ─── Non-monorepo repositories ─────────────────────────────────────────────

describe('non-monorepo repositories', () => {
  it('plain Node.js single-package project', () => {
    const result = detectMonoRepo(
      tree([
        'package.json',
        'src/index.ts',
        'src/utils.ts',
        'test/index.test.ts',
        'README.md',
        '.gitignore',
        'tsconfig.json',
      ]),
    )
    expect(result.isMonoRepo).toBe(false)
    expect(result.packages).toEqual([])
  })

  it('Python project with no package.json files', () => {
    const result = detectMonoRepo(
      tree([
        'setup.py',
        'pyproject.toml',
        'requirements.txt',
        'src/main.py',
        'tests/test_main.py',
        'README.md',
      ]),
    )
    expect(result.isMonoRepo).toBe(false)
    expect(result.packages).toEqual([])
  })

  it('project with package.json only in test/ and example/ dirs (non-workspace dirs)', () => {
    const result = detectMonoRepo(
      tree([
        'package.json',
        'src/index.ts',
        'test/fixtures/package.json',
        'examples/demo/package.json',
      ]),
    )
    expect(result.isMonoRepo).toBe(false)
  })
})
