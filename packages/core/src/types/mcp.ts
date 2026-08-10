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

/**
 * Initialize request parameters.
 *
 * @deprecated Legacy-era (2024-10-07 … 2025-11-25) only. The 2026-07-28 modern era
 * removes the `initialize` handshake — clients use `server/discover` instead, and
 * every request carries its protocol version in `_meta`. Scheduled for removal at
 * the first revision on or after 2027-07-28.
 */
export interface InitializeParams {
  protocolVersion?: string
  capabilities?: {
    roots?: { listChanged?: boolean }
    sampling?: Record<string, never>
    /**
     * Server logging capability (legacy-era).
     * @deprecated SEP-2577 — deprecated as of 2026-07-28. Use stderr (stdio) or
     * OpenTelemetry instead. Scheduled for removal at the first revision on or
     * after 2027-07-28.
     */
    logging?: Record<string, never>
  }
  clientInfo?: {
    name: string
    version: string
  }
}

/**
 * Initialize response result.
 *
 * @deprecated Legacy-era only. The `sampling`, `roots`, and `logging` capabilities
 * are scheduled for removal (SEP-2577) at the first revision on or after 2027-07-28.
 * Modern-era servers advertise capabilities via `server/discover` instead.
 */
export interface InitializeResult {
  protocolVersion: string
  capabilities: {
    roots?: { listChanged?: boolean }
    sampling?: Record<string, never>
    /**
     * Server logging capability (legacy-era).
     * @deprecated SEP-2577 — deprecated as of 2026-07-28. Use stderr (stdio) or
     * OpenTelemetry instead. Scheduled for removal at the first revision on or
     * after 2027-07-28.
     */
    logging?: Record<string, never>
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

/**
 * Resource subscription.
 *
 * @deprecated Legacy-era only. The 2026-07-28 modern era replaces
 * `resources/subscribe` / `resources/unsubscribe` with the
 * `resourceSubscriptions` field of a `subscriptions/listen` stream. Scheduled for
 * removal at the first revision on or after 2027-07-28.
 */
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
