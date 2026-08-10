/**
 * Modern-era (2026-07-28) request/response helpers.
 *
 * Pure, flat functions for attaching the `_meta` envelope to requests and extracting
 * `resultType` / metadata from responses — shared by `createMcpServer`.
 */

import { REQUEST_META_KEYS } from '../types/modern/meta.js';
import { RESULT_TYPE, type McpResultType } from '../types/modern/mrtr.js';
import { createRequest } from './protocol.js';
import type { McpProtocolOptions } from './options.js';

/**
 * Context for a per-instance request builder.
 */
export interface RequestBuilderContext {
  /** Protocol options carried into every request. */
  proto: McpProtocolOptions
  /** The negotiated era; enters the `_meta` envelope only when modern. */
  era: 'legacy' | 'modern' | undefined
  /** The negotiated protocol version. */
  protocolVersion: string
  /** Client identity stamped into the envelope. */
  clientInfo: { name: string; version: string }
}

/**
 * Builds a request factory bound to a connection's era/version/identity.
 *
 * Returns a flat `(id, method, params) => request` function. When the connection is
 * modern, the `_meta` envelope is attached automatically.
 *
 * @param ctx - Per-instance request context.
 * @returns A function that produces modern-era-aware JSON-RPC requests.
 */
export function createRequestBuilder(ctx: RequestBuilderContext) {
  return function buildRequest(
    id: number,
    method: string,
    params?: Record<string, unknown>,
  ): Record<string, unknown> {
    const request = createRequest(id, method, params, ctx.proto) as unknown as Record<string, unknown>
    if (ctx.era === 'modern') {
      attachRequestMeta(
        request as unknown as RequestWithParams,
        {
          protocolVersion: ctx.protocolVersion,
          clientInfo: ctx.clientInfo,
          clientCapabilities: ctx.proto.metaKeys?.clientCapabilities ?? {},
        },
      )
    }
    return request
  }
}

/**
 * A JSON-RPC request object with params (before `_meta` attachment).
 */
export interface RequestWithParams {
  method: string
  params?: Record<string, unknown>
}

/** A response payload that may carry modern-era `resultType` and `_meta`. */
export interface ParsedBody {
  resultType?: string
  _meta?: Record<string, unknown>
  inputRequests?: unknown
  requestState?: string
}

/**
 * Attaches the modern-era `_meta` envelope to a request's params when the connection
 * is in the modern era.
 *
 * @param request - The request to decorate (mutated in place).
 * @param opts - Envelope contents.
 * @returns The same request, for chaining.
 */
export function attachRequestMeta(
  request: RequestWithParams,
  opts: {
    protocolVersion: string
    clientInfo: { name: string; version: string }
    clientCapabilities?: Record<string, unknown>
  },
): RequestWithParams {
  const params = request.params ?? {}
  const meta = (params._meta as Record<string, unknown> | undefined) ?? {}
  meta[REQUEST_META_KEYS.protocolVersion] = opts.protocolVersion
  meta[REQUEST_META_KEYS.clientInfo] = opts.clientInfo
  if (opts.clientCapabilities) {
    meta[REQUEST_META_KEYS.clientCapabilities] = opts.clientCapabilities
  }
  params._meta = meta
  request.params = params
  return request
}

/**
 * Extracts the effective result body from a response, tolerating both transport
 * shapes — a wrapped `{ result }` response (HttpTransport) or an already-unwrapped
 * result (StdioTransport).
 *
 * @param response - The transport-sent response.
 * @returns The unwrapped result body.
 */
export function unwrapResult(response: unknown): unknown {
  if (typeof response !== 'object' || response === null) return response
  const raw = response as { result?: unknown }
  return 'result' in raw ? raw.result : response
}

/**
 * Returns the modern-era `resultType` of a response, if present.
 *
 * @param response - The transport-sent response.
 * @returns The resultType discriminator, or `undefined`.
 */
export function readResultType(response: unknown): McpResultType | undefined {
  const result = unwrapResult(response) as ParsedBody | undefined
  const rt = result?.resultType as McpResultType | undefined
  return rt === RESULT_TYPE.COMPLETE || rt === RESULT_TYPE.INPUT_REQUIRED ? rt : undefined
}

/**
 * Reads server identity stamped in a response's `_meta.serverInfo`, if any.
 *
 * @param response - The transport-sent response.
 * @returns The server identity, or `undefined`.
 */
export function readServerInfo(
  response: unknown,
): { name: string; version: string } | undefined {
  const result = unwrapResult(response) as ParsedBody | undefined
  const info = result?._meta?.[REQUEST_META_KEYS.serverInfo]
  return typeof info === 'object' && info !== null
    ? (info as { name: string; version: string })
    : undefined
}

/**
 * Returns whether a response is an MRTR `input_required` interim result.
 *
 * @param response - The transport-sent response.
 * @returns `true` when `resultType` is `'input_required'`.
 */
export function isInputRequiredResponse(response: unknown): boolean {
  return readResultType(response) === RESULT_TYPE.INPUT_REQUIRED
}