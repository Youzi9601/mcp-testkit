/**
 * Public API type definitions.
 */

import type { McpProtocolOptions } from '../protocol/options.js'
import type { Transport } from '../transport/types.js'

/**
 * Options for creating an MCP server.
 *
 * Either provide a pre-configured `transport` instance, or use `command`/`args`
 * to have a StdioTransport created automatically.
 */
export interface ServerOptions {
  /**
   * Pre-configured transport instance.
   * When provided, `command`/`args`/`env` are ignored.
   */
  transport?: Transport

  /**
   * Executable (e.g., `node`, `python`).
   * Ignored when `transport` is provided.
   */
  command?: string

  /**
   * Arguments (e.g., `['server.js']`).
   * Ignored when `transport` is provided.
   */
  args?: string[]

  /**
   * Extra environment variables (merged with existing env).
   * Ignored when `transport` is provided.
   */
  env?: Record<string, string>

  /**
   * Startup timeout in ms, default 5000.
   * Ignored when `transport` is provided (transport manages its own startup).
   */
  timeout?: number

  /** Protocol configuration. All fields optional with defaults. */
  protocol?: McpProtocolOptions
}

/**
 * Server instance providing methods to interact with an MCP server.
 */
export interface McpServer {
  /** Calls a tool. */
  callTool(name: string, args?: Record<string, unknown>): Promise<unknown>
  /** Gets server capabilities. */
  getCapabilities(): Promise<unknown>
  /** Lists available tools. */
  listTools(): Promise<unknown>
  /** Lists available resources. */
  listResources(): Promise<unknown>
  /** Closes the server connection. */
  close(): Promise<void>
}

/**
 * Test harness (lifeline) — used with describe.
 * @see createMcpServer
 */
export interface TestHarness {
  server: McpServer
  /** Resets mock state (if using mock). */
  reset?(): void
}