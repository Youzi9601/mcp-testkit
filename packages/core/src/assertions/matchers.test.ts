import { describe, it, expect } from 'vitest'
import { registerMatchers } from './matchers'
import { McpError, TransportError, TimeoutError, ServerSpawnError, ConnectionLostError } from '../errors/index'
import { JsonRpcErrorCode } from '../errors/index'

// Register matchers before tests run
registerMatchers()

describe('MCP matchers', () => {
  describe('toBeValidMcpResponse', () => {
    it('should pass for success response', () => {
      expect({ jsonrpc: '2.0', id: 1, result: {} }).toBeValidMcpResponse()
    })

    it('should pass for error response', () => {
      expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'err' } }).toBeValidMcpResponse()
    })

    it('should fail for invalid response', () => {
      expect(() => {
        expect({ foo: 'bar' }).toBeValidMcpResponse()
      }).toThrow()
    })

    it('should fail for null', () => {
      expect(() => {
        expect(null).toBeValidMcpResponse()
      }).toThrow()
    })
  })

  describe('toBeMcpSuccess', () => {
    it('should pass for success with result', () => {
      expect({ jsonrpc: '2.0', id: 1, result: { tools: [] } }).toBeMcpSuccess()
    })

    it('should fail for error response', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'err' } }).toBeMcpSuccess()
      }).toThrow()
    })
  })

  describe('toBeMcpError', () => {
    it('should pass for error response', () => {
      expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } }).toBeMcpError()
    })

    it('should pass for specific error code', () => {
      expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'err' } }).toBeMcpError(-32601)
    })

    it('should fail for wrong error code', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'err' } }).toBeMcpError(-32602)
      }).toThrow()
    })
  })

  describe('toBeValidJsonRpcRequest', () => {
    it('should pass for valid request', () => {
      expect({ jsonrpc: '2.0', id: 1, method: 'tools/call' }).toBeValidJsonRpcRequest()
    })

    it('should fail for missing method', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1 }).toBeValidJsonRpcRequest()
      }).toThrow()
    })
  })
})

// ─── Phase 2: Content matchers ────────────────────────────────────────────────

describe('Phase 2 Content matchers', () => {
  describe('toHaveContent', () => {
    it('should pass for response with content array', () => {
      expect({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'hello' }] } }).toHaveContent()
    })

    it('should pass when received directly as result object', () => {
      expect({ content: [{ type: 'text', text: 'hello' }] }).toHaveContent()
    })

    it('should fail for empty content', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1, result: { content: [] } }).toHaveContent()
      }).toThrow()
    })

    it('should fail when result field is missing', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1, result: {} }).toHaveContent()
      }).toThrow()
    })
  })

  describe('toHaveText', () => {
    it('should pass when text content includes the substring', () => {
      expect({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'hello world' }] } }).toHaveText('world')
    })

    it('should pass when text is exact match', () => {
      expect({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'hello' }] } }).toHaveText('hello')
    })

    it('should fail when text does not include substring', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'hello' }] } }).toHaveText('world')
      }).toThrow()
    })

    it('should concatenate multiple text entries', () => {
      expect({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'hello' }, { type: 'text', text: ' world' }] } }).toHaveText('hello world')
    })
  })

  describe('toHaveContentType', () => {
    it('should pass for text content type', () => {
      expect({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'hi' }] } }).toHaveContentType('text')
    })

    it('should pass for image content type', () => {
      expect({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'image', data: 'abc123' }] } }).toHaveContentType('image')
    })

    it('should pass for resource content type', () => {
      expect({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'resource', resource: { uri: 'file:///test' } }] } }).toHaveContentType('resource')
    })

    it('should fail for type mismatch', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'hi' }] } }).toHaveContentType('image')
      }).toThrow()
    })
  })

  describe('toBeErrorResponse', () => {
    it('should pass for error response', () => {
      expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'err' } }).toBeErrorResponse()
    })

    it('should fail for success response', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1, result: { content: [] } }).toBeErrorResponse()
      }).toThrow()
    })

    it('should fail for malformed response', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1 }).toBeErrorResponse()
      }).toThrow()
    })
  })

  describe('toMatchMcpError', () => {
    it('should pass for matching error response', () => {
      expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } }).toMatchMcpError({ code: -32601 })
    })

    it('should pass for matching message substring', () => {
      expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } }).toMatchMcpError({ message: 'not found' })
    })

    it('should pass for matching message RegExp', () => {
      expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } }).toMatchMcpError({ message: /not found/i })
    })

    it('should pass for both code and message constraints', () => {
      expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } }).toMatchMcpError({ code: -32601, message: 'not found' })
    })

    it('should fail for wrong code', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } }).toMatchMcpError({ code: -32700 })
      }).toThrow()
    })

    it('should fail for non-matching message', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } }).toMatchMcpError({ message: 'wrong message' })
      }).toThrow()
    })

    it('should work with plain error-like object', () => {
      const err = { code: -32000, message: 'Timeout' }
      expect(err).toMatchMcpError({ code: -32000 })
    })
  })
})

