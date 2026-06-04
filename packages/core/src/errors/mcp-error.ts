/**
 * MCP TestKit error class hierarchy.
 */

import type { McpResponse } from '../types/mcp.js'

/**
 * Base error class, parent of all testkit errors.
 * @property code - JSON-RPC error code
 * @property data - Optional error data (for MCP error responses)
 * @property name - Error name (default 'McpError')
 */
export class McpError extends Error {
  /** JSON-RPC error code. */
  readonly code: number

  /** Optional error data. */
  readonly data?: unknown

  constructor(message: string, code: number, data?: unknown) {
    super(message)
    this.name = 'McpError'
    this.code = code
    this.data = data
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Serializes the error to a JSON-RPC error object.
   * @returns JSON-RPC error compatible object
   */
  toJSON(): { code: number; message: string; data?: unknown } {
    return {
      code: this.code,
      message: this.message,
      ...(this.data !== undefined && { data: this.data }),
    }
  }

  /**
   * Creates an McpError from a JSON-RPC response if it contains an error.
   * @param response - JSON-RPC response to extract error from
   * @returns McpError instance, or null if response has no error
   */
  static fromResponse(response: McpResponse): McpError | null {
    if ('error' in response && response.error) {
      return new McpError(
        response.error.message,
        response.error.code,
        response.error.data
      )
    }
    return null
  }
}

/**
 * Transport layer error (network, connection, encoding/decoding, etc.).
 * @property command - Command that was attempted (optional)
 * @property cause - Error cause (optional)
 */
export class TransportError extends McpError {
  readonly command?: string
  readonly cause?: Error

  constructor(message: string, command?: string, cause?: Error) {
    super(message, -32000)
    this.name = 'TransportError'
    this.command = command
    this.cause = cause
  }
}

/**
 * Timeout error.
 * @property timeout - Timeout duration in ms
 * @property method - The method that timed out (optional, Phase 2)
 */
export class TimeoutError extends McpError {
  readonly timeout: number
  /** The method that timed out. */
  readonly method?: string

  constructor(timeout: number, method?: string) {
    const msg = method
      ? `Method '${method}' timed out after ${timeout}ms`
      : `Operation timed out after ${timeout}ms`
    super(msg, -32000)
    this.name = 'TimeoutError'
    this.timeout = timeout
    this.method = method
  }
}

/**
 * Server spawn failure error.
 * @property command - Command that was attempted to start
 * @property args - Command arguments
 * @property exitCode - Process exit code (null if not yet exited)
 * @property cause - Error cause (optional, legacy)
 */
export class ServerSpawnError extends McpError {
  readonly command: string
  readonly args: string[]
  readonly exitCode: number | null
  /** @deprecated Use exitCode instead. */
  readonly cause?: string

  constructor(command: string, args: string[], exitCode: number | null, cause?: string) {
    super(`Failed to spawn server: ${command} ${args.join(' ')}`, -32000)
    this.name = 'ServerSpawnError'
    this.command = command
    this.args = args
    this.exitCode = exitCode
    this.cause = cause
  }
}

/**
 * Connection lost error.
 * Raised when the transport connection is unexpectedly terminated.
 * @property reason - Human-readable reason for the disconnection
 */
export class ConnectionLostError extends McpError {
  readonly reason: string

  constructor(reason: string) {
    super(`Connection lost: ${reason}`, -32000)
    this.name = 'ConnectionLostError'
    this.reason = reason
  }
}