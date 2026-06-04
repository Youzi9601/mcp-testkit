/**
 * Protocol version constants for MCP.
 *
 * @module protocol/constants
 */

/**
 * Latest stable MCP protocol version supported by this package.
 * Bump this when releasing support for a new protocol version.
 */
export const LATEST_PROTOCOL_VERSION = '2024-11-05'

/**
 * All protocol versions this package supports.
 * Used for version compatibility checks and multi-version test scenarios.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2024-11-05'] as const

/** JSON-RPC version used in all requests and responses. */
export const JSONRPC_VERSION = '2.0' as const

/** Default client name used in protocol handshake. */
export const DEFAULT_CLIENT_NAME = 'mcp-testkit'

/** Default client version used in protocol handshake. */
export const DEFAULT_CLIENT_VERSION = '0.1.0'