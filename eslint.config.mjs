// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'data/sources'] },
  eslint.configs.recommended,
  tseslint.configs.strict,
  {
    rules: {
      // tsconfig's noUncheckedIndexedAccess types every array read as possibly
      // undefined. Table lookups are range-checked first, so `!` states a
      // checked fact rather than hiding a bug.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  prettier,
);
