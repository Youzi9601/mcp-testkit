/**
 * MCP error code enumerations.
 * Covers JSON-RPC 2.0 standard error codes + MCP extended error codes.
 *
 * The 2026-07-28 modern era renumbered a set of extended error codes.
 */

/** JSON-RPC 2.0 standard error codes. */
export enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

/** MCP extended error codes (2026-07-28 renumbered set). */
export enum McpErrorCode {
  /** Request cancelled. */
  RequestCancelled = -32000,

  /**
   * Server is processing a request.
   * @deprecated Legacy-era only. Superseded by HTTP `400` + `-32020` on modern-era
   * handshakes. Scheduled for removal at the first revision on or after 2027-07-28.
   */
  RequestInProgress = -32001,

  /**
   * Server has not been initialized.
   * @deprecated Legacy-era only. The 2026-07-28 modern era removes the `initialize`
   * handshake entirely, and `-32002` is no longer assigned to this condition.
   * Scheduled for removal at the first revision on or after 2027-07-28.
   */
  ServerNotInitialized = -32002,

  /**
   * Header mismatch (SEP-2243).
   * A request's `Mcp-Method` / `Mcp-Name` / `MCP-Protocol-Version` header disagrees
   * with its JSON-RPC body, or a required `Mcp-Param-*` header is missing/malformed.
   * Answers HTTP `400`.
   */
  HeaderMismatch = -32020,

  /**
   * Missing required client capability.
   * A mid-call `input_required` gate refused an embedded request whose capability the
   * caller did not declare. Answers HTTP `400`.
   */
  MissingRequiredClientCapability = -32021,

  /** Unsupported protocol version. */
  UnsupportedProtocolVersion = -32022,
}