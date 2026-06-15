/**
 * Mock HTTP server for testing HttpTransport.
 * Acts as a simple HTTP endpoint that responds with JSON-RPC formatted data.
 */

import http from 'node:http';

export interface MockHttpResponse {
  jsonrpc: string
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string }
}

export interface MockHttpServerOptions {
  /** Responses to return (consumed in order). */
  responses: MockHttpResponse[]
  /** Port to listen on. Defaults to a random available port. */
  port?: number
  /** Response delay in ms. */
  delayMs?: number
}

/**
 * Starts a mock HTTP MCP server.
 * Returns the server instance and the port it is listening on.
 */
export async function startMockHttpServer(
  options: MockHttpServerOptions,
): Promise<{ server: http.Server; port: number }> {
  let responseIndex = 0;

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/mcp') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          const delay = options.delayMs ?? 0;
          if (delay > 0) {
            await new Promise((r) => setTimeout(r, delay));
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
      resolve({ server, port: actualPort });
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
