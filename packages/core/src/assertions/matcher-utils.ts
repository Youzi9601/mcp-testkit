/**
 * Matcher utility functions for MCP testing.
 * Shared helpers used by both matchers and test assertions.
 */

import type { McpResponse, McpErrorResponse } from '../types/mcp.js';

// ─── Helper Types ────────────────────────────────────────────────────────────

/**
 * JSON-RPC content item from MCP response.
 */
export interface JsonRpcContent {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
  resource?: { uri: string; mimeType?: string }
}

// ─── Core Type Checks ────────────────────────────────────────────────────────

/**
 * Checks if a value is an MCP response object.
 */
export function isMcpResponse(value: unknown): value is McpResponse {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return obj.jsonrpc === '2.0' && ('result' in obj || 'error' in obj);
}

/**
 * Checks if a value has an error field with proper structure.
 */
export function isErrorResponse(value: unknown): value is McpErrorResponse {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return 'error' in obj && typeof obj.error === 'object' && obj.error !== null;
}

// ─── Content Extraction ──────────────────────────────────────────────────────

/**
 * Extracts content array from various response shapes.
 */
export function getContent(
  response: unknown,
  contentType?: string,
): JsonRpcContent[] | undefined {
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
 * Gets text content concatenated from all text-type content items.
 */
export function getTextContent(response: unknown, ignoreCase = false): string {
  const content = getContent(response);
  if (!content) return '';

  const texts = content
    .filter(item => item.type === 'text' && item.text)
    .map(item => item.text as string);

  let result = texts.join('');
  if (ignoreCase) {
    result = result.toLowerCase();
  }
  return result;
}

/**
 * Gets the first content item's type, or undefined if no content.
 */
export function getFirstContentType(response: unknown): string | undefined {
  const content = getContent(response);
  if (!content || content.length === 0) return undefined;
  return content[0].type;
}

// ─── MCP Error Utilities ─────────────────────────────────────────────────────

/**
 * Checks if a value is an MCP error object.
 */
function isMcpErrorObj(value: unknown): value is { code: number; message: string; data?: unknown } {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.code === 'number' && typeof obj.message === 'string';
}

/**
 * Extracts MCP error from various response shapes.
 */
export function getMcpError(
  value: unknown,
): { code: number; message: string; data?: unknown } | null {
  if (!value || typeof value !== 'object') return null;

  const obj = value as Record<string, unknown>;

  // MCP error response
  if ('error' in obj && isMcpErrorObj(obj.error)) {
    return obj.error as { code: number; message: string; data?: unknown };
  }

  // Direct error object
  if (isMcpErrorObj(obj)) {
    return { code: obj.code as number, message: obj.message as string, data: obj.data };
  }

  return null;
}

// ─── Error Type Checks ───────────────────────────────────────────────────────

/**
 * Checks if value is a TransportError or subclass.
 */
export function isTransportError(value: unknown, expectedMessage?: string): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  // Check by name property (works for class instances)
  if (obj.name === 'TransportError' || obj.name === 'ConnectionLostError') {
    if (expectedMessage && typeof obj.message === 'string') {
      return obj.message.includes(expectedMessage);
    }
    return true;
  }

  // Check by error data structure
  if (obj.name === 'Error' && 'code' in obj && obj.code === -32000) {
    if (expectedMessage && typeof obj.message === 'string') {
      return obj.message.includes(expectedMessage);
    }
    return true;
  }

  return false;
}

/**
 * Checks if value is a TimeoutError or subclass.
 */
export function isTimeoutError(value: unknown, expectedMethod?: string): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  // Check by name property
  if (obj.name === 'TimeoutError') {
    if (expectedMethod && obj.method !== expectedMethod) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Checks if error response is from a specific tool.
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

  if (expectedArgs) {
    return JSON.stringify(data.args) === JSON.stringify(expectedArgs);
  }

  return true;
}
