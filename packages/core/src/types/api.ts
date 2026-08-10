/**
 * Public API type definitions.
 */

import type { McpProtocolOptions } from '../protocol/options.js';
import type { Transport } from '../transport/types.js';
import type { SubscriptionListenParams, McpSubscription } from './modern/subscription.js';

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

  /**
   * Multi Round-Trip Request (MRTR) handling for the modern era (2026-07-28).
   *
   * When a `tools/call` / `prompts/get` / `resources/read` request answers with
   * `resultType: 'input_required'`, the server is asking the client for more input
   * before the call can complete. `resolveInput` lets the test supply the answers;
   * the SDK-compatible driver then retries the original call with `inputResponses`.
   *
   * If `resolveInput` is omitted, `callTool` returns the raw `input_required` result
   * and the caller may manually re-issue the call with `inputResponses`.
   */
  mrtr?: {
    /** Maximum retry rounds before giving up. Default 10. */
    maxRounds?: number
    /**
     * Answers the server's `input_required` requests. Receives the embedded
     * `inputRequests` and must return the matching `inputResponses`.
     * Returning `undefined` aborts the retry loop, surfacing the `input_required`
     * result as-is.
     */
    resolveInput?: (inputRequests: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>
  }
}

/**
 * Server instance providing methods to interact with an MCP server.
 */
export interface McpServer {
  /** Calls a tool. */
  callTool(name: string, args?: Record<string, unknown>): Promise<unknown>
  /**
   * Gets server capabilities.
   * @deprecated Legacy-era only. The 2026-07-28 modern era removes the `initialize`
   * handshake; use {@link McpServer.discover} instead. Scheduled for removal at the
   * first revision on or after 2027-07-28.
   */
  getCapabilities(): Promise<unknown>
  /**
   * Discovers the server's supported protocol versions and capabilities via the
   * `server/discover` RPC (modern era, 2026-07-28).
   */
  discover(): Promise<unknown>
  /** Lists available tools. */
  listTools(): Promise<unknown>
  /** Lists available resources. */
  listResources(): Promise<unknown>
  /**
   * Opens a modern-era (2026-07-28) `subscriptions/listen` stream for the given
   * notification filter. Returns an {@link McpSubscription} handle whose
   * `honoredFilter` is the capability-gated subset the server agreed to deliver.
   *
   * Register a notification handler via `subscription.onNotification(handler)`
   * to receive change notifications dispatched on the stream.
   */
  listen(filter: SubscriptionListenParams): Promise<McpSubscription>
  /** Closes the server connection. */
  close(): Promise<void>
  /**
   * Returns the negotiated protocol era (`'legacy'` or `'modern'`).
   * Resolves once era negotiation completes (after {@link McpServer.discover} /
   * `connect`).
   */
  getProtocolEra(): 'legacy' | 'modern' | undefined
  /**
   * Returns the server identity, if the modern-era server stamped one in its
   * result `_meta` (`io.modelcontextprotocol/serverInfo`).
   */
  getServerVersion(): Promise<{ name: string; version: string } | undefined>
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
