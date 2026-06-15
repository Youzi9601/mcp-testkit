/**
 * Core API: createMcpServer
 * Creates an MCP server test instance.
 */

import { StdioTransport } from './transport/stdio-transport.js';
import {
  createRequest,
  LATEST_PROTOCOL_VERSION,
  DEFAULT_CLIENT_NAME,
  DEFAULT_CLIENT_VERSION,
} from './protocol/index.js';
import type { ServerOptions, McpServer } from './types/api.js';
import type { Transport } from './transport/types.js';

const DEFAULT_TIMEOUT = 5000;

/**
 * Creates an MCP server test instance.
 *
 * @param options - Server startup options
 * @param options.transport - Pre-configured transport instance (e.g., HttpTransport).
 *                            When provided, `command`/`args` are ignored.
 * @param options.command - Executable (e.g., `node`). Used when transport is not provided.
 * @param options.args - Arguments (e.g., `['server.js']`). Used when transport is not provided.
 * @param options.env - Extra environment variables (merged with existing env).
 * @param options.timeout - Startup timeout in ms, default 5000.
 * @param options.protocol - Protocol configuration (optional).
 * @returns Promise resolving to a server instance with control and assertion methods
 * @throws {ServerSpawnError} if the server fails to start
 * @throws {TimeoutError} if startup times out
 *
 * @example
 * ```ts
 * // StdioTransport (default)
 * const server = await createMcpServer({
 *   command: 'node',
 *   args: ['./dist/server.js'],
 * })
 *
 * // HttpTransport (via transport option)
 * import { HttpTransport } from '@youzi9601/mcp-testkit-http'
 * const transport = new HttpTransport({ url: 'http://localhost:3000/mcp' })
 * const server = await createMcpServer({ transport })
 *
 * const result = await server.callTool('readFile', { path: '/tmp/test.txt' })
 * await server.close()
 * ```
 */
export async function createMcpServer(options: ServerOptions): Promise<McpServer> {
  let transport: Transport;
  const proto = options.protocol ?? {};

  if (options.transport) {
    // Use the pre-configured transport; caller is responsible for its lifecycle
    // except start() — we call it here for convenience so both paths are uniform.
    transport = options.transport;
    await transport.start();
  } else if (options.command !== undefined && options.args !== undefined) {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    transport = new StdioTransport({
      command: options.command,
      args: options.args,
      env: options.env,
      timeout,
    });
    await transport.start();
  } else {
    throw new Error(
      'createMcpServer requires either options.transport or both options.command and options.args',
    );
  }

  // Monotonic request ID counter — avoids Date.now() collisions under concurrent calls
  let requestId = 0;
  const nextId = (): number => ++requestId;

  return {
    /**
     * Calls an MCP tool.
     * @param name - Tool name
     * @param args - Tool arguments
     */
    async callTool(name: string, args?: Record<string, unknown>): Promise<unknown> {
      const id = nextId();
      const request = createRequest(id, 'tools/call', { name, arguments: args ?? {} }, proto);
      const response = await transport.send(request);
      return response;
    },

    /** Gets server capabilities. */
    async getCapabilities(): Promise<unknown> {
      const id = nextId();
      const request = createRequest(
        id,
        'initialize',
        {
          protocolVersion: proto.protocolVersion ?? LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: {
            name: proto.clientInfo?.name ?? DEFAULT_CLIENT_NAME,
            version: proto.clientInfo?.version ?? DEFAULT_CLIENT_VERSION,
          },
        },
        proto,
      );
      const response = await transport.send(request);
      return response;
    },

    /** Lists available tools. */
    async listTools(): Promise<unknown> {
      const id = nextId();
      const request = createRequest(id, 'tools/list', undefined, proto);
      const response = await transport.send(request);
      return response;
    },

    /** Lists available resources. */
    async listResources(): Promise<unknown> {
      const id = nextId();
      const request = createRequest(id, 'resources/list', undefined, proto);
      const response = await transport.send(request);
      return response;
    },

    /** Closes the server connection. */
    async close(): Promise<void> {
      await transport.close();
    },
  };
}
