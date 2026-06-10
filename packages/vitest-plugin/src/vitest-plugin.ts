/**
 * @youzi9601/mcp-testkit-vitest
 * Vitest plugin — auto-registers custom matchers and provides test integration.
 */

import type { Plugin } from '@youzi9601/mcp-testkit'
import { registerMatchers } from '@youzi9601/mcp-testkit'
import { version } from '../package.json'

/**
 * Creates a Vitest plugin.
 * @returns Vitest plugin object
 *
 * @example
 * ```ts
 * // vitest.config.ts
 * import { defineConfig } from 'vitest/config'
 * import mcpTestkit from '@youzi9601/mcp-testkit-vitest'
 *
 * export default defineConfig({
 *   plugins: [mcpTestkit()],
 * })
 * ```
 */
export default function mcpTestkit(): Plugin {
  return {
    name: '@youzi9601/mcp-testkit-vitest',
    version,
    register() {
      // Register MCP-specific matchers
      registerMatchers()
    },
  }
}