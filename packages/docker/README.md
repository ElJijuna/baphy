<div align="center">

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Baphomet.png/200px-Baphomet.png" alt="Baphomet — baphy mascot" width="130" />

# `@baphy/docker`

**Parse Dockerfile base images from `FROM` instructions**

[![npm version](https://img.shields.io/npm/v/@baphy/docker?style=flat-square&color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@baphy/docker)
[![npm downloads](https://img.shields.io/npm/dm/@baphy/docker?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/docker)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@baphy/docker?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@baphy/docker)
[![CI](https://img.shields.io/github/actions/workflow/status/ElJijuna/baphy/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/ElJijuna/baphy/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@baphy/docker?style=flat-square)](https://github.com/ElJijuna/baphy/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Overview

`@baphy/docker` receives the full text of a Dockerfile and returns every image used by `FROM` instructions.

For each image it tells you:

- **`image`** — the exact image reference used in the Dockerfile
- **`name`** — the image name without tag or digest
- **`version`** — the effective version: tag, digest, or Docker's implicit `latest`
- **`tag`** — the tag when present
- **`digest`** — the digest when present
- **`stage`** — the multi-stage alias from `AS <name>` when present
- **`isStageReference`** — whether the `FROM` points to a previous build stage instead of an image

`ARG` defaults declared before the first `FROM` are resolved inside image references, supporting the `${NAME}`, `$NAME`, and `${NAME:-fallback}` forms. ARGs without a resolvable value are kept literal.

**Zero dependencies · Synchronous · Supports multi-stage Dockerfiles**

## Installation

```bash
npm install @baphy/docker
```

## Usage

```ts
import { parseDockerfileImages } from '@baphy/docker'

const dockerfile = `
FROM oven/bun:1-alpine AS builder

WORKDIR /app
RUN bun run ui:build

FROM oven/bun:1-alpine

WORKDIR /app
COPY --from=builder /app/src ./src
`

const images = parseDockerfileImages(dockerfile)

console.log(images)
// [
//   {
//     image: 'oven/bun:1-alpine',
//     name: 'oven/bun',
//     version: '1-alpine',
//     tag: '1-alpine',
//     digest: null,
//     stage: 'builder',
//     isStageReference: false,
//   },
//   {
//     image: 'oven/bun:1-alpine',
//     name: 'oven/bun',
//     version: '1-alpine',
//     tag: '1-alpine',
//     digest: null,
//     stage: null,
//     isStageReference: false,
//   },
// ]
```

### Reading from disk

```ts
import { readFile } from 'node:fs/promises'
import { parseDockerfileImages } from '@baphy/docker'

const dockerfile = await readFile('Dockerfile', 'utf8')
const images = parseDockerfileImages(dockerfile)
```

## API

### `parseDockerfileImages(content)`

```ts
function parseDockerfileImages(content: string): DockerImageReference[]
```

#### Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `content` | `string` | Full Dockerfile contents |

#### Returns

```ts
interface DockerImageReference {
  /** Image reference as it appears after FROM options, with ARGs resolved when possible. */
  image: string
  /** Image name without tag or digest. */
  name: string
  /** Effective version: tag, digest, or Docker's implicit "latest". */
  version: string
  /** Tag suffix from the image reference, or null when no tag is present. */
  tag: string | null
  /** Digest suffix from the image reference, or null when no digest is present. */
  digest: string | null
  /** Stage alias from "AS <name>", when present. */
  stage: string | null
  /** True when the FROM references a previous build stage instead of an image. */
  isStageReference: boolean
}
```

### Supported references

| Dockerfile line | `name` | `version` |
| --- | --- | --- |
| `FROM node:20-alpine` | `node` | `20-alpine` |
| `FROM alpine` | `alpine` | `latest` |
| `FROM --platform=linux/amd64 node:22` | `node` | `22` |
| `FROM localhost:5000/team/api:2.4.1` | `localhost:5000/team/api` | `2.4.1` |
| `FROM gcr.io/distroless/nodejs@sha256:abc123` | `gcr.io/distroless/nodejs` | `sha256:abc123` |
| `ARG TAG=20` + `FROM node:${TAG}` | `node` | `20` |
| `FROM ${BASE_IMAGE:-alpine}` | `alpine` | `latest` |

### Stage references

When a `FROM` names a previous stage instead of an image, the entry is flagged so you can filter it out of image inventories:

```ts
parseDockerfileImages(`
FROM node:20 AS builder
FROM builder
`)
// [ { image: 'node:20', ..., stage: 'builder', isStageReference: false },
//   { image: 'builder', ..., isStageReference: true } ]
```

## Notes

This parser is intentionally small and focused on image extraction. It ignores non-`FROM` instructions, comments, and `COPY --from=...` stage references. Only `ARG` defaults declared before the first `FROM` participate in resolution — build-time overrides are unknowable from the file alone.

## License

MIT © [pilmee](https://github.com/ElJijuna)
