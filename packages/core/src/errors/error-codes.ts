/**
 * MCP error code enumerations.
 * Covers JSON-RPC 2.0 standard error codes + MCP extended error codes.
 */

/** JSON-RPC 2.0 standard error codes. */
export enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

/** MCP-specific error codes. */
export enum McpErrorCode {
  /** Server has not been initialized. */
  ServerNotInitialized = -32002,
  /** Server is processing a request. */
  RequestInProgress = -32001,
  /** Request cancelled. */
  RequestCancelled = -32000,
}