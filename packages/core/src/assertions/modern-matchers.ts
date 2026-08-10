/**
 * Modern-era (2026-07-28) custom Vitest matchers.
 *
 * Registered via {@link registerModernMatchers}. Each matcher's assertion logic lives
 * in a top-level `assert*` helper so the matchers stay thin decorators around pure,
 * individually testable functions — no nesting of closures.
 */

import type { AnyMatcherState } from './matcher-helpers.js';

/** Thrown shape returned by a Vitest matcher. */
type MatcherResult = {
  pass: boolean
  actual?: unknown
  expected?: unknown
  message: () => string
};

/**
 * Pure assertion: whether a request carries a modern-era `_meta` envelope with the
 * `io.modelcontextprotocol/protocolVersion` key.
 *
 * @param received - A JSON-RPC request object.
 * @returns `true` when the `_meta` envelope declares a protocol version.
 */
export function assertHasRequestMeta(received: unknown): boolean {
  if (!received || typeof received !== 'object') return false;
  const params = (received as { params?: { _meta?: unknown } }).params;
  const meta = params?._meta;
  if (typeof meta !== 'object' || meta === null) return false;
  return 'io.modelcontextprotocol/protocolVersion' in meta;
}

/**
 * Pure assertion: whether an HTTP request carries the standard MCP headers
 * `MCP-Protocol-Version` and `Mcp-Method`.
 *
 * @param received - An HTTP request object with a `headers` map.
 * @returns `true` when both standard headers are present (case-insensitive).
 */
export function assertHasMcpHeaders(received: unknown): boolean {
  if (!received || typeof received !== 'object') return false;
  const headers = (received as { headers?: Record<string, unknown> }).headers ?? {};
  // Case-insensitive lookup: normalize all header keys to lowercase before matching.
  const lower: Record<string, unknown> = {};
  for (const k of Object.keys(headers)) {
    lower[k.toLowerCase()] = headers[k];
  }
  return !!lower['mcp-protocol-version'] && !!lower['mcp-method'];
}

/**
 * Pure assertion: whether a result carries `resultType: 'complete'`.
 *
 * @param received - A modern-era result object.
 * @returns `true` when `resultType` is `'complete'`.
 */
export function assertCompleteResult(received: unknown): boolean {
  return (
    typeof received === 'object' &&
    received !== null &&
    (received as { resultType?: string }).resultType === 'complete'
  );
}

/**
 * Pure assertion: whether a modern-era result carries a `resultType` discriminator.
 *
 * Per the 2026-07-28 spec, every modern-era result MUST declare `resultType` —
 * its absence is a spec violation. This assertion accepts both a bare result and
 * a wrapped `{ result }` response.
 *
 * @param received - A modern-era result or JSON-RPC response.
 * @returns `true` when `resultType` is present and a known value (`'complete'` or `'input_required'`).
 */
export function assertHasResultType(received: unknown): boolean {
  if (typeof received !== 'object' || received === null) return false;
  const obj = received as {
    resultType?: string
    result?: { resultType?: string }
  };
  const rt = obj.resultType ?? obj.result?.resultType;
  return rt === 'complete' || rt === 'input_required';
}

/**
 * Pure assertion: whether a result is an MRTR `input_required` interim result with
 * `inputRequests`. Accepts both a bare result and a wrapped `{ result }` response.
 *
 * @param received - A modern-era result or JSON-RPC response.
 * @returns `true` when `resultType` is `'input_required'` and `inputRequests` is present.
 */
export function assertInputRequiredResult(received: unknown): boolean {
  if (typeof received !== 'object' || received === null) return false;
  const obj = received as {
    resultType?: string
    inputRequests?: unknown
    result?: { resultType?: string; inputRequests?: unknown }
  };
  const resultType = obj.resultType ?? obj.result?.resultType;
  const inputRequests = obj.inputRequests ?? obj.result?.inputRequests;
  return resultType === 'input_required' && inputRequests !== undefined;
}

/**
 * Registers the modern-era matchers with Vitest.
 *
 * @internal Call this from {@link registerMatchers} in `matchers.ts`.
 * @param extend - Vitest's `expect.extend`-compatible registration function.
 */
export function registerModernMatchers(
  extend: (matchers: Record<string, unknown>) => void,
): void {
  extend({
    toHaveRequestMeta(this: AnyMatcherState, received: unknown): MatcherResult {
      const pass = assertHasRequestMeta(received);
      return result(pass, received, 'a request with a io.modelcontextprotocol/protocolVersion _meta envelope');
    },

    toHaveMcpHeaders(this: AnyMatcherState, received: unknown): MatcherResult {
      const pass = assertHasMcpHeaders(received);
      return result(pass, received, 'MCP-Protocol-Version and Mcp-Method headers');
    },

    toBeCompleteResult(this: AnyMatcherState, received: unknown): MatcherResult {
      const pass = assertCompleteResult(received);
      return result(pass, received, '{ resultType: "complete" }');
    },

    toHaveResultType(this: AnyMatcherState, received: unknown): MatcherResult {
      const pass = assertHasResultType(received);
      return result(pass, received, 'a result with resultType (\'complete\' or \'input_required\') — absent is a spec violation in the modern era');
    },

    toBeInputRequiredResult(this: AnyMatcherState, received: unknown): MatcherResult {
      const pass = assertInputRequiredResult(received);
      return result(pass, received, '{ resultType: "input_required", inputRequests: {...} }');
    },
  });
}

/**
 * Builds a unified Vitest matcher result.
 *
 * @param pass - Whether the assertion passed.
 * @param actual - The received value, for diagnostics.
 * @param expected - Human-readable description of the expected shape.
 * @returns A Vitest matcher result object.
 */
function result(pass: boolean, actual: unknown, expected: string): MatcherResult {
  return {
    pass,
    actual,
    expected,
    message: () =>
      pass
        ? `Expected value not to match: ${expected}`
        : `Expected ${expected}, got ${JSON.stringify(actual)}`,
  };
}
