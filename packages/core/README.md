# @youzi9601/mcp-testkit

MCP server testing framework for TypeScript/JavaScript.

## Features

- **Zero SDK dependency** — uses native Node.js `child_process` + `process.stdin/stdout` only
- **Rich assertions** — `toBeValidMcpResponse()`, `toBeMcpSuccess()`, `toBeMcpError()` Custom Vitest Matchers
- **Flexible validation** — `ValidationLevel.None | Basic | Full` three-tier validation
- **Full TypeScript** — complete type definitions aligned with `mcp-types`
- **Vitest integration** — one-line setup, auto-registers all matchers

## Installation

```bash
npm install @youzi9601/mcp-testkit
npm install -D @youzi9601/mcp-testkit-vitest
```

## Setup

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import mcpTestkit from '@youzi9601/mcp-testkit-vitest'

export default defineConfig({
  plugins: [mcpTestkit()],
  test: {
    environment: 'node',
  },
})
```

## Usage

```ts
import { createMcpServer } from '@youzi9601/mcp-testkit'

describe('My MCP Server', () => {
  let server: Awaited<ReturnType<typeof createMcpServer>>

  beforeEach(async () => {
    server = await createMcpServer({
      command: 'node',
      args: ['./dist/server.js'],
      timeout: 10_000,
    })
  })

  afterEach(async () => {
    await server.close()
  })

  it('should call tool and return result', async () => {
    const result = await server.callTool('readFile', { path: '/tmp/test.txt' })
    expect(result).toBeValidMcpResponse()
    expect(result).toBeMcpSuccess()
  })

  it('should handle tool errors', async () => {
    const result = await server.callTool('readFile', { path: '/nonexistent' })
    expect(result).toBeMcpError()
  })

  it('should list available tools', async () => {
    const result = await server.listTools()
    expect(result).toBeMcpSuccess()
  })

  it('should get server capabilities', async () => {
    const result = await server.getCapabilities()
    expect(result).toBeValidMcpResponse()
  })
})
```

## API Reference

### `createMcpServer(options)`

Creates an MCP server test instance.

```ts
const server = await createMcpServer({
  command: 'node',           // executable
  args: ['./server.js'],     // arguments
  env: { DEBUG: '1' },       // optional env vars
  timeout: 10_000,           // startup timeout (ms), default 5000
})
```

**Methods:**

| Method | Description |
|--------|-------------|
| `server.callTool(name, args?)` | Call a tool |
| `server.listTools()` | List available tools |
| `server.getCapabilities()` | Get server capabilities |
| `server.close()` | Close the connection |

**Errors:**

- `ServerSpawnError` — server failed to start
- `TimeoutError` — startup or request timed out

---

### `StdioTransport`

Low-level transport communicating with MCP server via stdio.

```ts
import { StdioTransport } from '@youzi9601/mcp-testkit'

const transport = new StdioTransport({
  command: 'node',
  args: ['./server.js'],
  timeout: 5000,
})

await transport.start()
const response = await transport.send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
await transport.close()
```

---

### Custom Matchers

| Matcher | Description |
|---------|-------------|
| `expect(value).toBeValidMcpResponse()` | Assert valid MCP JSON-RPC response |
| `expect(value).toBeMcpSuccess()` | Assert success response with `result` |
| `expect(value).toBeMcpError(code?)` | Assert error response, optionally with specific code |
| `expect(value).toBeValidJsonRpcRequest()` | Assert well-formed JSON-RPC request |

---

### Schema Validation

```ts
import { ValidationLevel, validateJsonRpcRequest, validateJsonRpcResponse } from '@youzi9601/mcp-testkit'

// Basic: checks required fields (jsonrpc, id, method)
validateJsonRpcRequest(request)
validateJsonRpcResponse(response)

// Throws Error on validation failure

`ValidationLevel`:
- `None` — no validation
- `Basic` — check required fields (default)
- `Full` — complete JSON Schema validation (Phase 2+)
```

---

### `MockMcpServer`

A controllable test MCP server that doesn't require a real server implementation.

```ts
import { MockMcpServer, createMcpServer } from '@youzi9601/mcp-testkit'

const mock = new MockMcpServer({
  responses: [
    { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'hello' }] } },
    { jsonrpc: '2.0', id: 2, error: { code: -32602, message: 'Invalid params' } },
  ],
  delayMs: 50, // optional: simulate network latency
})

const { command, args } = mock.getSpawnCommand()
const server = await createMcpServer({ command, args })
const result = await server.callTool('echo', { msg: 'test' })
await server.close()
```

---

### Error Classes

```ts
import {
  McpError,
  TransportError,
  TimeoutError,
  ServerSpawnError,
  McpErrorCode,
} from '@youzi9601/mcp-testkit'

// JSON-RPC error
throw new McpError('Method not found', McpErrorCode.MethodNotFound)

// Transport layer error
throw new TransportError('Connection refused')

// Timeout error
throw new TimeoutError(5000)

// Server spawn failure
throw new ServerSpawnError('node', ['server.js'], 'ENOENT')
```

---

### Error Codes

| Name | Code | Description |
|------|------|-------------|
| `ParseError` | `-32700` | Cannot parse JSON |
| `InvalidRequest` | `-32600` | Invalid JSON-RPC request |
| `MethodNotFound` | `-32601` | Method does not exist |
| `InvalidParams` | `-32602` | Invalid parameters |
| `InternalError` | `-32603` | Internal error |
| `ServerError` | `-32000` | Server error |

## Testing

```bash
pnpm install
pnpm test        # Run all tests
pnpm test:cov    # Run tests with coverage
pnpm build       # Build all packages
```

## License

MIT
