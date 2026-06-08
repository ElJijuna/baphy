const packageScopes = ['@baphy/npm', '@baphy/dora', '@baphy/docker'];

function createPackageReleaseConfig(scope) {
  const otherScopes = packageScopes.filter((packageScope) => packageScope !== scope);

  return {
    tagFormat: `${scope}@\${version}`,
    branches: ['main'],
    plugins: [
      [
        '@semantic-release/commit-analyzer',
        {
          preset: 'conventionalcommits',
          releaseRules: [
            { scope, breaking: true, release: 'major' },
            { scope, type: 'feat', release: 'minor' },
            { scope, type: 'fix', release: 'patch' },
            { scope, type: 'perf', release: 'patch' },
            { scope, type: 'revert', release: 'patch' },
            ...createNoReleaseRules(otherScopes),
            ...createNoReleaseRules([null]),
          ],
        },
      ],
      [
        '../../scripts/semantic-release-scoped-notes.cjs',
        {
          scope,
          preset: 'conventionalcommits',
          presetConfig: {
            types: [
              { type: 'feat', section: 'Features' },
              { type: 'fix', section: 'Bug Fixes' },
              { type: 'perf', section: 'Performance' },
              { type: 'revert', section: 'Reverts' },
              { type: 'docs', section: 'Documentation', hidden: false },
              { type: 'chore', hidden: true },
              { type: 'ci', hidden: true },
            ],
          },
        },
      ],
      '@semantic-release/changelog',
      '@semantic-release/npm',
      [
        '@semantic-release/git',
        {
          assets: ['CHANGELOG.md', 'package.json'],
          message: `chore(release): ${scope}@\${nextRelease.version} [skip ci]\n\n\${nextRelease.notes}`,
        },
      ],
      '@semantic-release/github',
    ],
  };
}

function createNoReleaseRules(scopes) {
  return scopes.flatMap((scope) => [
    { scope, breaking: true, release: false },
    { scope, type: 'feat', release: false },
    { scope, type: 'fix', release: false },
    { scope, type: 'perf', release: false },
    { scope, type: 'revert', release: false },
  ]);
}

module.exports = {
  createPackageReleaseConfig,
  packageScopes,
};
