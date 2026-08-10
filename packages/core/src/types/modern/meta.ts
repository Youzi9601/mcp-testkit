/**
 * Modern-era (2026-07-28) reserved `_meta` envelope keys and the envelope type.
 */

/** Reserved `_meta` envelope keys (`io.modelcontextprotocol/*` prefix). */
export const REQUEST_META_KEYS = {
  /** Server-assigned protocol version. */
  protocolVersion: 'io.modelcontextprotocol/protocolVersion',
  /** Client identity on each request. */
  clientInfo: 'io.modelcontextprotocol/clientInfo',
  /** Client capabilities on each request. */
  clientCapabilities: 'io.modelcontextprotocol/clientCapabilities',
  /** Per-request log level (replaces `logging/setLevel`). */
  logLevel: 'io.modelcontextprotocol/logLevel',
  /** Server identity stamped on each result. */
  serverInfo: 'io.modelcontextprotocol/serverInfo',
} as const;

/** A `_meta` key constant. */
export type RequestMetaKey = (typeof REQUEST_META_KEYS)[keyof typeof REQUEST_META_KEYS];

/**
 * Per-request `_meta` envelope.
 *
 * Sent by the client on every modern-era request and notification. Server identity is
 * stamped in the `_meta` of every result.
 */
export interface RequestMetaEnvelope {
  /**
   * Protocol version the client intends to speak.
   * @example '2026-07-28'
   */
  ['io.modelcontextprotocol/protocolVersion']?: string
  /** Client identity. SHOULD be sent on every request. */
  ['io.modelcontextprotocol/clientInfo']?: {
    name: string
    version: string
  }
  /** Client capabilities. */
  ['io.modelcontextprotocol/clientCapabilities']?: Record<string, unknown>
  /** Per-request log level filter. Absent means no log emission. */
  ['io.modelcontextprotocol/logLevel']?: string
  /** Server identity stamped on results. Read-only from the client. */
  ['io.modelcontextprotocol/serverInfo']?: {
    name: string
    version: string
  }
}