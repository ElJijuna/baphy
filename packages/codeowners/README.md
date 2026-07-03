<div align="center">

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Baphomet.png/200px-Baphomet.png" alt="Baphomet — baphy mascot" width="130" />

# `@baphy/codeowners`

**Parse CODEOWNERS files and resolve which rule owns a given path**

[![npm version](https://img.shields.io/npm/v/@baphy/codeowners?style=flat-square&color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@baphy/codeowners)
[![npm downloads](https://img.shields.io/npm/dm/@baphy/codeowners?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/codeowners)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@baphy/codeowners?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@baphy/codeowners)
[![CI](https://img.shields.io/github/actions/workflow/status/ElJijuna/baphy/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/ElJijuna/baphy/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@baphy/codeowners?style=flat-square)](https://github.com/ElJijuna/baphy/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Overview

`@baphy/codeowners` receives the full text of a CODEOWNERS file and gives you:

- **`parseCodeowners`** — the ordered list of rules: pattern, owners, line number, and GitLab-style section
- **`matchCodeowners`** — which rule owns a given path, using GitHub's last-match-wins semantics

**Zero dependencies · Synchronous · GitHub and GitLab syntax**

## Installation

```bash
npm install @baphy/codeowners
```

## Usage

```ts
import { parseCodeowners, matchCodeowners } from '@baphy/codeowners'

const rules = parseCodeowners(`
*       @global-owner1 @global-owner2
*.js    @js-owner
/build/logs/ @doctocat
docs/*  @octocat
`)

matchCodeowners(rules, 'src/main.js')
// { pattern: '*.js', owners: ['@js-owner'], lineNumber: 3, section: null }

matchCodeowners(rules, 'build/logs/output.txt')
// { pattern: '/build/logs/', owners: ['@doctocat'], lineNumber: 4, section: null }

matchCodeowners(rules, 'LICENSE')
// { pattern: '*', owners: ['@global-owner1', '@global-owner2'], lineNumber: 2, section: null }
```

### Reading from disk

```ts
import { readFile } from 'node:fs/promises'
import { parseCodeowners } from '@baphy/codeowners'

const rules = parseCodeowners(await readFile('.github/CODEOWNERS', 'utf8'))
```

## API

### `parseCodeowners(content)`

```ts
function parseCodeowners(content: string): CodeownersRule[]
```

Returns rules in file order — order matters, because the **last** matching rule wins.

```ts
interface CodeownersRule {
  /** Path pattern exactly as it appears in the file. */
  pattern: string
  /** Owners assigned to the pattern: @user, @org/team, or email. Empty means unowned. */
  owners: string[]
  /** 1-indexed line number of the rule in the file. */
  lineNumber: number
  /** GitLab-style section the rule belongs to, or null in plain GitHub files. */
  section: string | null
}
```

GitLab-style `[Section]` headers are supported: rules below a header carry its name in `section`, and rules without owners inherit the section's default owners when the header declares any.

### `matchCodeowners(rules, filePath)`

```ts
function matchCodeowners(rules: CodeownersRule[], filePath: string): CodeownersRule | null
```

Walks the rules from last to first and returns the first match — GitHub's last-match-wins semantics. Returns `null` when no pattern matches. The winning rule may have an empty `owners` array; on GitHub that means the path is deliberately unowned.

### Pattern semantics

| Pattern | Matches |
|---|---|
| `*` | every file |
| `*.js` | any `.js` file, at any depth |
| `/build/logs/` | everything under `build/logs` at the repo root |
| `docs/*` | files directly inside any root `docs/` — **not** nested ones |
| `apps/` | everything under any directory named `apps`, at any depth |
| `**/logs` | everything under any directory named `logs` |
| `apps/**/config.yml` | `config.yml` anywhere under `apps/` |
| `docs/my\ file.md` | patterns with escaped spaces |

Follows gitignore-style rules with GitHub's documented deviation: a trailing wildcard segment (`docs/*`) matches direct children only.

## Performance

Benchmarked with [vitest bench](https://vitest.dev/guide/features.html#benchmarking-experimental). Compiled patterns are cached, so repeated `matchCodeowners` calls over the same rule set only pay the regex build once. Reproduce locally:

```bash
npm run bench
```

## License

MIT © [pilmee](https://github.com/ElJijuna)
