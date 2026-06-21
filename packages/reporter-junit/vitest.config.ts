import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 64,
      },
      exclude: [
        '**/*.test.ts',
        '**/test-utils/**',
        '**/dist/**',
        '**/node_modules/**',
        '**/index.ts',
        '**/vitest.config.ts',
      ],
    },
  },
})