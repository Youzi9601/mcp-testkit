/**
 * Protocol version and era constants for MCP.
 *
 * @module protocol/constants
 */

/**
 * MCP protocol eras.
 *
 * An era is a behavior family, not a version string.
 * - `'legacy'`: every revision from 2024-10-07 through 2025-11-25 opens with the
 *   `initialize` handshake and shares one wire behavior.
 * - `'modern'`: the 2026-07-28 revision — stateless, no `initialize`, a
 *   `server/discover` advertisement, and a `_meta` envelope on every request.
 */
export const MCP_ERA = {
  /** Legacy era — `initialize` handshake, 2024-10-07 … 2025-11-25. */
  LEGACY: 'legacy',
  /** Modern era — stateless, `server/discover` + `_meta` envelope, 2026-07-28. */
  MODERN: 'modern',
} as const;

/** Value type of {@link MCP_ERA}. */
export type McpEra = (typeof MCP_ERA)[keyof typeof MCP_ERA];

/**
 * Latest stable protocol version supported by this package.
 *
 * @deprecated The difference that matters is the protocol era, not the version string.
 * Use {@link MODERN_PROTOCOL_VERSION} or {@link DEFAULT_LEGACY_PROTOCOL_VERSION} explicitly.
 * Retained for backward compatibility with the legacy `initialize` handshake default.
 * Scheduled for removal at the first revision on or after 2027-07-28.
 */
export const LATEST_PROTOCOL_VERSION = '2024-11-05';

/**
 * Modern-era protocol version (2026-07-28).
 *
 * Stateless protocol core: no `initialize`, `server/discover` advertisement, and a
 * `_meta` envelope on every request.
 */
export const MODERN_PROTOCOL_VERSION = '2026-07-28';

/**
 * Default legacy-era protocol version offered by the `initialize` handshake.
 *
 * The latest revision of the legacy era (2024-10-07 … 2025-11-25). Kept so the
 * existing handshake path stays byte-compatible with servers that predate 2026-07-28.
 */
export const DEFAULT_LEGACY_PROTOCOL_VERSION = '2024-11-05';

/**
 * All legacy-era protocol versions this package understands.
 * Used for version compatibility checks against `initialize`-based servers.
 */
export const LEGACY_PROTOCOL_VERSIONS = [
  '2024-10-07',
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-25',
] as const;

/**
 * All modern-era protocol versions this package understands.
 */
export const MODERN_PROTOCOL_VERSIONS = ['2026-07-28'] as const;

/**
 * All protocol versions this package supports.
 * Used for version compatibility checks and multi-version test scenarios.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = [
  ...LEGACY_PROTOCOL_VERSIONS,
  ...MODERN_PROTOCOL_VERSIONS,
] as const;

/** JSON-RPC version used in all requests and responses. */
export const JSONRPC_VERSION = '2.0' as const;

/** Default client name used in protocol handshake / `_meta` envelope. */
export const DEFAULT_CLIENT_NAME = 'mcp-testkit';

/** Default client version used in protocol handshake / `_meta` envelope. */
export const DEFAULT_CLIENT_VERSION = '0.1.0';