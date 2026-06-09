<div align="center">

# `@baphy/gh`

**Parse GitHub README metadata from markdown text**

[![npm version](https://img.shields.io/npm/v/@baphy/gh?style=flat-square&color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@baphy/gh)
[![npm downloads](https://img.shields.io/npm/dm/@baphy/gh?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/gh)
[![CI](https://img.shields.io/github/actions/workflow/status/ElJijuna/baphy/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/ElJijuna/baphy/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@baphy/gh?style=flat-square)](https://github.com/ElJijuna/baphy/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Overview

`@baphy/gh` receives full README markdown and returns the repo-facing metadata GitHub pages usually surface: title, short description, badges, links, sections, and table-of-contents slugs.

**Zero dependencies · Synchronous · Fenced-code aware**

## Installation

```bash
npm install @baphy/gh
```

## Usage

```ts
import { parseReadme } from '@baphy/gh'

const readme = `
# Project Atlas

![license](https://img.shields.io/badge/license-MIT-green)

## Installation

npm install project-atlas
`

const info = parseReadme(readme)

console.log(info)
// {
//   title: 'Project Atlas',
//   description: null,
//   badges: [
//     {
//       alt: 'license',
//       image: 'https://img.shields.io/badge/license-MIT-green',
//       target: null,
//       label: 'license',
//       subject: 'license',
//       service: 'shields.io',
//     },
//   ],
//   links: [],
//   sections: [{ depth: 2, title: 'Installation', slug: 'installation' }],
//   tableOfContents: ['installation'],
// }
```

## API

### `parseReadme(content)`

```ts
function parseReadme(content: string): ReadmeInfo
```

#### Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `content` | `string` | Full README markdown contents |

#### Returns

```ts
interface ReadmeInfo {
  title: string | null
  description: string | null
  badges: ReadmeBadge[]
  links: ReadmeLink[]
  sections: ReadmeSection[]
  tableOfContents: string[]
}
```

## Notes

This is a metadata parser, not a full Markdown renderer. It intentionally ignores fenced code blocks so example headings and links do not leak into README metadata.

## License

MIT © [pilmee](https://github.com/ElJijuna)
