module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, es2022: true },
  ignorePatterns: ['dist', 'coverage', 'node_modules'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
