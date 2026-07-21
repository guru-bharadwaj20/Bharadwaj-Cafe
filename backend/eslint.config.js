import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['node_modules/**', 'coverage/**', 'dist/**'] },

  js.configs.recommended,

  // Type-aware linting: these rules need the compiler, not just the parser,
  // which is what lets them catch things like unawaited promises.
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        // tsconfig.test.json, not tsconfig.json: it is the superset that
        // also includes tests/, which the build config deliberately excludes.
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
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

      // Express 4 types RequestHandler as returning `void`, so every async
      // handler in the codebase looks like a "misused promise" even though
      // each one catches its own errors. Only the void-return check is
      // relaxed; genuinely floating promises are still caught by
      // no-floating-promises.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false, variables: false } },
      ],

      // Off by design. It flags `req.user = await ...` in Express middleware
      // and `socket.userId = await ...` in Socket.io handshakes, but each
      // request/socket object belongs to exactly one chain — there is no
      // shared state to race on.
      'require-atomic-updates': 'off',
    },
  },

  {
    // Supertest's `.body` is `any`, so assertions on responses trip the
    // unsafe-* family constantly. Loosening this only for tests keeps the
    // signal where it matters — in the application code.
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      // Tests build request URLs from ObjectIds constantly
      // (`/api/orders/${order._id}`). Requiring .toString() on each one adds
      // noise without catching anything: the value is always an id.
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },

  {
    // Config files are plain JS and outside the TS project.
    files: ['*.config.js'],
    languageOptions: { globals: { ...globals.node } },
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Must come last: switches off stylistic rules that would fight Prettier.
  prettier
);
