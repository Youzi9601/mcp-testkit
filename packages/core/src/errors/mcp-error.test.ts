import { describe, it, expect } from 'vitest'
import { McpError, TransportError, TimeoutError, ServerSpawnError } from './mcp-error'
import { McpErrorCode, JsonRpcErrorCode } from './error-codes'

describe('McpError', () => {
  it('should create error with code and message', () => {
    const err = new McpError('Method not found', JsonRpcErrorCode.MethodNotFound)
    expect(err.code).toBe(-32601)
    expect(err.message).toBe('Method not found')
    expect(err.name).toBe('McpError')
    expect(err instanceof Error).toBe(true)
    expect(err instanceof McpError).toBe(true)
  })

  it('should have stack trace', () => {
    const err = new McpError('Test', -32000)
    expect(err.stack).toBeDefined()
  })

  it('should support optional data field', () => {
    const err = new McpError('Invalid params', -32602, { field: 'name' })
    expect(err.data).toEqual({ field: 'name' })
  })

  describe('toJSON', () => {
    it('should serialize without data', () => {
      const err = new McpError('Not found', -32601)
      expect(err.toJSON()).toEqual({ code: -32601, message: 'Not found' })
    })

    it('should serialize with data', () => {
      const err = new McpError('Invalid', -32602, { retry: true })
      expect(err.toJSON()).toEqual({ code: -32602, message: 'Invalid', data: { retry: true } })
    })
  })

  describe('fromResponse', () => {
    it('should extract error from error response', () => {
      const response = {
        jsonrpc: '2.0' as const,
        id: 1,
        error: { code: -32601, message: 'Method not found', data: { foo: 'bar' } },
      }
      const err = McpError.fromResponse(response)
      expect(err).not.toBeNull()
      expect(err!.code).toBe(-32601)
      expect(err!.message).toBe('Method not found')
      expect(err!.data).toEqual({ foo: 'bar' })
    })

    it('should return null for success response', () => {
      const response = { jsonrpc: '2.0' as const, id: 1, result: { value: 42 } }
      expect(McpError.fromResponse(response)).toBeNull()
    })
  })
})

describe('TransportError', () => {
  it('should have correct name and command', () => {
    const err = new TransportError('Connection refused', 'node')
    expect(err.name).toBe('TransportError')
    expect(err.code).toBe(-32000)
    expect(err.command).toBe('node')
    expect(err.message).toBe('Connection refused')
  })

  it('should work without command', () => {
    const err = new TransportError('Connection refused')
    expect(err.name).toBe('TransportError')
    expect(err.command).toBeUndefined()
  })

  it('should support cause', () => {
    const cause = new Error(' ECONNREFUSED')
    const err = new TransportError('Connection refused', 'node', cause)
    expect(err.cause).toBe(cause)
  })
})

describe('TimeoutError', () => {
  it('should have timeout info and formatted message', () => {
    const err = new TimeoutError(5000)
    expect(err.name).toBe('TimeoutError')
    expect(err.timeout).toBe(5000)
    expect(err.code).toBe(-32000)
    expect(err.message).toBe('Operation timed out after 5000ms')
  })

  it('should work with different timeout values', () => {
    const err = new TimeoutError(30000)
    expect(err.timeout).toBe(30000)
    expect(err.message).toBe('Operation timed out after 30000ms')
  })

  it('should include method name in message when provided', () => {
    const err = new TimeoutError(5000, 'tools/call')
    expect(err.timeout).toBe(5000)
    expect(err.method).toBe('tools/call')
    expect(err.message).toBe("Method 'tools/call' timed out after 5000ms")
  })
})

describe('ServerSpawnError', () => {
  it('should include command and args', () => {
    const err = new ServerSpawnError('node', ['server.js', '--flag'], 127)
    expect(err.name).toBe('ServerSpawnError')
    expect(err.command).toBe('node')
    expect(err.args).toEqual(['server.js', '--flag'])
    expect(err.exitCode).toBe(127)
    expect(err.code).toBe(-32000)
  })

  it('should have formatted message', () => {
    const err = new ServerSpawnError('python', ['app.py'], 1)
    expect(err.message).toBe('Failed to spawn server: python app.py')
  })

  it('should support null exitCode for running process', () => {
    const err = new ServerSpawnError('node', ['server.js'], null)
    expect(err.exitCode).toBeNull()
  })

  it('should support legacy cause (deprecated)', () => {
    const err = new ServerSpawnError('node', ['server.js'], 127, 'ENOENT')
    expect(err.cause).toBe('ENOENT')
  })
})

describe('Error codes', () => {
  it('McpErrorCode should have correct values', () => {
    expect(McpErrorCode.ServerNotInitialized).toBe(-32002)
    expect(McpErrorCode.RequestInProgress).toBe(-32001)
    expect(McpErrorCode.RequestCancelled).toBe(-32000)
  })

  it('JsonRpcErrorCode should have standard values', () => {
    expect(JsonRpcErrorCode.ParseError).toBe(-32700)
    expect(JsonRpcErrorCode.InvalidRequest).toBe(-32600)
    expect(JsonRpcErrorCode.MethodNotFound).toBe(-32601)
    expect(JsonRpcErrorCode.InvalidParams).toBe(-32602)
    expect(JsonRpcErrorCode.InternalError).toBe(-32603)
  })
})