/**
 * Mock HTTP server for testing HttpTransport.
 * Acts as a simple HTTP endpoint that responds with JSON-RPC formatted data.
 *
 * Records every received request (method + headers) so tests can assert on
 * modern-era `Mcp-Method`/`Mcp-Name`/`MCP-Protocol-Version` header routing.
 */

import http from 'node:http';

/**
 * A scripted JSON-RPC 2.0 response returned by {@link startMockHttpServer}.
 */
export interface MockHttpResponse {
  jsonrpc: string
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string }
}

/**
 * Structural view of a request the mock server received.
 */
export interface ReceivedHttpRequest {
  /** JSON-RPC method parsed from the body (e.g. `'tools/call'`). */
  method: string
  /** Raw HTTP headers of the request. */
  headers: Record<string, string | string[] | undefined>
  /** Parsed JSON-RPC body. */
  body: unknown
}

/**
 * Options for {@link startMockHttpServer}.
 */
export interface MockHttpServerOptions {
  /** Responses to return (consumed in order). */
  responses: MockHttpResponse[]
  /** Port to listen on. Defaults to a random available port. */
  port?: number
  /** Response delay in ms. */
  delayMs?: number
  /**
   * When true, the mock validates SEP-2243 standard headers against the body on
   * every request and answers `400` + `-32020` on a mismatch (modern-era behaviour).
   * @default false
   */
  validateModernHeaders?: boolean
}

/** A started mock server, with a method to inspect received requests. */
export interface StartedMockHttpServer {
  server: http.Server
  /** The port the server is listening on. */
  port: number
  /** Previously received requests, in arrival order. */
  receivedRequests: ReceivedHttpRequest[]
}

/**
 * Starts a mock HTTP MCP server.
 * Returns the server instance, port, and a live record of received requests.
 */
export async function startMockHttpServer(
  options: MockHttpServerOptions,
): Promise<StartedMockHttpServer> {
  let responseIndex = 0;
  const receivedRequests: ReceivedHttpRequest[] = [];

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/mcp') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          let parsed: { method?: string; id?: number | string | null; params?: unknown };
          try {
            parsed = JSON.parse(body) as { method?: string; id?: number | string | null; params?: unknown };
          } catch {
            parsed = { id: null };
          }

          const headers: Record<string, string | string[] | undefined> = req.headers;
          receivedRequests.push({ method: parsed.method ?? '?', headers, body: parsed });

          const delay = options.delayMs ?? 0;
          if (delay > 0) {
            await new Promise((r) => setTimeout(r, delay));
          }

          // Modern header validation (SEP-2243): reject a mismatch with -32020.
          if (options.validateModernHeaders && parsed.method) {
            const headerMethod = headers['mcp-method'];
            const headerVersion = headers['mcp-protocol-version'];
            const name = parsed.method === 'tools/call'
              ? (parsed.params as { name?: string } | undefined)?.name
              : undefined;
            const headerName = headers['mcp-name'];

            const mismatch =
              headerMethod !== parsed.method ||
              (!!name && headerName !== name) ||
              !headerVersion;

            if (mismatch) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: parsed.id ?? null,
                error: { code: -32020, message: 'HeaderMismatch: SEP-2243 standard header disagrees with the body' },
              }) + '\n');
              return;
            }
          }

          const response = { ...options.responses[responseIndex % options.responses.length] };
          responseIndex++;

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked',
          });
          res.end(JSON.stringify(response) + '\n');
        });
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    const port = options.port ?? 0;
    server.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' ? addr?.port ?? 0 : 0;
      resolve({ server, port: actualPort, receivedRequests });
    });
  });
}

/**
 * Stops an HTTP server gracefully.
 */
export function stopMockHttpServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}
