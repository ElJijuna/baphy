<div align="center">

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Baphomet.png/200px-Baphomet.png" alt="Baphomet — baphy mascot" width="130" />

# `@baphy/npm`

**Detect whether a repository is a monorepo by analyzing its git tree**

[![npm version](https://img.shields.io/npm/v/@baphy/npm?style=flat-square&color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@baphy/npm)
[![npm downloads](https://img.shields.io/npm/dm/@baphy/npm?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/npm)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@baphy/npm?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@baphy/npm)
[![CI](https://img.shields.io/github/actions/workflow/status/ElJijuna/baphy/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/ElJijuna/baphy/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@baphy/npm?style=flat-square)](https://github.com/ElJijuna/baphy/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Overview

`@baphy/npm` receives a flat list of file paths from any git tree source and tells you:

- **`isMonoRepo`** — whether the repository is a monorepo
- **`packages`** — the list of detected packages, each with the path to its `package.json`
- **`truncated`** — whether the source truncated the tree (passed through from your input)

**Platform-agnostic** — works with GitHub, GitLab, Bitbucket, or any other source. Map your data to a `string[]` of paths before calling.

**Zero dependencies · Synchronous · O(n) · < 7ms on a 100k-entry tree**

## Installation

```bash
npm install @baphy/npm
```

## Usage

```ts
import { detectMonoRepo } from '@baphy/npm'

// Map your source data to a string[] of paths, then call detectMonoRepo.
// The second argument mirrors any truncation flag from your source (optional, defaults to false).

// GitHub example:
// GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1
const gitTree = await fetch(url, { headers }).then(r => r.json())
const result = detectMonoRepo(
  gitTree.tree.map((item: { path: string }) => item.path),
  gitTree.truncated,
)

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

### Fetching package names (GitHub example)

The `packageJsonPath` field lets you retrieve each package's metadata with a second API call:

```ts
const { packages } = detectMonoRepo(
  gitTree.tree.map((item: { path: string }) => item.path),
  gitTree.truncated,
)

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

### `detectMonoRepo(paths, truncated?)`

```ts
function detectMonoRepo(paths: string[], truncated?: boolean): MonoRepoResult
```

#### Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `paths` | `string[]` | — | Flat list of file paths from any git tree source |
| `truncated` | `boolean` | `false` | Pass through the truncation flag from your source |

#### Returns

```ts
interface MonoRepoResult {
  isMonoRepo: boolean
  packages: MonoRepoPackage[]
  /** true when the source truncated the tree — results may be incomplete */
  truncated: boolean
}

interface MonoRepoPackage {
  /** Directory path, e.g. "." or "packages/npm" */
  path: string
  /** Path to the package.json for this package */
  packageJsonPath: string
}
```

When `isMonoRepo` is `false`, `packages` still includes the root package if a root `package.json` exists:

```ts
detectMonoRepo(['package.json', 'src/index.ts'])
// {
//   isMonoRepo: false,
//   packages: [{ path: '.', packageJsonPath: 'package.json' }],
//   truncated: false
// }
```

> **When `truncated` is `true`**, the tree was cut short before all files were returned. A `false` `isMonoRepo` may not be reliable. Always check `truncated` before acting on the result.

### Types

```ts
import type { MonoRepoPackage, MonoRepoResult } from '@baphy/npm'
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
