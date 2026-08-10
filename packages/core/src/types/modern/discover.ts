/**
 * Modern-era (2026-07-28) `server/discover` types.
 */

/** Server capabilities advertised by `server/discover`. */
export interface ServerCapabilities {
  /** Server supports tools. */
  tools?: Record<string, unknown> | { listChanged?: boolean }
  /** Server supports prompts. */
  prompts?: Record<string, unknown> | { listChanged?: boolean }
  /** Server supports resources. */
  resources?: Record<string, unknown> | { subscribe?: boolean; listChanged?: boolean }
  /** The server's `tools/list` responses are cacheable. */
  [key: string]: unknown
}

/** Server identity, read from the result `_meta`.`serverInfo` key. */
export interface ServerInfo {
  name: string
  version: string
}

/**
 * Result of `server/discover` — a modern-era RPC that advertises the server's
 * supported protocol versions, capabilities, and identity.
 *
 * Server identity is NOT in the body — it is stamped in the result `_meta` under
 * `io.modelcontextprotocol/serverInfo`.
 *
 * **Wire field:** The SDK v2 wire schema names this property `supportedVersions`.
 * `protocolVersions` is an alias for backward compatibility with testkit ≤0.1.6
 * tests; production code should prefer `supportedVersions`.
 */
export interface DiscoverResult {
  /**
   * Protocol versions the server supports.
   *
   * Wire name is `supportedVersions` per the MCP 2026-07-28 spec and SDK v2
   * `DiscoverResultSchema`. `protocolVersions` is kept as a deprecated alias
   * matching the testkit 0.1.6 type surface.
   *
   * @example ['2026-07-28']
   * @deprecated Use `supportedVersions`. The `protocolVersions` alias is kept
   *   for testkit ≤0.1.6 call sites and may be removed after the first
   *   revision on or after 2027-07-28.
   */
  protocolVersions?: string[]
  /**
   * Protocol versions the server supports (spec wire name).
   *
   * @example ['2026-07-28']
   */
  supportedVersions?: string[]
  /** Server capabilities. */
  capabilities: ServerCapabilities
  /** Cache hints — may be present; read via a cast if needed (type-hidden). */
  ttlMs?: number
  /** Cache hints — may be present; read via a cast if needed (type-hidden). */
  cacheScope?: 'public' | 'private'
}

/**
 * Reads the server's supported protocol versions from a `DiscoverResult`,
 * tolerating both wire field names (`supportedVersions` per SDK v2 schema, and
 * `protocolVersions` as the testkit ≤0.1.6 alias).
 *
 * @param result - A `server/discover` result body.
 * @returns The list of server-supported protocol versions, or `[]` if absent.
 */
export function readSupportedVersions(result: { supportedVersions?: string[]; protocolVersions?: string[] }): string[] {
  return result.supportedVersions ?? result.protocolVersions ?? []
}

/** Parameters for the `server/discover` RPC request. */
export interface DiscoverParams {
  /**
   * Protocol versions the client supports. The server selects a mutual version.
   */
  protocolVersions?: string[]
  /** Client capabilities, carried in `_meta`. */
  [key: string]: unknown
}