// ─── Phase 2: Error object matchers ────────────────────────────────────────────

describe('Phase 2 Error object matchers', () => {
  describe('toBeTransportError', () => {
    it('should pass for TransportError', () => {
      expect(new TransportError('Connection refused')).toBeTransportError()
    })

    it('should pass for TransportError with command', () => {
      expect(new TransportError('Spawn failed', 'node')).toBeTransportError()
    })

    it('should fail for generic Error', () => {
      expect(() => {
        expect(new Error('oops')).toBeTransportError()
      }).toThrow()
    })

    it('should fail for McpError', () => {
      expect(() => {
        expect(new McpError('test', -32000)).toBeTransportError()
      }).toThrow()
    })
  })

  describe('toBeTimeoutError', () => {
    it('should pass for TimeoutError', () => {
      expect(new TimeoutError(5000)).toBeTimeoutError()
    })

    it('should pass for TimeoutError with method', () => {
      expect(new TimeoutError(30000, 'tools/call')).toBeTimeoutError()
    })

    it('should fail for generic Error', () => {
      expect(() => {
        expect(new Error('timeout')).toBeTimeoutError()
      }).toThrow()
    })

    it('should fail for TransportError', () => {
      expect(() => {
        expect(new TransportError('timeout')).toBeTimeoutError()
      }).toThrow()
    })
  })
})

// ─── Phase 2: Tool response matchers ───────────────────────────────────────────

describe('Phase 2 Tool response matchers', () => {
  describe('toBeFromTool', () => {
    it('should pass for response with tool result structure', () => {
      expect({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'result' }] } }).toBeFromTool('someTool')
    })

    it('should pass for direct result object', () => {
      expect({ content: [{ type: 'text', text: 'result' }] }).toBeFromTool('anyTool')
    })

    it('should fail for response without result field', () => {
      expect(() => {
        expect({ jsonrpc: '2.0', id: 1, result: {} }).toBeFromTool('myTool')
      }).toThrow()
    })
  })
})

// ─── Phase 3: Capability & Schema Matchers ────────────────────────────────

