/**
 * Core API: createMcpServer
 * Creates an MCP server test instance.
 *
 * Supports both protocol eras:
 * - legacy (2024-10-07 … 2025-11-25): `initialize` handshake.
 * - modern (2026-07-28): stateless, `server/discover`, `_meta` envelope on every
 *   request, `resultType` on every result.
 */

import { StdioTransport } from './transport/stdio-transport.js';
import {
  createRequest,
  LATEST_PROTOCOL_VERSION,
  DEFAULT_CLIENT_NAME,
  DEFAULT_CLIENT_VERSION,
  MODERN_PROTOCOL_VERSION,
} from './protocol/index.js';
import { negotiateEra } from './protocol/era.js';
import {
  createRequestBuilder,
  unwrapResult,
  readResultType,
  readServerInfo,
} from './protocol/helpers.js';
import { RESULT_TYPE } from './types/modern/mrtr.js';
import type { DiscoverResult } from './types/modern/discover.js';
import type { SubscriptionListenParams, McpSubscription, HonoredSubscription, McpNotification } from './types/modern/subscription.js';
import type { ServerOptions, McpServer } from './types/api.js';
import type { Transport } from './transport/types.js';
import { runCallWithMrtr } from './mrtr/driver.js';
import { warnDeprecated, DEPRECATION_SUNSET_2027 } from './errors/deprecation.js';

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
 * @param options.protocol - Protocol configuration (optional). Set
 *                           `protocol.era.negotiation` to negotiate the modern-era
 *                           (2026-07-28) `server/discover` protocol.
 * @returns Promise resolving to a server instance with control and assertion methods
 * @throws {ServerSpawnError} if the server fails to start
 * @throws {TimeoutError} if startup times out
 *
 * @example
 * ```ts
 * // StdioTransport (default, legacy era)
 * const server = await createMcpServer({
 *   command: 'node',
 *   args: ['./dist/server.js'],
 * })
 *
 * // Negotiate the modern era (2026-07-28)
 * const server = await createMcpServer({
 *   command: 'node',
 *   args: ['./dist/server.js'],
 *   protocol: { era: { negotiation: 'auto' } },
 * })
 * const era = server.getProtocolEra() // 'modern' | 'legacy'
 *
 * const result = await server.callTool('readFile', { path: '/tmp/test.txt' })
 * await server.close()
 * ```
 */
