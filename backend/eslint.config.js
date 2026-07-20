import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['node_modules/**', 'coverage/**', 'dist/**'] },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Unused variables are usually a genuine mistake, but Express error
      // handlers must keep their 4-argument shape, and destructuring is a
      // legitimate way to omit fields.
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': 'off', // the server logs to stdout by design
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-return-await': 'error',

      // Off by design. It flags `req.user = await ...` in Express middleware
      // and `socket.userId = await ...` in Socket.io handshakes, but each
      // request/socket object belongs to exactly one chain — there is no
      // shared state to race on. Leaving it enabled would mean either four
      // permanent inline suppressions or restructuring correct code to satisfy
      // a check that does not apply here.
      'require-atomic-updates': 'off',
    },
  },

  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Must come last: switches off stylistic rules that would fight Prettier.
  prettier,
];