describe('Phase 3 Capability matchers', () => {
  describe('toHaveCapability', () => {
    it('should pass when server has the capability', async () => {
      const mockServer = {
        async getCapabilities() {
          return { jsonrpc: '2.0', id: 1, result: { capabilities: { roots: { listChanged: true } } } }
        },
      }
      await expect(mockServer as any).toHaveCapability('roots')
    })

    it('should fail when capability is not present', async () => {
      const mockServer = {
        async getCapabilities() {
          return { jsonrpc: '2.0', id: 1, result: { capabilities: {} } }
        },
      }
      try {
        await expect(mockServer as any).toHaveCapability('logging')
      } catch (e) {
        expect((e as Error).message).toContain('logging')
      }
    })
  })

  describe('toHaveTool', () => {
    it('should pass when server has the tool', async () => {
      const mockServer = {
        async listTools() {
          return { jsonrpc: '2.0', id: 1, result: { tools: [{ name: 'myTool', inputSchema: {} }] } }
        },
      }
      await expect(mockServer as any).toHaveTool('myTool')
    })

    it('should report tool names in error message', async () => {
      const mockServer = {
        async listTools() {
          return { jsonrpc: '2.0', id: 1, result: { tools: [{ name: 'toolA' }, { name: 'toolB' }] } }
        },
      }
      try {
        await expect(mockServer as any).toHaveTool('toolC')
      } catch (e) {
        expect((e as Error).message).toContain('toolA')
      }
    })
  })

  describe('toHaveResource', () => {
    it('should pass when server has the resource', async () => {
      const mockServer = {
        async listResources() {
          return { jsonrpc: '2.0', id: 1, result: { resources: [{ uri: 'file:///test.txt' }] } }
        },
      }
      await expect(mockServer as any).toHaveResource('file:///test.txt')
    })

    it('should report resource URIs in error message', async () => {
      const mockServer = {
        async listResources() {
          return { jsonrpc: '2.0', id: 1, result: { resources: [{ uri: 'file:///a.txt' }, { uri: 'file:///b.txt' }] } }
        },
      }
      try {
        await expect(mockServer as any).toHaveResource('file:///missing.txt')
      } catch (e) {
        expect((e as Error).message).toContain('file:///a.txt')
      }
    })
  })

  describe('toMatchToolSchema', () => {
    it('should pass when tool inputSchema matches expected schema', () => {
      const tool = { name: 'myTool', inputSchema: { type: 'object', properties: { arg1: { type: 'string' } }, required: ['arg1'] } }
      const schema = { properties: { arg1: { type: 'string' } }, required: ['arg1'] }
      expect(tool).toMatchToolSchema(schema)
    })

    it('should pass when tool has extra properties beyond schema', () => {
      const tool = { name: 'myTool', inputSchema: { type: 'object', properties: { arg1: { type: 'string' }, arg2: { type: 'number' } }, required: ['arg1'] } }
      const schema = { properties: { arg1: { type: 'string' } } }
      expect(tool).toMatchToolSchema(schema)
    })

    it('should fail when property type does not match', () => {
      const tool = { name: 'myTool', inputSchema: { type: 'object', properties: { arg1: { type: 'string' } } } }
      const schema = { properties: { arg1: { type: 'number' } } }
      expect(tool).not.toMatchToolSchema(schema)
    })

    it('should fail when required property is missing', () => {
      const tool = { name: 'myTool', inputSchema: { type: 'object', properties: { arg1: { type: 'string' } }, required: [] } }
      const schema = { properties: { arg1: { type: 'string' } }, required: ['arg1'] }
      expect(tool).not.toMatchToolSchema(schema)
    })

    it('should fail when property is missing from inputSchema', () => {
      const tool = { name: 'myTool', inputSchema: { type: 'object', properties: { arg1: { type: 'string' } } } }
      const schema = { properties: { arg1: { type: 'string' }, arg2: { type: 'number' } } }
      expect(tool).not.toMatchToolSchema(schema)
    })

    it('should work with tool object passed directly (no inputSchema wrapper)', () => {
      const toolSchema = { type: 'object', properties: { arg1: { type: 'string' } }, required: ['arg1'] }
      expect(toolSchema).toMatchToolSchema({ properties: { arg1: { type: 'string' } } })
    })

    it('should fail when inputSchema is missing properties field', () => {
      const tool = { name: 'myTool', inputSchema: { type: 'object' } }
      const schema = { properties: { arg1: { type: 'string' } } }
      expect(tool).not.toMatchToolSchema(schema)
    })

    it('should fail when additionalProperties=false is violated (tool has extra properties)', () => {
      // Tool has arg1 and arg2; schema only allows arg1 with additionalProperties=false
      const tool = {
        name: 'myTool',
        inputSchema: {
          type: 'object',
          properties: {
            arg1: { type: 'string' },
            arg2: { type: 'number' }, // extra — not in schema
          },
        },
      }
      const schema = {
        additionalProperties: false,
        properties: { arg1: { type: 'string' } },
      }
      // Should fail: arg2 is unexpected
      expect(tool).not.toMatchToolSchema(schema)
    })

    it('should pass when additionalProperties=false and no extra properties', () => {
      const tool = {
        name: 'myTool',
        inputSchema: {
          type: 'object',
          properties: { arg1: { type: 'string' } },
        },
      }
      const schema = { additionalProperties: false, properties: { arg1: { type: 'string' } } }
      expect(tool).toMatchToolSchema(schema)
    })
  })
})

describe('ConnectionLostError', () => {
  it('should have correct name and code', () => {
    const err = new ConnectionLostError('Server disconnected')
    expect(err.name).toBe('ConnectionLostError')
    expect(err.code).toBe(-32000)
    expect(err.reason).toBe('Server disconnected')
    expect(err.message).toBe('Connection lost: Server disconnected')
  })

  it('should be instance of McpError', () => {
    const err = new ConnectionLostError('Network failure')
    expect(err instanceof McpError).toBe(true)
    expect(err instanceof Error).toBe(true)
  })
})