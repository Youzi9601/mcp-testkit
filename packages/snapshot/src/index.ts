/**
 * @youzi9601/mcp-testkit-snapshot
 *
 * Snapshot testing plugin for MCP server tool lists.
 *
 * @example
 * ```ts
 * // vitest.setup.ts
 * import { setup } from '@youzi9601/mcp-testkit-snapshot'
 * setup('./test-snapshots')
 * ```
 *
 * @example
 * ```ts
 * // my-server.test.ts
 * import { expect } from 'vitest'
 * import { createMcpTestServer } from '@youzi9601/mcp-testkit'
 *
 * test('tool list snapshot', async () => {
 *   const server = await createMcpTestServer(transport)
 *   const result = await server.listTools()
 *   await expect(result).toMatchSnapshot({ name: 'my-tools' })
 * })
 * ```
 */
export { setup, SnapshotPlugin } from './snapshot-plugin.js'
export { SnapshotManager, getSnapshotManager } from './snapshot-manager.js'
export type { SnapshotOptions } from './snapshot-plugin.js'
export type { SnapshotFile, SnapshotEntry } from './snapshot-manager.js'