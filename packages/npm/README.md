<div align="center">

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Baphomet.png/200px-Baphomet.png" alt="Baphomet — baphy mascot" width="130" />

# `@baphy/npm`

**Detect whether a GitHub repository is a monorepo by analyzing its git tree**

[![npm version](https://img.shields.io/npm/v/@baphy/npm?style=flat-square&color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@baphy/npm)
[![npm downloads](https://img.shields.io/npm/dm/@baphy/npm?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/npm)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@baphy/npm?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@baphy/npm)
[![CI](https://img.shields.io/github/actions/workflow/status/ElJijuna/baphy/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/ElJijuna/baphy/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@baphy/npm?style=flat-square)](https://github.com/ElJijuna/baphy/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Overview

`@baphy/npm` receives the response from the **[GitHub API git tree endpoint](https://docs.github.com/en/rest/git/trees)** and tells you:

- **`isMonoRepo`** — whether the repository is a monorepo
- **`packages`** — the list of workspace packages found, each with the path to its `package.json` so you can fetch it separately via the GitHub API to discover its `name`, `version`, and `private` flag
- **`truncated`** — whether GitHub truncated the tree at 100,000 entries

**Zero dependencies · Synchronous · O(n) · < 7ms on a 100k-entry tree**

## Installation

```bash
npm install @baphy/npm
```

## Usage

```ts
import { detectMonoRepo } from '@baphy/npm'

// Fetch the git tree from the GitHub API (recursive=1 to get all files)
// GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1
const response = await fetch(
  'https://api.github.com/repos/vercel/turborepo/git/trees/HEAD?recursive=1',
  { headers: { Authorization: `Bearer ${token}` } }
)
const gitTree = await response.json()

const result = detectMonoRepo(gitTree)

console.log(result)
// {
//   isMonoRepo: true,
//   packages: [
//     { path: 'packages/turbo',        packageJsonPath: 'packages/turbo/package.json' },
//     { path: 'packages/create-turbo', packageJsonPath: 'packages/create-turbo/package.json' },
//     ...
//   ],
//   truncated: false
// }
```

### Fetching package names

The `packageJsonPath` field lets you retrieve each package's metadata with a second GitHub API call:

```ts
import { detectMonoRepo } from '@baphy/npm'

const { packages } = detectMonoRepo(gitTree)

const details = await Promise.all(
  packages.map(async (pkg) => {
    const res = await fetch(
      `https://api.github.com/repos/{owner}/{repo}/contents/${pkg.packageJsonPath}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const { content } = await res.json()
    const { name, version, private: isPrivate } = JSON.parse(
      Buffer.from(content, 'base64').toString()
    )
    return { ...pkg, name, version, isPrivate }
  })
)
```

## API

### `detectMonoRepo(gitTree)`

```ts
function detectMonoRepo(gitTree: GitTree): MonoRepoResult
```

#### Parameters

| Parameter | Type | Description |
|---|---|---|
| `gitTree` | `GitTree` | Response from `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` |

#### Returns

```ts
interface MonoRepoResult {
  isMonoRepo: boolean
  packages: MonoRepoPackage[]
  /** true when GitHub truncated the tree at 100,000 entries — results may be incomplete */
  truncated: boolean
}

interface MonoRepoPackage {
  /** Directory path, e.g. "packages/npm" */
  path: string
  /** Path to package.json — fetch via GitHub API to read name, version, private flag */
  packageJsonPath: string
}
```

> **When `truncated` is `true`**, GitHub stopped returning results before scanning the full tree. A `false` `isMonoRepo` may not be reliable. Always check `truncated` before acting on the result.

### Types

All TypeScript types are exported and available for consumers:

```ts
import type { GitTree, GitTreeItem, MonoRepoPackage, MonoRepoResult } from '@baphy/npm'
```

## Detection Strategy

| Tool | Indicator file(s) | Signal |
|---|---|---|
| pnpm workspaces | `pnpm-workspace.yaml` · `pnpm-workspace.yml` | **Definitive** |
| Lerna | `lerna.json` | **Definitive** |
| Nx | `nx.json` | **Definitive** |
| Rush | `rush.json` | **Definitive** |
| Moon | `.moon/workspace.yml` | **Definitive** |
| npm / yarn workspaces | *(inferred — content not readable from tree)* | **Structural** |
| Turborepo | `turbo.json` | **Soft** |

**Definitive** — file presence alone confirms a monorepo, even if no packages are discovered.

**Soft** — `turbo.json` can exist in single-package repos; treated as definitive only when workspace packages are also found.

**Structural** — when none of the config files above are present but more than one `package.json` is found exactly one level deep inside `packages/`, `apps/`, `libs/`, `services/`, `tools/`, or `plugins/`, a monorepo is inferred (the `workspaces` field in the root `package.json` cannot be read from the git tree).

## Performance

Benchmarked with [vitest bench](https://vitest.dev/guide/features.html#benchmarking-experimental) on a 100,000-entry tree (GitHub's maximum non-truncated response):

| Tree size | Mean time |
|---|---|
| 100 items | ~0.005 ms |
| 1,000 items | ~0.056 ms |
| 10,000 items | ~0.61 ms |
| **100,000 items** | **~6.7 ms** |

The single-pass O(n) algorithm scales linearly with tree size. Reproduce locally:

```bash
npm run bench
```

## License

MIT © [pilmee](https://github.com/ElJijuna)
