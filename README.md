<div align="center">

<img src="https://translate.google.com/website?sl=en&tl=es&hl=es&client=srp&u=https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Baphomet_by_%25C3%2589liphas_L%25C3%25A9vi.jpg/500px-Baphomet_by_%25C3%2589liphas_L%25C3%25A9vi.jpg" alt="Baphomet — baphy mascot" width="130" />

# baphy

**Small, zero-dependency TypeScript libraries for parsing and analyzing repository metadata**

[![CI](https://img.shields.io/github/actions/workflow/status/ElJijuna/baphy/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/ElJijuna/baphy/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/ElJijuna/baphy?style=flat-square)](https://github.com/ElJijuna/baphy/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Packages

| Package | Description | Version |
| --- | --- | --- |
| [`@baphy/npm`](packages/npm) | Detect whether a repository is a monorepo by analyzing its git tree | [![npm](https://img.shields.io/npm/v/@baphy/npm?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/npm) |
| [`@baphy/dora`](packages/dora) | DORA metrics calculator — Deployment Frequency, Lead Time, Change Failure Rate, MTTR | [![npm](https://img.shields.io/npm/v/@baphy/dora?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/dora) |
| [`@baphy/docker`](packages/docker) | Parse Dockerfile base images from `FROM` instructions | [![npm](https://img.shields.io/npm/v/@baphy/docker?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/docker) |
| [`@baphy/gh`](packages/gh) | Parse GitHub README metadata such as badges, title, links, and sections | [![npm](https://img.shields.io/npm/v/@baphy/gh?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/gh) |
| [`@baphy/codeowners`](packages/codeowners) | Parse CODEOWNERS files and resolve which rule owns a given path | [![npm](https://img.shields.io/npm/v/@baphy/codeowners?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@baphy/codeowners) |

Every package is **zero-dependency, synchronous, platform-agnostic**, and ships dual ESM/CJS builds with strict TypeScript types.

## Development

npm workspaces + [Turborepo](https://turbo.build/). Node >= 18.

```bash
npm ci             # install
npm run build      # build all packages (tsup)
npm run typecheck  # tsc --noEmit per package
npm run test       # vitest with coverage per package
npm run bench      # vitest bench
npm run check      # eslint + biome + markdownlint + stylelint
```

Scope any task to one package:

```bash
npx turbo run test --filter=@baphy/dora
```

## Commits and releases

Conventional commits with the package name as scope drive **independent per-package releases** via semantic-release:

```text
fix(dora): guard zero-length periods     → patch release of @baphy/dora
feat(codeowners): add section support    → minor release of @baphy/codeowners
chore: update CI                         → no release
```

On every push to `main`, the release workflow runs once per package; only commits whose scope matches that package trigger and populate its release. Tags follow the `@baphy/<pkg>@<version>` format, and each package keeps its own CHANGELOG.

## License

MIT © [pilmee](https://github.com/ElJijuna)
