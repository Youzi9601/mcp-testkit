/**
 * @youzi9601/mcp-testkit-vitest
 * Vitest plugin — auto-registers custom matchers and provides test integration.
 */

import type { Plugin } from '@youzi9601/mcp-testkit';
import { registerMatchers } from '@youzi9601/mcp-testkit';

/**
 * Resolves the package version at runtime.
 * Falls back to '0.0.0' if not set by npm (e.g., direct from source).
 */
const version = process.env.npm_package_version ?? '0.0.0';

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
      registerMatchers();
    },
  };
}
