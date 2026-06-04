/**
 * HttpTransportPlugin — @youzi9601/mcp-testkit-http vitest plugin.
 *
 * Registers HTTP transport support with the MCP testkit plugin system.
 *
 * @example
 * ```ts
 * // vitest.config.ts
 * import { defineConfig } from 'vitest/config'
 * import mcpTestkitHttp from '@youzi9601/mcp-testkit-http/http-plugin'
 *
 * export default defineConfig({
 *   plugins: [mcpTestkitHttp()],
 * })
 * ```
 */

import type { Plugin } from '@youzi9601/mcp-testkit'
import { createMcpServer } from '@youzi9601/mcp-testkit'
import { HttpTransport, type HttpTransportOptions } from './http-transport.js'

/**
 * Options for creating an MCP server via HTTP transport.
 */
export interface HttpServerOptions {
  /** HTTP MCP endpoint URL (e.g., 'http://localhost:3000/mcp'). */
  url: string
  /**
   * Optional server process to start before connecting.
   * The transport will spawn the process and wait for it to be ready.
   */
  startServer?: {
    command: string
    args: string[]
    cwd?: string
    env?: Record<string, string>
    readinessUrl?: string
  }
  /** Extra HTTP headers sent with every request. */
  headers?: Record<string, string>
  /** Request timeout in ms. Default: 30000. */
  timeout?: number
}

/**
 * Creates an MCP server instance using HTTP transport.
 *
 * Convenience factory wrapping createMcpServer + HttpTransport.
 *
 * @param options - HTTP server configuration
 * @returns Promise resolving to an McpServer instance
 *
 * @example
 * ```ts
 * import { createHttpMcpServer } from '@youzi9601/mcp-testkit-http/http-plugin'
 *
 * const server = await createHttpMcpServer({
 *   url: 'http://localhost:3000/mcp',
 * })
 * const result = await server.callTool('my-tool', { arg: 'value' })
 * await server.close()
 * ```
 */
export async function createHttpMcpServer(options: HttpServerOptions) {
  const transport = new HttpTransport({
    url: options.url,
    startServer: options.startServer,
    headers: options.headers,
    timeout: options.timeout,
  })

  return createMcpServer({ transport })
}

/**
 * Creates the Vitest plugin for @youzi9601/mcp-testkit-http.
 *
 * @param _options - Currently unused, reserved for future options
 */
export default function mcpTestkitHttp(
  _options?: { httpOptions?: HttpServerOptions },
): Plugin {
  return {
    name: '@youzi9601/mcp-testkit-http',
    version: '0.2.0',
    supportedCoreVersions: '^0.1.0',

    register() {
      // No custom matchers to register — matchers are handled by
      // @youzi9601/mcp-testkit-vitest. This plugin exists to:
      // 1. Enable PluginRegistry version compatibility checks
      // 2. Provide a hook point for future HTTP-specific extensions
    },
  }
}