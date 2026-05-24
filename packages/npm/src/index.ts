export interface GitTreeItem {
  path: string
  mode?: string
  type?: 'blob' | 'tree'
  sha?: string
  size?: number
  url?: string
}

export interface GitTree {
  sha?: string
  url?: string
  tree: GitTreeItem[]
  truncated?: boolean
}

export interface MonoRepoPackage {
  /** Directory path, e.g. "packages/npm" */
  path: string
  /** Path to package.json — fetch via GitHub API to read name and private flag */
  packageJsonPath: string
}

export interface MonoRepoResult {
  isMonoRepo: boolean
  packages: MonoRepoPackage[]
  /** Mirrors gitTree.truncated. When true, results may be incomplete. */
  truncated: boolean
}

/**
 * Root-level files whose presence is a definitive monorepo signal.
 * Each entry corresponds to a supported monorepo tool:
 * - pnpm-workspace.yaml / .yml  → pnpm workspaces
 * - lerna.json                   → Lerna
 * - nx.json                      → Nx
 * - rush.json                    → Rush
 * - .moon/workspace.yml          → Moon
 */
const DEFINITIVE_INDICATORS = new Set([
  'pnpm-workspace.yaml',
  'pnpm-workspace.yml',
  'lerna.json',
  'nx.json',
  'rush.json',
  '.moon/workspace.yml',
])

/**
 * turbo.json is a soft signal: Turborepo can be used in single-package repos.
 * It is treated as definitive only when workspace packages are also found.
 */
const SOFT_INDICATORS = new Set(['turbo.json'])

/**
 * Directory names where workspace packages live exactly one level deep.
 * A package.json at depth 2 (e.g. "packages/foo/package.json") signals a package.
 */
const WORKSPACE_DIRS = new Set([
  'packages',
  'apps',
  'libs',
  'services',
  'tools',
  'plugins',
])

/**
 * Analyzes a GitHub API git tree response to detect whether a repository is a monorepo.
 *
 * Detection strategy:
 * - Presence of known config files (pnpm-workspace.yaml, lerna.json, nx.json, rush.json,
 *   .moon/workspace.yml) is a definitive monorepo signal.
 * - turbo.json alone is a soft signal; combined with discovered workspace packages it confirms
 *   a monorepo.
 * - When no config files are found, more than one package.json at depth 2 in a known workspace
 *   directory infers a monorepo (npm/yarn workspaces declared in root package.json, whose
 *   content cannot be read from the tree).
 *
 * Note: when gitTree.truncated is true, GitHub stopped returning results at 100,000 entries.
 * The returned result reflects only the visible portion of the tree; check `truncated` before
 * acting on a false isMonoRepo.
 */
export function detectMonoRepo(gitTree: GitTree): MonoRepoResult {
  let hasDefinitive = false
  let hasSoft = false
  const workspacePackages: MonoRepoPackage[] = []

  for (const item of gitTree.tree) {
    const { path } = item

    if (DEFINITIVE_INDICATORS.has(path)) {
      hasDefinitive = true
    } else if (SOFT_INDICATORS.has(path)) {
      hasSoft = true
    } else if (path.endsWith('/package.json')) {
      const parts = path.split('/')
      // Depth-2 path: ["workspaceDir", "packageName", "package.json"] — exactly 3 parts
      if (parts.length === 3 && WORKSPACE_DIRS.has(parts[0])) {
        workspacePackages.push({
          path: `${parts[0]}/${parts[1]}`,
          packageJsonPath: path,
        })
      }
    }
  }

  const isMonoRepo =
    hasDefinitive ||
    (hasSoft && workspacePackages.length > 0) ||
    workspacePackages.length > 1

  return {
    isMonoRepo,
    packages: isMonoRepo ? workspacePackages : [],
    truncated: gitTree.truncated ?? false,
  }
}