export async function createMcpServer(options: ServerOptions): Promise<McpServer> {
  const transport = await startTransport(options);

  // Monotonic request ID counter — avoids Date.now() collisions under concurrent calls
  let requestId = 0;
  const nextId = (): number => ++requestId;

  const proto = options.protocol ?? {};
  const clientInfo = proto.clientInfo ?? {
    name: DEFAULT_CLIENT_NAME,
    version: DEFAULT_CLIENT_VERSION,
  };

  // Era negotiation (defaults to legacy unless configured).
  let era: 'legacy' | 'modern' = 'legacy';
  let negotiatedVersion = proto.protocolVersion ?? LATEST_PROTOCOL_VERSION;
  let discoverResult: DiscoverResult | undefined;
  let serverInfo: { name: string; version: string } | undefined;

  const negotiationMode = proto.era?.negotiation;
  if (negotiationMode) {
    const result = await negotiateEra(transport, {
      mode: negotiationMode,
      supportedProtocolVersions:
        proto.era?.supportedProtocolVersions ?? [
          MODERN_PROTOCOL_VERSION,
          ...(proto.supportedProtocolVersions ?? []),
        ],
      clientInfo,
    });
    era = result.era;
    negotiatedVersion = result.protocolVersion;
    discoverResult = result.discover;
  }

  // Flat request factory bound to this connection's era/version/identity.
  const buildRequest = createRequestBuilder({
    proto,
    era,
    protocolVersion: negotiatedVersion,
    clientInfo,
  });

  /**
   * Sends a method request and lifts modern-era metadata (`serverInfo`) from the result.
   */
  async function sendAndTrack(id: number, method: string, params?: Record<string, unknown>): Promise<unknown> {
    const response = await transport.send(buildRequest(id, method, params));
    const info = readServerInfo(response);
    if (info) serverInfo = info;
    return response;
  }

  /**
   * Returns the client-facing result for a method response, surfacing the MRTR
   * `input_required` discriminator when present.
   */
  function exposeResult(response: unknown): unknown {
    const result = unwrapResult(response);
    if (readResultType(response) === RESULT_TYPE.INPUT_REQUIRED) {
      return { ...(result as object), resultType: RESULT_TYPE.INPUT_REQUIRED };
    }
    return result;
  }

  // Subscription notification dispatcher — routes transport notifications to
  // open subscription handlers. Supports multiple concurrent subscriptions.
  const subscriptionHandlers = new Set<(notification: McpNotification) => void>();
  if (typeof transport.onNotification === 'function') {
    transport.onNotification((notification: object) => {
      const n = notification as { method?: string; params?: Record<string, unknown> };
      if (n?.method) {
        const mcpNotif: McpNotification = { method: n.method, params: n.params };
        for (const handler of subscriptionHandlers) {
          handler(mcpNotif);
        }
      }
    });
  }

  return {
    /**
     * Calls an MCP tool.
     *
     * On a modern-era connection with an MRTR `resolveInput` configured, `input_required`
     * interim results are resolved and retried automatically up to `maxRounds`.
     *
     * @param name - Tool name
     * @param args - Tool arguments
     */
    async callTool(name: string, args?: Record<string, unknown>): Promise<unknown> {
      return runCallWithMrtr(
        async (params) => {
          const id = nextId();
          const response = await sendAndTrack(id, 'tools/call', params);
          return response;
        },
        { name, arguments: args ?? {} },
        {
          maxRounds: options.mrtr?.maxRounds,
          resolveInput: options.mrtr?.resolveInput,
        },
      );
    },

    /**
     * Gets server capabilities via the legacy `initialize` handshake.
     *
     * @deprecated Legacy-era only. Use {@link McpServer.discover} for the modern era.
     */
    async getCapabilities(): Promise<unknown> {
      warnDeprecated(
        'initialize handshake',
        'server/discover (modern era)',
        DEPRECATION_SUNSET_2027,
      );
      const id = nextId();
      const response = await sendAndTrack(id, 'initialize', {
        protocolVersion: proto.protocolVersion ?? LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo,
      });
      return exposeResult(response);
    },

    /**
     * Discovers the server's supported protocol versions and capabilities via the
     * `server/discover` RPC (modern era, 2026-07-28).
     */
    async discover(): Promise<unknown> {
      const id = nextId();
      const supported = proto.era?.supportedProtocolVersions ?? [MODERN_PROTOCOL_VERSION];
      const response = await sendAndTrack(id, 'server/discover', { protocolVersions: supported });
      const result = exposeResult(response) as DiscoverResult;
      discoverResult = result;
      return result;
    },

    /**
     * Opens a modern-era (2026-07-28) `subscriptions/listen` stream for the given
     * notification filter. Returns the server's response as-is (typically an
     * acknowledgment containing the `honoredFilter` subset the server agreed to
     * deliver).
     *
     * @param filter - Subscription filters to open.
     */
    async listen(filter: SubscriptionListenParams): Promise<McpSubscription> {
      const id = nextId();
      const response = await sendAndTrack(id, 'subscriptions/listen', {
        ...filter,
      });
      const result = exposeResult(response) as { honoredFilter?: HonoredSubscription };
      const honored: HonoredSubscription = result?.honoredFilter ?? {};
      let notifyHandler: ((notification: McpNotification) => void) | undefined;
      let resolveClose: (reason: 'local' | 'graceful' | 'remote') => void;
      const closed = new Promise<'local' | 'graceful' | 'remote'>((resolve) => {
        resolveClose = resolve;
      });
      const sub: McpSubscription = {
        honoredFilter: honored,
        onNotification(handler: (notification: McpNotification) => void): void {
          notifyHandler = handler;
          subscriptionHandlers.add(handler);
        },
        async close(): Promise<void> {
          if (notifyHandler) {
            subscriptionHandlers.delete(notifyHandler);
          }
          resolveClose!('local');
        },
        get closed(): Promise<'local' | 'graceful' | 'remote'> {
          return closed;
        },
      };
      return sub;
    },

    /** Lists available tools. */
    async listTools(): Promise<unknown> {
      const response = await sendAndTrack(nextId(), 'tools/list');
      return exposeResult(response);
    },

    /** Lists available resources. */
    async listResources(): Promise<unknown> {
      const response = await sendAndTrack(nextId(), 'resources/list');
      return exposeResult(response);
    },

    /** Closes the server connection. */
    async close(): Promise<void> {
      await transport.close();
    },

    /** Returns the negotiated protocol era. */
    getProtocolEra(): 'legacy' | 'modern' {
      return era;
    },

    /** Returns the server identity if the server stamped one in a result's `_meta`. */
    async getServerVersion(): Promise<{ name: string; version: string } | undefined> {
      if (!serverInfo && era === 'modern' && !discoverResult) {
        try {
          await sendAndTrack(nextId(), 'server/discover', {
            protocolVersions: [MODERN_PROTOCOL_VERSION],
          });
        } catch {
          // discovery may fail on a legacy-only transport — leave identity undefined
        }
      }
      return serverInfo;
    },
  };
}

/**
 * Starts the configured transport (provided instance or spawned stdio subprocess).
 *
 * @param options - Server options.
 * @returns A started {@link Transport}.
 */
async function startTransport(options: ServerOptions): Promise<Transport> {
  if (options.transport) {
    await options.transport.start();
    return options.transport;
  }
  if (options.command !== undefined && options.args !== undefined) {
    const transport = new StdioTransport({
      command: options.command,
      args: options.args,
      env: options.env,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
    });
    await transport.start();
    return transport;
  }
  throw new Error(
    'createMcpServer requires either options.transport or both options.command and options.args',
  );
}

// Re-export result type invariants for API consumers.
export const MODERN_RESULT_TYPE = RESULT_TYPE;
