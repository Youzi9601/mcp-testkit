import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

/**
 * ESLint v9 flat config — @youzi9601/mcp-testkit
 *
 * Scope: stylistic-only enforcement for source files in packages/*\/src/.
 * Two rules enabled: semicolons (always) and end-of-file newline.
 * No recommended rule sets are applied; defer those to a follow-up plan.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'docs/**',
      '**/*.config.ts',
      '**/*.config.mjs',
      '**/*.test.ts',
    ],
  },
  {
    files: ['packages/*/src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: false },
      },
    },
    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/eol-last': ['error', 'always'],
    },
  },
)
