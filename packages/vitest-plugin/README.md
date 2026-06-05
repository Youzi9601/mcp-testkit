# @youzi9601/mcp-testkit-vitest

Vitest integration plugin, auto-registers MCP-specific custom matchers.

## Installation

```bash
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

One line — the plugin auto-registers these matchers to Vitest's `expect()`:

| Matcher | Description |
|---------|-------------|
| `expect(value).toBeValidMcpResponse()` | Valid MCP JSON-RPC response |
| `expect(value).toBeMcpSuccess()` | Success response with `result` |
| `expect(value).toBeMcpError(code?)` | Error response, optionally with specific code |
| `expect(value).toBeValidJsonRpcRequest()` | Well-formed JSON-RPC request |

## Example

```ts
import { createMcpServer } from '@youzi9601/mcp-testkit'

describe('MCP Server Tests', () => {
  let server: Awaited<ReturnType<typeof createMcpServer>>

  beforeEach(async () => {
    server = await createMcpServer({
      command: 'node',
      args: ['./dist/server.js'],
    })
  })

  afterEach(() => server.close())

  it('should return valid MCP response', async () => {
    const result = await server.callTool('echo', { msg: 'hello' })
    expect(result).toBeValidMcpResponse()
    expect(result).toBeMcpSuccess()
  })

  it('should handle error responses', async () => {
    const result = await server.callTool('invalidTool', {})
    expect(result).toBeMcpError(-32601) // MethodNotFound
  })
})
```

## Relationship with `@youzi9601/mcp-testkit`

- `mcpTestkit()` is the accompanying package for `@youzi9601/mcp-testkit`
- Core logic, types, and error classes live in `mcp-testkit`
- This package only handles Vitest integration

## License

MIT
