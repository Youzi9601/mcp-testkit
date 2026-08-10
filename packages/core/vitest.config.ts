import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 89,
        branches: 70,
      },
      exclude: [
        '**/*.test.ts',
        '**/test-utils/**',
        '**/dist/**',
        '**/node_modules/**',
        '**/fixtures/**',
        '**/index.ts',
        '**/vitest.config.ts',
        // Deprecated re-export shim — re-exports from protocol/protocol.js.
        '**/transport/protocol.ts',
      ],
    },
  },
})