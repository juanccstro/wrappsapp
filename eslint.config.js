import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    // Determinismo: el mismo chat debe producir siempre el mismo Wrapped.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded PRNG (src/core/random).' },
        { object: 'Date', property: 'now', message: 'core must not depend on the current time.' },
        { object: 'performance', property: 'now', message: 'core must not depend on the clock.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'new Date() without arguments depends on the current time.',
        },
        {
          selector: "CallExpression[callee.name='Date']",
          message: 'Date() depends on the current time.',
        },
        {
          selector: 'ForInStatement',
          message: 'for..in order is not a safe basis for deterministic output.',
        },
      ],
    },
  },
  prettier,
);
