/**
 * Protocol configuration for MCP test server instances.
 *
 * All fields are optional. Defaults are sourced from constants.ts.
 * This type is NOT exported from the public API — it is for internal use only.
 */

import type { JSONRPC_VERSION } from './constants.js';

/**
 * Protocol options for controlling JSON-RPC and MCP version behavior.
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
   * MCP protocol version for initialization handshake.
   * @default LATEST_PROTOCOL_VERSION
   */
  protocolVersion?: string

  /**
   * Client info sent during initialize request.
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
}
