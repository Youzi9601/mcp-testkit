/**
 * Modern-era (2026-07-28) MRTR (Multi Round-Trip Request) and result type types.
 */

/** Result type discriminator present on every modern-era result. */
export const RESULT_TYPE = {
  /** Ordinary, complete result. */
  COMPLETE: 'complete',
  /** Interim result — the client must answer `inputRequests` and retry. */
  INPUT_REQUIRED: 'input_required',
} as const;

/** Value of {@link RESULT_TYPE}. */
export type McpResultType = (typeof RESULT_TYPE)[keyof typeof RESULT_TYPE];

/**
 * Cache hints carried on cacheable list results (2026-07-28, SEP-2549).
 *
 * `ttlMs` is a freshness hint in milliseconds; `cacheScope` controls whether shared
 * intermediaries may cache.
 */
export interface CacheableResult {
  /** Freshness hint in milliseconds, `0` = do not cache. */
  ttlMs?: number
  /** Whether shared intermediaries may cache the response. */
  cacheScope?: 'public' | 'private'
  /** Result type discriminator. */
  resultType?: McpResultType
}

/** One embedded input request inside an `InputRequiredResult`. */
export type InputRequest =
  | { kind: 'elicit' }
  | { kind: 'elicitUrl' }
  | { kind: 'sampling' }
  | { kind: 'roots' };

/**
 * Interim MRTR result — the server needs more input from the client before the
 * original `tools/call` / `prompts/get` / `resources/read` can complete.
 */
export interface InputRequiredResult {
  /** Interim result discriminator — must be `'input_required'`. */
  resultType: typeof RESULT_TYPE.INPUT_REQUIRED
  /** Requests for the additional information needed to process the request. */
  inputRequests?: Record<string, InputRequest>
  /** Opaque, untrusted state echoed byte-for-byte by the client on retry. */
  requestState?: string
}
