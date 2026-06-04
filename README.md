# mcp-testkit

> The missing test kit for Model Context Protocol servers.
> Vitest-native · TypeScript-first · Snapshot support · Zero SDK dependency

[![npm version](https://img.shields.io/npm/v/@youzi9601/mcp-testkit?logo=npm)](https://www.npmjs.com/package/@youzi9601/mcp-testkit)
[![Test](https://github.com/youzi9601/mcp-testkit/actions/workflows/test.yml/badge.svg)](https://github.com/youzi9601/mcp-testkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Why mcp-testkit?

Every MCP server needs tests. Existing tools are CLI wrappers (`mcp-jest`), framework-agnostic utility dumps (`mcp-testing-kit`), or LLM-dependent evaluators. None of them feel like a real testing library integrated into your workflow.

mcp-testkit is what Vitest is to JavaScript testing: a first-class, framework-integrated experience with TypeScript types you can actually rely on.

---

## Packages

| Package | Description |
|---------|-------------|
| [`@youzi9601/mcp-testkit`](https://npmjs.com/package/@youzi9601/mcp-testkit) | Core API — `createMcpServer`, custom matchers, transport abstraction |
| [`@youzi9601/mcp-testkit-vitest`](https://npmjs.com/package/@youzi9601/mcp-testkit-vitest) | Vitest plugin — auto-registers all custom matchers |
| [`@youzi9601/mcp-testkit-http`](https://npmjs.com/package/@youzi9601/mcp-testkit-http) | HTTP transport for MCP test servers |
| [`@youzi9601/mcp-testkit-snapshot`](https://npmjs.com/package/@youzi9601/mcp-testkit-snapshot) | Snapshot testing — detect breaking tool schema changes |
| [`@youzi9601/mcp-testkit-reporter-junit`](https://npmjs.com/package/@youzi9601/mcp-testkit-reporter-junit) | JUnit XML reporter for CI pipelines |

---

## Core concepts

### Install

```bash
npm install -D @youzi9601/mcp-testkit @youzi9601/mcp-testkit-vitest vitest
```

### Configure

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import mcpTestkit from '@youzi9601/mcp-testkit-vitest'

export default defineConfig({
  plugins: [mcpTestkit()],
  test: {
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
```

### `createMcpServer` — spawn your MCP server in tests

Start a real MCP server process and control it from tests.

```ts
import { createMcpServer } from '@youzi9601/mcp-testkit'

test('my server exposes getWeather tool', async () => {
  const server = await createMcpServer({
    command: 'node',
    args: ['./dist/server.js'],
  })

  const tools = await server.listTools()
  expect(tools).toHaveTool('getWeather')

  await server.close()
})
```

Two transport modes — swap with one line:

```ts
// Stdio (default)
const server = await createMcpServer({ command: 'node', args: ['./dist/server.js'] })

// HTTP
import { HttpTransport } from '@youzi9601/mcp-testkit-http'
const transport = new HttpTransport({ url: 'http://localhost:3000/mcp' })
const server = await createMcpServer({ transport })
```

### `MockMcpServer` — pure in-process mock, no subprocess

Pre-program mock JSON-RPC responses without spawning any process.

```ts
import { MockMcpServer } from '@youzi9601/mcp-testkit/test-utils'

const mock = new MockMcpServer({
  responses: [
    {
      jsonrpc: '2.0',
      id: 1,
      result: {
        tools: [{ name: 'echo', description: 'Echo input' }],
        resources: [],
        prompts: [],
      },
    },
  ],
})

const { command, args } = mock.getSpawnCommand()
const server = await createMcpServer({ command, args })
```

### Custom matchers — assertions built for MCP

| Matcher | What it checks |
|---------|---------------|
| `.toHaveTool(name)` | A tool with this name exists |
| `.toHaveTool({ name, description })` | Tool exists with exact properties |
| `.toMatchMcpTool()` | Tool shape matches MCP spec |
| `.toMatchMcpResponse()` | Valid JSON-RPC 2.0 response |
| `.toContainText(text)` | Text appears in response content |
| `.toContainText(text, { exact: true })` | Text is the only content |
| `.toMatchSnapshot(name?)` | Matches stored snapshot (snapshot package) |

```ts
// Tool existence
expect(tools).toHaveTool('getWeather')
expect(tools).toHaveTool({ name: 'getWeather', description: 'Get weather for a city' })

// Tool response
const result = await server.callTool('getWeather', { city: 'Taipei' })
expect(result).toMatchMcpResponse()
expect(result).toContainText('Taipei')
```

### Snapshot testing — catch breaking schema changes

```bash
npm install -D @youzi9601/mcp-testkit-snapshot
```

```ts
// vitest.setup.ts
import { setup } from '@youzi9601/mcp-testkit-snapshot'
setup('./test-snapshots')
```

```ts
test('tool list snapshot', async () => {
  const server = await createMcpServer({ command: 'node', args: ['./dist/server.js'] })
  const result = await server.listTools()
  await expect(result).toMatchSnapshot({ name: 'my-tools' })
  await server.close()
})
```

### HTTP integration testing

```ts
import { createHttpMcpServer } from '@youzi9601/mcp-testkit-http'

test('HTTP server exposes readFile tool', async () => {
  const server = await createHttpMcpServer({
    url: 'http://localhost:3000/mcp',
    startServer: {
      command: 'node',
      args: ['./dist/http-server.js'],
      readinessUrl: 'http://localhost:3000/health',
    },
  })

  const tools = await server.listTools()
  expect(tools).toHaveTool('readFile')

  await server.close()
})
```

### JUnit reporter — drop into any CI

```ts
import { JUnitReporter } from '@youzi9601/mcp-testkit-reporter-junit'

export default defineConfig({
  reporters: [new JUnitReporter({ outputFile: 'junit.xml' })],
})
```

---

## Requirements

- Node.js 18+
- Vitest 2.x

## License

MIT