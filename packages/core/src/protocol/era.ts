/**
 * MCP protocol era negotiation.
 *
 * An era is a behavior family, not a version string:
 * - `'legacy'`: 2024-10-07 … 2025-11-25 — opens with the `initialize` handshake.
 * - `'modern'`: 2026-07-28 — stateless; a `server/discover` probe advertises versions
 *   and capabilities, and every request carries a `_meta` envelope.
 *
 * `negotiateEra` mirrors the official SDK's `versionNegotiation` semantics:
 * `'legacy'` (default) skips the probe and connects with `initialize`;
 * `'auto'` probes with `server/discover` and falls back to legacy;
 * a pin accepts only the pinned modern revision.
 */

import type { Transport } from '../transport/types.js';
import { createRequest } from './protocol.js';
import { MODERN_PROTOCOL_VERSION, DEFAULT_CLIENT_NAME, DEFAULT_CLIENT_VERSION } from './constants.js';
import { REQUEST_META_KEYS } from '../types/modern/meta.js';
import type { DiscoverResult } from '../types/modern/discover.js';
import { readSupportedVersions } from '../types/modern/discover.js';
import { JsonRpcErrorCode, McpErrorCode } from '../errors/error-codes.js';

/** The negotiated protocol era. */
export type ProtocolEra = 'legacy' | 'modern';

/** Mode for era negotiation, mirroring the official SDK's `versionNegotiation`. */
export type EraNegotiationMode =
  | 'legacy'
  | 'auto'
  | { pin: string }

/** Options for {@link negotiateEra}. */
export interface EraNegotiationOptions {
  /** Negotiation mode. Default `'legacy'` (backward compatible, no probe). */
  mode?: EraNegotiationMode
  /** Protocol versions the client supports for the probe. */
  supportedProtocolVersions?: string[]
  /** Client identity reported in the probe `_meta`. */
  clientInfo?: { name: string; version: string }
  /** Probe timeout in ms. Default 5000. */
  timeoutMs?: number
}

/** Result of a successful era negotiation. */
export interface EraNegotiationResult {
  /** The negotiated era. */
  era: ProtocolEra
  /** The `server/discover` result, present only when the modern era was negotiated. */
  discover?: DiscoverResult
  /** The negotiated protocol version string. */
  protocolVersion: string
}

/** Thrown when a pinned modern era cannot be negotiated. */
export class EraNegotiationFailedError extends Error {
  readonly code = 'ERA_NEGOTIATION_FAILED'
  constructor(message: string) {
    super(message)
    this.name = 'EraNegotiationFailedError'
  }
}

const DEFAULT_TIMEOUT = 5000;

/**
 * Probes a server with `server/discover` to determine its era.
 *
 * @param transport - A started transport.
 * @param options - Probe options.
 * @returns The discovered `DiscoverResult`, or `undefined` when the server does not
 *   respond to `server/discover` (i.e. it is legacy-only).
 */
async function probeDiscover(
  transport: Transport,
  supportedVersions: string[],
  clientInfo: { name: string; version: string },
  timeoutMs: number,
): Promise<DiscoverResult | undefined> {
  const id = 1
  const request = createRequest(
    id,
    'server/discover',
    { protocolVersions: supportedVersions },
    { protocolVersion: MODERN_PROTOCOL_VERSION },
  ) as unknown as Record<string, unknown>

  // Attach the modern `_meta` envelope to the probe request.
  // clientCapabilities is MUST per the 2026-07-28 spec; emit an empty object
  // when the user hasn't configured any, so real SDK v2 servers don't reject
  // the probe with MissingRequiredClientCapability.
  (request.params as Record<string, unknown>)['_meta'] = {
    [REQUEST_META_KEYS.protocolVersion]: MODERN_PROTOCOL_VERSION,
    [REQUEST_META_KEYS.clientInfo]: clientInfo,
    [REQUEST_META_KEYS.clientCapabilities]: {},
  }

  let response: object
  try {
    response = await withTimeout(transport.send(request), timeoutMs)
  } catch (err) {
    // A `-32601` (MethodNotFound) from a legacy-only server, or a probe timeout on
    // stdio (some legacy servers never answer pre-`initialize` requests), both mean
    // legacy — not an error.
    const errCode = (err as { code?: number } | undefined)?.code
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errCode === JsonRpcErrorCode.MethodNotFound) {
      return undefined
    }
    if (err instanceof Error && /timeout/i.test(err.message)) {
      return undefined
    }
    // A malformed/wrong-version rejection is evidence of a modern-era mismatch, not
    // legacy. Re-throw so the caller can decide with the probe error in hand.
    if (errCode === McpErrorCode.UnsupportedProtocolVersion) {
      throw new EraNegotiationFailedError(
        `Server did not offer a mutual protocol version via server/discover: ${errMsg}`,
      )
    }
    throw err
  }

  // Accept both transport shapes: a wrapped JSON-RPC response ({ result }) or an
  // already-unwrapped result (StdioTransport unwraps before resolving).
  const raw = response as { result?: unknown }
  const result = 'result' in raw ? raw.result : response
  if (typeof result === 'object' && result !== null) {
    return result as DiscoverResult
  }
  return undefined
}

