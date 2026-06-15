/**
 * Transport layer abstract interface.
 * Defines how to communicate with an MCP server (currently stdio, HTTP in future).
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
