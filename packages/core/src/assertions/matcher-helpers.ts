/**
 * Matcher utility helpers for MCP response assertions.
 *
 * This module contains pure helper functions used by Vitest matchers in `matchers.ts`.
 * All functions are type guards or data extractors — no side effects.
 */

import type { McpResponse, McpErrorResponse } from '../types/mcp.js';

/**
 * Type of the `this` context Vitest provides to each custom matcher.
 *
 * Shared by the legacy (`matchers.ts`) and modern (`modern-matchers.ts`) matcher
 * implementations so they do not each redefine it.
 */
export type AnyMatcherState = {
  isNot: boolean
  promise: Promise<unknown>
  utils: readonly { name: string; fn: (...args: never[]) => unknown }[]
  testPath?: string
};

// ─── Shared Types ────────────────────────────────────────────────────────────

/**
 * JSON-RPC content item from an MCP response result.
 */
export interface JsonRpcContent {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
  resource?: { uri: string; mimeType?: string }
}

// ─── Core Type Checks ─────────────────────────────────────────────────────────

/**
 * Checks whether a value is a valid MCP JSON-RPC response.
 *
 * @param value - The value to check
 * @returns True if `value` is an object with `jsonrpc: '2.0'` and either `result` or `error`
 *
 * @example
 * ```ts
 * isMcpResponse({ jsonrpc: '2.0', id: 1, result: {} }) // true
 * isMcpResponse({ jsonrpc: '1.0', id: 1 }) // false
 * ```
 */
export function isMcpResponse(value: unknown): value is McpResponse {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return obj.jsonrpc === '2.0' && ('result' in obj || 'error' in obj);
}

/**
 * Checks whether a value is an MCP error response.
 *
 * @param value - The value to check
 * @returns True if `value` has an `error` property containing a valid error object
 *
 * @example
 * ```ts
 * isErrorResponse({ jsonrpc: '2.0', id: 1, error: { code: -32600, message: 'Invalid Request' } }) // true
 * isErrorResponse({ jsonrpc: '2.0', id: 1, result: {} }) // false
 * ```
 */
export function isErrorResponse(value: unknown): value is McpErrorResponse {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return 'error' in obj && typeof obj.error === 'object' && obj.error !== null;
}

// ─── Content Extraction ───────────────────────────────────────────────────────

/**
 * Extracts content array from an MCP response, optionally filtered by content type.
 *
 * @param response - The MCP response or raw object
 * @param contentType - Optional filter: `'text'`, `'image'`, or `'resource'`
 * @returns Content array filtered by type, or all content if no filter, or `undefined`
 *
 * @example
 * ```ts
 * const content = getContent(response, 'text')
 * ```
 */
export function getContent(response: unknown, contentType?: string): JsonRpcContent[] | undefined {
  let content: JsonRpcContent[] | undefined;

  if (isMcpResponse(response)) {
    if ('result' in response && response.result && typeof response.result === 'object') {
      const result = response.result as Record<string, unknown>;
      if (Array.isArray(result.content)) {
        content = result.content as JsonRpcContent[];
      }
    }
  } else if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    if (Array.isArray(obj.content)) {
      content = obj.content as JsonRpcContent[];
    }
  }

  if (!content) return undefined;
  if (contentType) {
    return content.filter(item => item.type === contentType);
  }
  return content;
}

/**
 * Extracts concatenated text content from an MCP response.
 *
 * @param response - The MCP response or raw object
 * @param ignoreCase - If true, perform case-insensitive comparison
 * @returns Concatenated text string from all text-type content items
 *
 * @example
 * ```ts
 * const text = getTextContent(response)
 * const lower = getTextContent(response, true)
 * ```
 */
export function getTextContent(response: unknown, ignoreCase = false): string {
  const content = getContent(response);
  if (!content) return '';
  const texts = content.filter(item => item.type === 'text' && item.text).map(item => item.text as string);
  let result = texts.join('');
  if (ignoreCase) result = result.toLowerCase();
  return result;
}

