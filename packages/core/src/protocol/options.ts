/**
 * Protocol configuration for MCP test server instances.
 *
 * All fields are optional. Defaults are sourced from constants.ts.
 * This type is NOT exported from the public API — it is for internal use only.
 */

import type { JSONRPC_VERSION } from './constants.js';
import type { EraNegotiationMode } from './era.js';

/**
 * Protocol options for controlling JSON-RPC, MCP version behavior, and era.
 *
 * @internal
 */
export interface McpProtocolOptions {
  /**
   * JSON-RPC version to write into requests and responses.
   * @default '2.0'
   */
  jsonrpcVersion?: (typeof JSONRPC_VERSION) | string

  /**
   * MCP protocol version for the initialization handshake (legacy era).
   * @default LATEST_PROTOCOL_VERSION
   * @deprecated Use `era.negotiation` for modern-era connections. Retained for the
   * legacy `initialize` handshake default. Scheduled for removal at the first
   * revision on or after 2027-07-28.
   */
  protocolVersion?: string

  /**
   * Client info sent in the initialize request / `_meta` envelope.
   * @default { name: DEFAULT_CLIENT_NAME, version: DEFAULT_CLIENT_VERSION }
   */
  clientInfo?: {
    name: string
    version: string
  }

  /**
   * List of protocol versions this instance should advertise support for.
   * Used for multi-version compatibility testing.
   * @default [LATEST_PROTOCOL_VERSION]
   */
  supportedProtocolVersions?: string[]

  /**
   * Era negotiation configuration (2026-07-28 modern era support).
   *
   * When `negotiation` is set, `createMcpServer` negotiates the protocol era before
   * the first request:
   * - `mode: 'legacy'` (default) — the `initialize` handshake, no probe.
   * - `mode: 'auto'` — probe with `server/discover`; fall back to legacy.
   * - `mode: { pin: '2026-07-28' }` — modern only, no fallback.
   */
  era?: {
    /** Era negotiation mode. Default `'legacy'`. */
    negotiation?: EraNegotiationMode
    /** Protocol versions to offer during the probe. */
    supportedProtocolVersions?: string[]
  }

  /**
   * Then set of `_meta` envelope keys to attach to every request (modern era).
   * The protocol version and clientInfo are always attached when the era is modern.
   */
  metaKeys?: {
    clientCapabilities?: Record<string, unknown>
    clientInfo?: { name: string; version: string }
  }
}