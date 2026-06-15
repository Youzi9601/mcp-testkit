/**
 * MCP (Model Context Protocol) type definitions.
 * Based on https://modelcontextprotocol.io/specification 2024-11-05
 */

/**
 * JSON-RPC 2.0 request object.
 * @property jsonrpc - JSON-RPC version, must be "2.0"
 * @property id - Request ID (number | string | null)
 * @property method - Method name (e.g., "tools/call", "initialize")
 * @property params - Method parameters (optional)
 */
export interface McpJsonRpcRequest {
  jsonrpc: '2.0'
  id: number | string | null
  method: string
  params?: Record<string, unknown>
}

/**
 * JSON-RPC 2.0 success response object.
 * @property jsonrpc - JSON-RPC version, must be "2.0"
 * @property id - Corresponding request ID
 * @property result - Method result
 */
export interface McpSuccessResponse {
  jsonrpc: '2.0'
  id: number | string | null
  result: unknown
}

/**
 * JSON-RPC 2.0 error response object.
 * @property jsonrpc - JSON-RPC version, must be "2.0"
 * @property id - Corresponding request ID
 * @property error - Error object
 */
export interface McpErrorResponse {
  jsonrpc: '2.0'
  id: number | string | null
  error: {
    code: number
    message: string
    data?: unknown
  }
}

/** JSON-RPC 2.0 response (success or error). */
export type McpResponse = McpSuccessResponse | McpErrorResponse;

/** Initialize request parameters. */
export interface InitializeParams {
  protocolVersion?: string
  capabilities?: {
    roots?: { listChanged?: boolean }
    sampling?: Record<string, never>
  }
  clientInfo?: {
    name: string
    version: string
  }
}

/** Initialize response result. */
export interface InitializeResult {
  protocolVersion: string
  capabilities: {
    roots?: { listChanged?: boolean }
    sampling?: Record<string, never>
  }
  serverInfo: {
    name: string
    version: string
  }
}

/** Tool definition. */
export interface McpTool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
}

/** Tool call request parameters. */
export interface ToolCallParams {
  name: string
  arguments?: Record<string, unknown>
}

/** Tool call response result. */
export interface ToolCallResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

/** Resource definition. */
export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

/** Resource subscription. */
export interface ResourceSubscription {
  uri: string
}

/** Prompt definition. */
export interface McpPrompt {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}