/**
 * Returns the type of the first content item in a response.
 *
 * @param response - The MCP response or raw object
 * @returns The content type string (`'text'`, `'image'`, or `'resource'`), or `undefined`
 *
 * @example
 * ```ts
 * const type = getFirstContentType(response) // 'text'
 * ```
 */
export function getFirstContentType(response: unknown): string | undefined {
  const content = getContent(response);
  if (!content || content.length === 0) return undefined;
  return content[0].type;
}

// ─── MCP Error Utilities ──────────────────────────────────────────────────────

/**
 * Checks whether a value is a valid MCP error object.
 *
 * @param value - The value to check
 * @returns True if `value` has numeric `code` and string `message` properties
 *
 * @example
 * ```ts
 * isMcpErrorObj({ code: -32600, message: 'Invalid Request' }) // true
 * ```
 */
export function isMcpErrorObj(value: unknown): value is { code: number; message: string; data?: unknown } {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.code === 'number' && typeof obj.message === 'string';
}

/**
 * Extracts the MCP error object from a response or raw value.
 *
 * @param value - The value to extract error from
 * @returns The error object `{ code, message, data? }`, or `null` if none found
 *
 * @example
 * ```ts
 * const err = getMcpError(response)
 * if (err) console.log(err.code, err.message)
 * ```
 */
export function getMcpError(value: unknown): { code: number; message: string; data?: unknown } | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  if ('error' in obj && isMcpErrorObj(obj.error)) {
    return obj.error as { code: number; message: string; data?: unknown };
  }
  if (isMcpErrorObj(obj)) {
    return { code: obj.code as number, message: obj.message as string, data: obj.data };
  }
  return null;
}

/**
 * Checks whether a value represents a transport-layer error.
 *
 * @param value - The value to check
 * @param expectedMessage - Optional substring to match against the error message
 * @returns True if the value is a `TransportError`, `ConnectionLostError`, or an `Error` with code `-32000`
 *
 * @example
 * ```ts
 * isTransportError(error) // true for TransportError
 * isTransportError(error, 'connection refused') // true only if message includes 'connection refused'
 * ```
 */
export function isTransportError(value: unknown, expectedMessage?: string): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (obj.name === 'TransportError' || obj.name === 'ConnectionLostError') {
    if (expectedMessage && typeof obj.message === 'string') {
      return obj.message.includes(expectedMessage);
    }
    return true;
  }
  if (obj.name === 'Error' && 'code' in obj && obj.code === -32000) {
    if (expectedMessage && typeof obj.message === 'string') {
      return obj.message.includes(expectedMessage);
    }
    return true;
  }
  return false;
}

/**
 * Checks whether a value represents a timeout error.
 *
 * @param value - The value to check
 * @param expectedMethod - Optional method name the timeout occurred on
 * @returns True if the value is a `TimeoutError`, optionally checking `method` match
 *
 * @example
 * ```ts
 * isTimeoutError(error) // true for TimeoutError
 * isTimeoutError(error, 'tools/list') // true only if method matches
 * ```
 */
export function isTimeoutError(value: unknown, expectedMethod?: string): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (obj.name === 'TimeoutError') {
    if (expectedMethod && obj.method !== expectedMethod) return false;
    return true;
  }
  return false;
}

/**
 * Checks whether an error response originated from a specific tool.
 *
 * @param value - The value to check
 * @param expectedToolName - The expected tool name in the error data
 * @param expectedArgs - Optional args object to match exactly
 * @returns True if the error's `data.tool` matches `expectedToolName` (and optionally `data.args`)
 *
 * @example
 * ```ts
 * isFromToolError(error, 'my-tool')
 * isFromToolError(error, 'my-tool', { arg: 'value' })
 * ```
 */
export function isFromToolError(
  value: unknown,
  expectedToolName: string,
  expectedArgs?: Record<string, unknown>,
): boolean {
  if (!isErrorResponse(value)) return false;
  const mcpError = getMcpError(value);
  if (!mcpError) return false;
  const data = mcpError.data as { tool?: string; args?: Record<string, unknown> } | undefined;
  if (!data?.tool) return false;
  if (data.tool !== expectedToolName) return false;
  if (expectedArgs) return JSON.stringify(data.args) === JSON.stringify(expectedArgs);
  return true;
}
