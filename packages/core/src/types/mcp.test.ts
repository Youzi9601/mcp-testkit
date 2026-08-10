import { describe, it, expect } from 'vitest'
import type {
  McpJsonRpcRequest,
  McpSuccessResponse,
  McpErrorResponse,
  McpResponse,
} from './mcp'
import type { ServerOptions, McpServer } from './api'

describe('MCP types', () => {
  it('McpJsonRpcRequest should have required jsonrpc field', () => {
    const req: McpJsonRpcRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'test', arguments: {} },
    }
    expect(req.jsonrpc).toBe('2.0')
    expect(req.method).toBe('tools/call')
    expect(req.id).toBe(1)
    expect(req.params).toEqual({ name: 'test', arguments: {} })
  })

  it('McpSuccessResponse should have result field', () => {
    const res: McpSuccessResponse = {
      jsonrpc: '2.0',
      id: 1,
      result: { content: [] },
    }
    expect(res.jsonrpc).toBe('2.0')
    expect(res.result).toEqual({ content: [] })
  })

  it('McpErrorResponse should have error structure', () => {
    const res: McpErrorResponse = {
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32601, message: 'Method not found' },
    }
    expect(res.jsonrpc).toBe('2.0')
    expect(res.error.code).toBe(-32601)
    expect(res.error.message).toBe('Method not found')
  })

  it('McpResponse should accept success variant', () => {
    const res: McpResponse = {
      jsonrpc: '2.0',
      id: 1,
      result: { tools: [] },
    }
    expect('result' in res).toBe(true)
  })

  it('McpResponse should accept error variant', () => {
    const res: McpResponse = {
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32601, message: 'Method not found' },
    }
    expect('error' in res).toBe(true)
  })
})

describe('API types', () => {
  it('ServerOptions should require command and args', () => {
    const opts: ServerOptions = {
      command: 'node',
      args: ['server.js'],
    }
    expect(opts.command).toBe('node')
    expect(opts.args).toEqual(['server.js'])
    expect(opts.env).toBeUndefined()
    expect(opts.timeout).toBeUndefined()
  })

  it('ServerOptions should allow optional env and timeout', () => {
    const opts: ServerOptions = {
      command: 'node',
      args: ['server.js'],
      env: { DEBUG: '1' },
      timeout: 10000,
    }
    expect(opts.env).toEqual({ DEBUG: '1' })
    expect(opts.timeout).toBe(10000)
  })

  it('McpServer interface should have required methods', () => {
    const mockServer: McpServer = {
      async callTool() { return {} },
      async getCapabilities() { return {} },
      async discover() { return {} },
      async listTools() { return {} },
      async listResources() { return {} },
      async listen() {
        return {
          honoredFilter: {},
          onNotification() {},
          async close() {},
          get closed() { return Promise.resolve('local' as const) },
        }
      },
      async close() {},
      getProtocolEra() { return 'legacy' },
      async getServerVersion() { return undefined },
    }
    expect(typeof mockServer.callTool).toBe('function')
    expect(typeof mockServer.getCapabilities).toBe('function')
    expect(typeof mockServer.discover).toBe('function')
    expect(typeof mockServer.listTools).toBe('function')
    expect(typeof mockServer.listResources).toBe('function')
    expect(typeof mockServer.listen).toBe('function')
    expect(typeof mockServer.close).toBe('function')
    expect(typeof mockServer.getProtocolEra).toBe('function')
    expect(typeof mockServer.getServerVersion).toBe('function')
  })
})