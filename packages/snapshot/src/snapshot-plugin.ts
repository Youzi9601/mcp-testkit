import { SnapshotManager, getSnapshotManager, setSnapshotManager } from './snapshot-manager.js'

/**
 * Vitest MatcherState — mirrored from vitest types to avoid direct dependency
 * on vitest's internal type exports.
 */
interface MatcherState {
  isNot: boolean
  promise: Promise<unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  utils: Array<{ name: string; fn: (...args: any[]) => any }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expand?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colors?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diff?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inspectors?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  randomSeed?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshotState?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentTestName?: string
  testPath?: string
}

export interface SnapshotOptions {
  /** Snapshot name (default: 'default'). */
  name?: string
  /** Update snapshot even on mismatch (write new value). */
  update?: boolean
}

// Snapshot dir — set by setup()
let snapshotDir: string | undefined

/**
 * Initializes the global SnapshotManager with the given snapshot directory.
 *
 * @example
 * ```ts
 * // vitest.setup.ts
 * import { setup } from '@youzi9601/mcp-testkit-snapshot'
 * setup('./test-snapshots')
 * ```
 */
export function setup(dir: string): void {
  snapshotDir = dir
  setSnapshotManager(new SnapshotManager(dir))
}

/**
 * SnapshotPlugin registers `toMatchSnapshot` with Vitest.
 *
 * Usage:
 * ```ts
 * // vitest.config.ts
 * import { defineConfig } from 'vitest/config'
 * import { SnapshotPlugin } from '@youzi9601/mcp-testkit-snapshot'
 *
 * export default defineConfig({
 *   plugins: [SnapshotPlugin()],
 *   test: {
 *     setupFiles: ['./vitest.setup.ts'],
 *   },
 * })
 * ```
 *
 * Or set the snapshot directory directly:
 * ```ts
 * // vitest.setup.ts
 * import { SnapshotPlugin } from '@youzi9601/mcp-testkit-snapshot'
 * SnapshotPlugin.setup('./test-snapshots')
 * ```
 */
export function SnapshotPlugin(): {
  name: string
  setup(): void
} {
  return {
    name: 'mcp-testkit-snapshot',

    // eslint-disable-next-line @typescript-eslint/require-await
    async setup() {
      setSnapshotManager(new SnapshotManager(snapshotDir ?? './snapshots'))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vitestModule = await import('vitest')
      const expect = (vitestModule as any).expect

      expect.extend({
        toMatchSnapshot(
          this: MatcherState,
          received: unknown,
          options?: SnapshotOptions,
        ) {
          const { name = 'default', update = false } = options ?? {}

          // Received should be the result of server.listTools()
          const response = received as Record<string, unknown>
          const result = response?.result as Record<string, unknown> | undefined
          const tools = result?.tools as unknown[] | undefined

          if (!Array.isArray(tools)) {
            return {
              pass: false,
              actual: received,
              expected: name,
              message: () =>
                `toMatchSnapshot: expected server.listTools() result with a tools array, got ${JSON.stringify(received).slice(0, 100)}`,
            }
          }

          const manager = getSnapshotManager()
          const testFilePath = this.testPath ?? 'unknown'

          if (update || process.env.UPDATE_SNAPSHOTS === 'true') {
            manager.writeSnapshot(testFilePath, name, tools)
            return {
              pass: true,
              actual: tools,
              expected: name,
              message: () => `Snapshot "${name}" updated for ${testFilePath}`,
            }
          }

          const stored = manager.readSnapshot(testFilePath, name)

          if (!stored) {
            return {
              pass: false,
              actual: tools,
              expected: name,
              message: () =>
                `No snapshot found for "${name}". Run with UPDATE_SNAPSHOTS=true to create it.`,
            }
          }

          const pass = JSON.stringify(tools) === JSON.stringify(stored.toolList)

          return {
            pass,
            actual: tools,
            expected: stored.toolList,
            message: () =>
              pass
                ? `Snapshot "${name}" matched`
                : `Snapshot mismatch for "${name}". Run with UPDATE_SNAPSHOTS=true to update.`,
          }
        },
      })
    },
  }
}