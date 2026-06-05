/**
 * Tests for HttpTransportPlugin and createHttpMcpServer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHttpMcpServer, default as mcpTestkitHttp } from './http-plugin.js'
import { startMockHttpServer, stopMockHttpServer } from './mock-http-server.js'
import type { Server } from 'node:http'

describe('createHttpMcpServer', () => {
  let mockServer: Server
  let mockPort: number

  beforeEach(async () => {
    const started = await startMockHttpServer({
      responses: [
        { jsonrpc: '2.0', id: null, result: { tools: [{ name: 'test-tool' }] } },
      ],
    })
    mockServer = started.server
    mockPort = started.port
  })

  afterEach(async () => {
    await stopMockHttpServer(mockServer)
  })

  it('should create an MCP server via HTTP transport', async () => {
    const server = await createHttpMcpServer({
      url: `http://localhost:${mockPort}/mcp`,
    })

    expect(server).toBeDefined()
    expect(typeof server.callTool).toBe('function')
    expect(typeof server.close).toBe('function')
    expect(typeof server.getCapabilities).toBe('function')
    expect(typeof server.listTools).toBe('function')
    expect(typeof server.listResources).toBe('function')

    await server.close()
  })

  it('should close the server without error', async () => {
    const { server: srv, port } = await startMockHttpServer({
      responses: [{ jsonrpc: '2.0', id: null, result: {} }],
    })
    mockServer = srv
    mockPort = port

    const server = await createHttpMcpServer({
      url: `http://localhost:${mockPort}/mcp`,
    })

    await expect(server.close()).resolves.toBeUndefined()
  })
})

describe('mcpTestkitHttp plugin', () => {
  it('should return a valid plugin object', () => {
    const plugin = mcpTestkitHttp()

    expect(plugin).toMatchObject({
      name: '@youzi9601/mcp-testkit-http',
      version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    })
    // supportedCoreVersions is optional — omit from assertion
    expect(typeof plugin.register).toBe('function')
  })

  it('should call register without throwing', () => {
    const plugin = mcpTestkitHttp()

    expect(() =>
      plugin.register({
        registerMatcher: () => {},
        getCoreVersion: () => '0.1.0',
      }),
    ).not.toThrow()
  })
})