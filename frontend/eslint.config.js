import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // This project uses the automatic JSX runtime, so neither is needed.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',

      // PropTypes are not used; types will come from the TypeScript migration.
      'react/prop-types': 'off',

      // Off: flags ordinary apostrophes in prose ("Bharadwaj's Cafe"). They
      // render correctly and escaping them makes the copy harder to read.
      'react/no-unescaped-entities': 'off',

      // React Compiler advisories, kept as warnings rather than errors.
      // They correctly flag a real pattern in this codebase — effects that
      // call a `const` helper declared further down the component, and
      // setState called synchronously in an effect. Both work today, and
      // fixing all 14 sites means reordering several large components. That
      // is a deliberate follow-up, not something to block CI on today.
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',

      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  {
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  prettier,
];