/**
 * Negotiates the protocol era for a transport.
 *
 * @param transport - A started transport.
 * @param options - Negotiation options.
 * @returns The negotiated era and, for modern, the discover result.
 * @throws {EraNegotiationFailedError} when a pinned modern era cannot be negotiated,
 *   or when an `'auto'` client lists only modern versions against a legacy server.
 */
export async function negotiateEra(
  transport: Transport,
  options: EraNegotiationOptions = {},
): Promise<EraNegotiationResult> {
  const mode = options.mode ?? 'legacy'
  const clientInfo = options.clientInfo ?? {
    name: DEFAULT_CLIENT_NAME,
    version: DEFAULT_CLIENT_VERSION,
  }
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT
  const supported = options.supportedProtocolVersions ?? ['2026-07-28']

  // Legacy mode: no probe, straight to `initialize`.
  if (mode === 'legacy') {
    return {
      era: 'legacy',
      protocolVersion: '2024-11-05',
    }
  }

  const pinned = typeof mode === 'object' ? mode.pin : undefined
  const probeVersions = pinned ? [pinned] : supported

  const discover = await probeDiscover(transport, probeVersions, clientInfo, timeoutMs)

  if (discover) {
    const negotiated = pickMutualVersion(discover, probeVersions, pinned)
    return {
      era: 'modern',
      discover,
      protocolVersion: negotiated,
    }
  }

  // Server did not answer `server/discover`.
  if (pinned) {
    throw new EraNegotiationFailedError(
      `Version negotiation failed: the server did not offer pinned protocol version ${pinned} via server/discover (no fallback in pin mode)`,
    )
  }

  // `'auto'`: fall back to legacy only if the client still lists a pre-2026 version.
  const hasLegacyFallback = probeVersions.some((v) => v < '2026-07-28')
  if (!hasLegacyFallback) {
    throw new EraNegotiationFailedError(
      'Version negotiation failed: the server did not answer server/discover and the client offers no legacy fallback',
    )
  }

  return {
    era: 'legacy',
    protocolVersion: '2024-11-05',
  }
}

/**
 * Picks the server's best mutual protocol version from a discover result.
 */
function pickMutualVersion(
  discover: DiscoverResult,
  clientVersions: string[],
  pinned: string | undefined,
): string {
  const serverVersions = readSupportedVersions(discover)
  if (pinned) {
    if (serverVersions.includes(pinned)) return pinned
    throw new EraNegotiationFailedError(
      `Version negotiation failed: the server did not offer pinned protocol version ${pinned} via server/discover (no fallback in pin mode)`,
    )
  }
  const mutual = serverVersions
    .filter((v) => clientVersions.includes(v))
    .sort()
    .at(-1)
  if (mutual === undefined) {
    throw new EraNegotiationFailedError(
      `Version negotiation failed: the server offered ${JSON.stringify(serverVersions)} via server/discover but none intersect the client's supported versions ${JSON.stringify(clientVersions)}`,
    )
  }
  return mutual
}

/** Runs a promise with a timeout that rejects on expiry. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Probe timeout after ${ms}ms`)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

/**
 * Returns whether a protocol version string belongs to the modern era (≥ 2026-07-28).
 *
 * @param version - A protocol version string.
 * @returns `true` for the modern era, `false` for legacy.
 */
export function isModernVersion(version: string): boolean {
  return version >= '2026-07-28'
}