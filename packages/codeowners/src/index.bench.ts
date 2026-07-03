import { bench, describe } from 'vitest';
import { matchCodeowners, parseCodeowners } from './index.js';

function makeCodeowners(ruleCount: number): string {
  const lines = ['* @fallback-team'];
  for (let i = 0; i < ruleCount; i += 1) {
    lines.push(`/packages/pkg-${i}/ @team-${i % 10}`);
    lines.push(`/packages/pkg-${i}/**/*.test.ts @qa-${i % 5}`);
  }
  return lines.join('\n');
}

function makePaths(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const pkg = i % 50;
    return i % 3 === 0
      ? `packages/pkg-${pkg}/src/deep/module-${i}.test.ts`
      : `packages/pkg-${pkg}/src/module-${i}.ts`;
  });
}

describe('parseCodeowners — rule count scaling', () => {
  const small = makeCodeowners(50);
  const large = makeCodeowners(500);

  bench('100 rules', () => {
    parseCodeowners(small);
  });

  bench('1,000 rules', () => {
    parseCodeowners(large);
  });
});

describe('matchCodeowners — 100 rules', () => {
  const rules = parseCodeowners(makeCodeowners(50));
  const paths = makePaths(1_000);

  bench('1,000 paths', () => {
    for (const path of paths) {
      matchCodeowners(rules, path);
    }
  });
});

describe('matchCodeowners — 1,000 rules', () => {
  const rules = parseCodeowners(makeCodeowners(500));
  const paths = makePaths(1_000);

  bench('1,000 paths', () => {
    for (const path of paths) {
      matchCodeowners(rules, path);
    }
  });
});
