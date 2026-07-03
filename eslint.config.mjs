import eslintTs from 'super-configs/eslint/ts';

export default [
  {
    ignores: [
      'dist/**',
      '**/dist/**',
      'coverage/**',
      '**/coverage/**',
      'node_modules/**',
      '.turbo/**',
      'docs/api/**',
    ],
  },
  ...eslintTs,
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
