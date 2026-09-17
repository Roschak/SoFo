module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.json', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, jest: true, es2022: true },
  ignorePatterns: ['dist', 'coverage', 'node_modules'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': 'error',
  },
  overrides: [
    {
      files: ['**/*.spec.ts'],
      rules: {
        // Test mocks intentionally use loose typing for Prisma doubles.
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
