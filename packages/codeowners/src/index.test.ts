import { describe, expect, it } from 'vitest';
import { matchCodeowners, parseCodeowners } from './index.js';

// Example from the official GitHub CODEOWNERS documentation.
const GITHUB_EXAMPLE = `
# This is a comment.
*       @global-owner1 @global-owner2
*.js    @js-owner
*.go    docs@example.com
/build/logs/ @doctocat
docs/*  @octocat
apps/   @octocat
/docs/  @doctocat
/apps/  @octocat
/apps/github
`;

describe('parseCodeowners', () => {
  it('parses patterns, owners, and line numbers, skipping comments and blanks', () => {
    const rules = parseCodeowners(GITHUB_EXAMPLE);

    expect(rules).toHaveLength(9);
    expect(rules[0]).toEqual({
      pattern: '*',
      owners: ['@global-owner1', '@global-owner2'],
      lineNumber: 3,
      section: null,
    });
    expect(rules[2].owners).toEqual(['docs@example.com']);
  });

  it('keeps a rule without owners as unowned', () => {
    const rules = parseCodeowners(GITHUB_EXAMPLE);
    const unowned = rules[rules.length - 1];

    expect(unowned.pattern).toBe('/apps/github');
    expect(unowned.owners).toEqual([]);
  });

  it('supports escaped spaces in patterns', () => {
    const rules = parseCodeowners('docs/my\\ file.md @octocat');

    expect(rules[0].pattern).toBe('docs/my file.md');
    expect(rules[0].owners).toEqual(['@octocat']);
  });

  it('assigns GitLab-style sections and inherits section default owners', () => {
    const rules = parseCodeowners(`
*.ts @dev-team

[Documentation] @docs-team
docs/
README.md @tech-writer

^[Optional][2] @qa-team
*.test.ts
`);

    expect(rules).toEqual([
      { pattern: '*.ts', owners: ['@dev-team'], lineNumber: 2, section: null },
      { pattern: 'docs/', owners: ['@docs-team'], lineNumber: 5, section: 'Documentation' },
      {
        pattern: 'README.md',
        owners: ['@tech-writer'],
        lineNumber: 6,
        section: 'Documentation',
      },
      { pattern: '*.test.ts', owners: ['@qa-team'], lineNumber: 9, section: 'Optional' },
    ]);
  });
});

describe('matchCodeowners', () => {
  const rules = parseCodeowners(GITHUB_EXAMPLE);

  it('the last matching rule wins', () => {
    // *.js appears after *, so JS files belong to @js-owner.
    expect(matchCodeowners(rules, 'src/main.js')?.owners).toEqual(['@js-owner']);
  });

  it('falls back to the catch-all when nothing later matches', () => {
    expect(matchCodeowners(rules, 'LICENSE')?.owners).toEqual(['@global-owner1', '@global-owner2']);
  });

  it('anchored directory patterns only match from the repo root', () => {
    expect(matchCodeowners(rules, 'build/logs/output.txt')?.owners).toEqual(['@doctocat']);
    // /build/logs/ is anchored, so nested build/logs dirs fall back to *.
    expect(matchCodeowners(rules, 'packages/build/logs/output.txt')?.owners).toEqual([
      '@global-owner1',
      '@global-owner2',
    ]);
  });

  it('a trailing wildcard segment matches direct children only', () => {
    expect(matchCodeowners(rules, 'docs/getting-started.md')?.pattern).toBe('/docs/');
    const nested = matchCodeowners(rules, 'docs/build-app/troubleshooting.md');

    // docs/* must not match the nested file; /docs/ does.
    expect(nested?.pattern).toBe('/docs/');

    const smaller = parseCodeowners('docs/* @octocat');

    expect(matchCodeowners(smaller, 'docs/getting-started.md')?.owners).toEqual(['@octocat']);
    expect(matchCodeowners(smaller, 'docs/build-app/troubleshooting.md')).toBeNull();
  });

  it('unanchored directory patterns match at any depth', () => {
    expect(matchCodeowners(rules, 'frontend/apps/web/index.ts')?.pattern).toBe('apps/');
  });

  it('** crosses directories', () => {
    const logsRules = parseCodeowners('**/logs @octocat');

    expect(matchCodeowners(logsRules, 'build/logs/output.txt')?.owners).toEqual(['@octocat']);
    expect(matchCodeowners(logsRules, 'logs/output.txt')?.owners).toEqual(['@octocat']);

    const innerRules = parseCodeowners('apps/**/config.yml @octocat');

    expect(matchCodeowners(innerRules, 'apps/web/deep/config.yml')?.owners).toEqual(['@octocat']);
    expect(matchCodeowners(innerRules, 'apps/config.yml')?.owners).toEqual(['@octocat']);
  });

  it('returns the winning rule even when it is unowned', () => {
    expect(matchCodeowners(rules, 'apps/github')?.owners).toEqual([]);
  });

  it('returns null when nothing matches', () => {
    const smaller = parseCodeowners('*.js @js-owner');

    expect(matchCodeowners(smaller, 'README.md')).toBeNull();
  });

  it('accepts a leading slash on the queried path', () => {
    expect(matchCodeowners(rules, '/src/main.js')?.owners).toEqual(['@js-owner']);
  });

  it('? matches a single non-slash character', () => {
    const qRules = parseCodeowners('file-?.txt @octocat');

    expect(matchCodeowners(qRules, 'file-a.txt')?.owners).toEqual(['@octocat']);
    expect(matchCodeowners(qRules, 'file-ab.txt')).toBeNull();
  });
});
