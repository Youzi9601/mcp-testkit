/**
 * Multi Round-Trip Request (MRTR) driver.
 *
 * In the modern era (2026-07-28), a server answers `tools/call` with
 * `resultType: 'input_required'` to ask the client for more input. The client
 * resolves the embedded `inputRequests` and retries the call with `inputResponses`,
 * echoing `requestState` byte-for-byte on every retry.
 *
 * This module drives that round-trip loop the way the official SDK's client does.
 */

import {
  isInputRequiredResponse,
  unwrapResult,
  type ParsedBody,
} from '../protocol/helpers.js';

/** A function that sends one `tools/call` and returns the raw response. */
export type SendCall = (params: Record<string, unknown>) => Promise<unknown>;

/** Resolves the server's `input_required` requests into `inputResponses`. */
export type ResolveInput = (
  inputRequests: Record<string, unknown>,
) => Promise<Record<string, unknown> | undefined>;

/** Options for {@link runCallWithMrtr}. */
export interface MrtrOptions {
  /** Maximum retry rounds before giving up. Default 10. */
  maxRounds?: number
  /** Resolves embedded input requests. When omitted, the first interim result is returned as-is. */
  resolveInput?: ResolveInput
}

/**
 * Runs a `tools/call`, following MRTR retries until a complete result or the round
 * cap is reached.
 *
 * @param sendCall - Sends one `tools/call` with the given params, returning the raw
 *   response.
 * @param baseParams - The original tool call params (name + arguments).
 * @param options - MRTR options.
 * @returns The final (`complete`) result, or the raw `input_required` result when no
 *   resolver is configured / the resolver aborts the loop.
 */
export async function runCallWithMrtr(
  sendCall: SendCall,
  baseParams: Record<string, unknown>,
  options: MrtrOptions = {},
): Promise<unknown> {
  const maxRounds = options.maxRounds ?? 10;
  const resolveInput = options.resolveInput;

  let inputResponses: Record<string, unknown> | undefined;
  let requestState: string | undefined;

  for (let round = 0; round < maxRounds; round++) {
    const params: Record<string, unknown> = { ...baseParams };
    if (inputResponses) params['inputResponses'] = inputResponses;
    if (requestState !== undefined) params['requestState'] = requestState;

    const response = await sendCall(params);

    if (!isInputRequiredResponse(response) || !resolveInput) {
      return unwrapResult(response);
    }

    // Echo requestState byte-exact on the retry.
    const body = unwrapResult(response) as ParsedBody;
    requestState = body.requestState;

    const answers = await resolveInput(
      (body.inputRequests as Record<string, unknown>) ?? {},
    );
    if (answers === undefined) {
      // Test opted out of resolving this round — surface the interim result.
      return unwrapResult(response);
    }
    inputResponses = answers;
  }

  // Rounds exhausted without a complete result — surface the last excchange.
  const finalResponse = await sendCall({ ...baseParams, ...(inputResponses && { inputResponses }) });
  return unwrapResult(finalResponse);
}
