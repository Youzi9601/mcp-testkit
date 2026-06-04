# @youzi9601/mcp-testkit-http

HTTP transport adapter for `@youzi9601/mcp-testkit`.

Supports testing MCP servers that communicate over HTTP using the Streamable HTTP protocol.

## Installation

```bash
npm install @youzi9601/mcp-testkit-http
```

Requires `@youzi9601/mcp-testkit` as a peer dependency:

```bash
npm install @youzi9601/mcp-testkit
```

## Usage

```ts
import { HttpTransport } from '@youzi9601/mcp-testkit-http'
import { startMockHttpServer, stopMockHttpServer } from '@youzi9601/mcp-testkit-http'

// 1. Start a mock HTTP MCP server for testing
const { server, port } = await startMockHttpServer({
  responses: [
    { jsonrpc: '2.0', id: null, result: { tools: [] } },
  ],
})

// 2. Create transport pointing at your MCP server endpoint
const transport = new HttpTransport({
  url: `http://localhost:${port}/mcp`,
})

await transport.start()

// 3. Send JSON-RPC requests
const response = await transport.send({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name: 'my-tool', arguments: {} },
})

await transport.close()
await stopMockHttpServer(server)
```

### Starting an embedded server process

Use `startServer` to launch a real server process before connecting:

```ts
const transport = new HttpTransport({
  url: 'http://localhost:3000/mcp',
  startServer: {
    command: 'node',
    args: ['./dist/server.js'],
    env: { PORT: '3000' },
  },
})

await transport.start()
// server is ready, send requests...
await transport.close()
```

### Custom headers

```ts
const transport = new HttpTransport({
  url: 'http://localhost:3000/mcp',
  headers: {
    Authorization: 'Bearer my-token',
  },
})
```

### Custom fetch

```ts
const transport = new HttpTransport({
  url: 'http://localhost:3000/mcp',
  fetch: myFetchImplementation,
})
```

## API

### `HttpTransport`

```ts
class HttpTransport implements Transport {
  constructor(options: HttpTransportOptions)
  start(): Promise<void>
  send(request: JsonRpcRequest): Promise<JsonRpcResponse>
  close(): Promise<void>
}
```

### `HttpTransportOptions`

```ts
interface HttpTransportOptions {
  url: string
  startServer?: {
    command: string
    args: string[]
    cwd?: string
    env?: Record<string, string>
    readinessUrl?: string
  }
  headers?: Record<string, string>
  fetch?: typeof fetch
  signal?: AbortSignal
  timeout?: number
}
```

### `Transport` interface

```ts
interface Transport {
  start(): Promise<void>
  send(request: object): Promise<object>
  close(): Promise<void>
  onNotification?(handler: (notification: object) => void): void
}
```

### Mock server helpers

```ts
// Start a mock HTTP server that responds with configurable JSON-RPC responses
startMockHttpServer(options: MockHttpServerOptions): Promise<{ server: http.Server; port: number }>
stopMockHttpServer(server: http.Server): Promise<void>
```

The mock server cycles through `responses` array on each request.

## Error types

The package exports standard transport errors:

- `TransportError` — General transport failures (invalid JSON, non-200 response, etc.)
- `ServerSpawnError` — Raised when `startServer` process exits unexpectedly
- `TimeoutError` — Request timed out (via `signal` or `timeout` option)