/**
 * Custom Vitest matchers for MCP testing.
 * Extends expect() with MCP-specific assertion capabilities.
 *
 * This file contains both the Vitest module augmentation (type declarations)
 * and the type exports used by the matchers implementation.
 */

/// <reference types="vitest/globals" />

/**
 * Registered matchers return object from registerMatchers.
 */
export interface RegisteredMatchers {
  register: (name: string, fn: (...args: unknown[]) => unknown) => void
}

/**
 * MCP content item.
 */
export interface McpContentItem {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
  resource?: { uri: string; mimeType?: string }
}

declare module 'vitest' {
  interface Assertion {
    // Phase 1
    /**
     * Asserts a valid MCP JSON-RPC response.
     */
    toBeValidMcpResponse(): void

    /**
     * Asserts an MCP success response (with result).
     */
    toBeMcpSuccess(): void

    /**
     * Asserts an MCP error response.
     * @param code - Expected error code (optional)
     */
    toBeMcpError(code?: number): void

    /**
     * Asserts a well-formed JSON-RPC request.
     */
    toBeValidJsonRpcRequest(): void

    // Phase 2 — Content matchers
    /**
     * Asserts the response has a content array with at least one entry.
     * @param options - Optional filter by content type
     * @param options.contentType - Filter by content type: 'text' | 'image' | 'resource'
     */
    toHaveContent(options?: { contentType?: string }): void

    /**
     * Asserts the response content contains the given text.
     * @param contains - Substring to find in text content
     * @param options - Options for the assertion
     * @param options.contentType - Filter by content type
     */
    toHaveText(contains: string, options?: { ignoreCase?: boolean }): void

    /**
     * Asserts the first content entry has the specified type.
     * @param type - Expected content type: 'text' | 'image' | 'resource'
     */
    toHaveContentType(type: 'text' | 'image' | 'resource'): void

    /**
     * Asserts this is an MCP error response (jsonrpc + error).
     */
    toBeErrorResponse(): void

    /**
     * Asserts the error matches the given code/message constraints.
     * @param options - Expected error constraints
     * @param options.code - Expected error code
     * @param options.message - Expected error message (string or RegExp)
     */
    toMatchMcpError(options: { code?: number; message?: string | RegExp }): void

    // Phase 2 — Error object matchers
    /**
     * Asserts the value is a TransportError instance.
     * @param expectedMessage - Optional expected error message substring
     */
    toBeTransportError(expectedMessage?: string): void

    /**
     * Asserts the value is a TimeoutError instance.
     * @param expectedMethod - Optional expected method name
     */
    toBeTimeoutError(expectedMethod?: string): void

    // Phase 2 — Tool response matchers
    /**
     * Asserts the tool response originated from the specified tool.
     * Checks that the response structure matches a tool call response.
     * @param toolName - Expected tool name
     * @param expectedArgs - Optional expected tool arguments
     */
    toBeFromTool(toolName: string, expectedArgs?: Record<string, unknown>): void

    // Phase 3 — Capability matchers (async, server-based)
    /**
     * Asserts the server has the given capability.
     * @param capability - Capability name to check
     */
    toHaveCapability(capability: string): Promise<void>

    /**
     * Asserts the server has a tool with the given name.
     * @param toolName - Tool name to check
     */
    toHaveTool(toolName: string): Promise<void>

    /**
     * Asserts the server has a resource with the given URI.
     * @param uri - Resource URI to check
     */
    toHaveResource(uri: string): Promise<void>

    // Phase 3 — Schema matcher
    /**
     * Validates a tool's inputSchema against a target schema.
     * Checks that all properties and types in the target schema are present in the tool's inputSchema.
     * @param schema - Expected schema definition (properties and required fields)
     */
    toMatchToolSchema(schema: Record<string, unknown>): void

    // Phase 4 — Modern era (2026-07-28) matchers
    /**
     * Asserts a request object carries a modern-era `_meta` envelope with the
     * `io.modelcontextprotocol/protocolVersion` key.
     */
    toHaveRequestMeta(): void

    /**
     * Asserts an HTTP request carries the standard MCP headers
     * (`MCP-Protocol-Version`, `Mcp-Method`).
     */
    toHaveMcpHeaders(): void

    /**
     * Asserts a result has `resultType: 'complete'`.
     */
    toBeCompleteResult(): void

    /**
     * Asserts a modern-era result carries a `resultType` discriminator.
     * Absent `resultType` is a spec violation in the modern era (2026-07-28).
     */
    toHaveResultType(): void

    /**
     * Asserts a result is an MRTR `input_required` result with `inputRequests`.
     */
    toBeInputRequiredResult(): void
  }
}
