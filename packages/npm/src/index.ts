export interface MonoRepoPackage {
  /** Directory path, e.g. "." or "packages/npm" */
  path: string;
  /** Path to package.json — fetch via GitHub API to read name and private flag */
  packageJsonPath: string;
}

export interface MonoRepoResult {
  isMonoRepo: boolean;
  packages: MonoRepoPackage[];
  /** When true, the source tree was truncated — results may be incomplete. */
  truncated: boolean;
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
]);
/**
 * turbo.json is a soft signal: Turborepo can be used in single-package repos.
 * It is treated as definitive only when workspace packages are also found.
 */
const SOFT_INDICATORS = new Set(['turbo.json']);
/**
 * Directory names where workspace packages live exactly one level deep.
 * A package.json at depth 2 (e.g. "packages/foo/package.json") signals a package.
 */
const WORKSPACE_DIRS = new Set(['packages', 'apps', 'libs', 'services', 'tools', 'plugins']);

export function detectMonoRepo(paths: string[], truncated = false): MonoRepoResult {
  let hasDefinitive = false;
  let hasSoft = false;
  let hasRootPackageJson = false;

  const workspacePackages: MonoRepoPackage[] = [];

  for (const path of paths) {
    if (DEFINITIVE_INDICATORS.has(path)) {
      hasDefinitive = true;
    } else if (SOFT_INDICATORS.has(path)) {
      hasSoft = true;
    } else if (path.endsWith('/package.json')) {
      const parts = path.split('/');

      // Depth-2 path: ["workspaceDir", "packageName", "package.json"] — exactly 3 parts
      if (parts.length === 3 && WORKSPACE_DIRS.has(parts[0])) {
        workspacePackages.push({
          path: `${parts[0]}/${parts[1]}`,
          packageJsonPath: path,
        });
      }
    } else if (path === 'package.json') {
      hasRootPackageJson = true;
    }
  }

  const isMonoRepo =
    hasDefinitive || (hasSoft && workspacePackages.length > 0) || workspacePackages.length > 1;
  const packages = isMonoRepo
    ? workspacePackages
    : hasRootPackageJson
      ? [{ path: '.', packageJsonPath: 'package.json' }]
      : [];

  return {
    isMonoRepo,
    packages,
    truncated,
  };
}
