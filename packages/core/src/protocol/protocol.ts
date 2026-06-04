/**
 * MCP JSON-RPC Protocol helpers.
 * Handles request/response creation and unwrapping.
 */

import type { McpJsonRpcRequest, McpResponse } from '../types/mcp.js'
import { JSONRPC_VERSION } from './constants.js'
import type { McpProtocolOptions } from './options.js'

/**
 * Creates a JSON-RPC request.
 *
 * @param id - Request ID
 * @param method - Method name
 * @param params - Parameters (optional)
 * @param options - Protocol options (optional)
 */
export function createRequest(
  id: number | string,
  method: string,
  params?: Record<string, unknown>,
  options?: McpProtocolOptions,
): McpJsonRpcRequest {
  const req = {
    jsonrpc: options?.jsonrpcVersion ?? (JSONRPC_VERSION as string),
    id,
    method,
    ...(params !== undefined ? { params } : {}),
  }
  // jsonrpc is always a string; cast to satisfy literal type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return req as any as McpJsonRpcRequest
}

/**
 * Creates a JSON-RPC notification (no response expected).
 *
 * @param method - Method name
 * @param params - Parameters (optional)
 * @param options - Protocol options (optional)
 */
export function createNotification(
  method: string,
  params?: Record<string, unknown>,
  options?: McpProtocolOptions,
): Omit<McpJsonRpcRequest, 'id'> {
  const notif = {
    jsonrpc: options?.jsonrpcVersion ?? (JSONRPC_VERSION as string),
    method,
    ...(params !== undefined ? { params } : {}),
  }
  // jsonrpc is always a string; cast to satisfy literal type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return notif as any as Omit<McpJsonRpcRequest, 'id'>
}

/**
 * Unwraps a JSON-RPC response, throwing if it is an error.
 *
 * @param response - JSON-RPC response
 * @throws {Error} if response is an error
 */
export function unwrapResponse(response: McpResponse): unknown {
  if ('error' in response) {
    const { code, message } = response.error
    throw Object.assign(new Error(message), { code, data: response.error.data })
  }
  return response.result
}