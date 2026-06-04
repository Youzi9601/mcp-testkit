/**
 * Transport interface for MCP server communication.
 * Copied from @youzi9601/mcp-testkit to keep this package self-contained.
 */

/**
 * Transport interface.
 * All transport implementations (StdioTransport, HttpTransport) must implement this interface.
 */
export interface Transport {
  /**
   * Starts the transport, preparing to communicate with the server.
   * @throws {ServerSpawnError} on startup failure
   * @throws {TimeoutError} on startup timeout
   */
  start(): Promise<void>

  /**
   * Sends a JSON-RPC request and waits for a response.
   * @param request - JSON-RPC request object
   * @returns JSON-RPC response
   * @throws {TransportError} on send/receive failure
   * @throws {TimeoutError} on response timeout
   */
  send(request: object): Promise<object>

  /**
   * Closes the transport, terminating the server connection.
   */
  close(): Promise<void>

  /**
   * Subscribes to server-pushed notifications.
   * @param handler - Handler for received notifications
   */
  onNotification?(handler: (notification: object) => void): void
}

/* istanbul ignore next */
// Error classes are only instantiated by transport implementations; not directly tested here
export class TransportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TransportError'
  }
}

/* istanbul ignore next */
export class ServerSpawnError extends Error {
  constructor(message: string, public readonly exitCode: number | null) {
    super(message)
    this.name = 'ServerSpawnError'
  }
}

/* istanbul ignore next */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}