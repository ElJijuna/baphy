import { describe, expect, it } from 'vitest';
import { parseReadme } from './index.js';

describe('parseReadme', () => {
  it('extracts title, lead text, badges, links, and sections from a GitHub README', () => {
    const result = parseReadme(`
<div align="center">

# \`@baphy/docker\`

**Parse Dockerfile base images from \`FROM\` instructions**

[![npm version](https://img.shields.io/npm/v/@baphy/docker?style=flat-square)](https://www.npmjs.com/package/@baphy/docker)
[![CI](https://img.shields.io/github/actions/workflow/status/ElJijuna/baphy/ci.yml?branch=main&label=CI)](https://github.com/ElJijuna/baphy/actions/workflows/ci.yml)

</div>

---

## Installation

\`\`\`bash
npm install @baphy/docker
\`\`\`

## Usage

[Read docs](https://github.com/ElJijuna/baphy/tree/main/packages/docker)
`);

    expect(result).toEqual({
      title: '@baphy/docker',
      description: 'Parse Dockerfile base images from `FROM` instructions',
      badges: [
        {
          alt: 'npm version',
          image: 'https://img.shields.io/npm/v/@baphy/docker?style=flat-square',
          target: 'https://www.npmjs.com/package/@baphy/docker',
          label: 'npm version',
          subject: 'npm',
          service: 'shields.io',
        },
        {
          alt: 'CI',
          image:
            'https://img.shields.io/github/actions/workflow/status/ElJijuna/baphy/ci.yml?branch=main&label=CI',
          target: 'https://github.com/ElJijuna/baphy/actions/workflows/ci.yml',
          label: 'CI',
          subject: 'github actions workflow status',
          service: 'shields.io',
        },
      ],
      links: [
        {
          text: 'Read docs',
          url: 'https://github.com/ElJijuna/baphy/tree/main/packages/docker',
        },
      ],
      sections: [
        { depth: 2, title: 'Installation', slug: 'installation' },
        { depth: 2, title: 'Usage', slug: 'usage' },
      ],
      tableOfContents: ['installation', 'usage'],
    });
  });

  it('creates stable GitHub-like slugs, supports bare badges, and ignores fenced code', () => {
    const result = parseReadme(`
# Project Atlas

![license](https://img.shields.io/badge/license-MIT-green)

## API

\`\`\`md
## Hidden
[internal](https://example.com/hidden)
\`\`\`

### API

[Website](https://example.com)
`);

    expect(result.badges).toEqual([
      {
        alt: 'license',
        image: 'https://img.shields.io/badge/license-MIT-green',
        target: null,
        label: 'license',
        subject: 'license',
        service: 'shields.io',
      },
    ]);
    expect(result.links).toEqual([{ text: 'Website', url: 'https://example.com' }]);
    expect(result.sections).toEqual([
      { depth: 2, title: 'API', slug: 'api' },
      { depth: 3, title: 'API', slug: 'api-1' },
    ]);
    expect(result.tableOfContents).toEqual(['api', 'api-1']);
  });
});
