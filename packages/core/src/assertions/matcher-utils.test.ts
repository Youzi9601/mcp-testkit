import { describe, it, expect } from 'vitest'
import {
  getContent,
  getTextContent,
  getFirstContentType,
  getMcpError,
  isTransportError,
  isTimeoutError,
  isFromToolError,
} from './matcher-utils'

describe('matcher-utils', () => {
  describe('getContent', () => {
    it('should extract content array from MCP response', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: { content: [{ type: 'text', text: 'hello' }] },
      }
      const content = getContent(response)
      expect(content).toHaveLength(1)
      expect(content?.[0].text).toBe('hello')
    })

    it('should extract content from direct result object', () => {
      const result = { content: [{ type: 'text', text: 'direct' }] }
      const content = getContent(result)
      expect(content).toHaveLength(1)
    })

    it('should return undefined when no content', () => {
      expect(getContent({ jsonrpc: '2.0', id: 1, result: {} })).toBeUndefined()
    })

    it('should filter by content type', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [
            { type: 'text', text: 'hello' },
            { type: 'image', data: 'abc' },
          ],
        },
      }
      const textContent = getContent(response, 'text')
      expect(textContent).toHaveLength(1)
      expect(textContent?.[0].type).toBe('text')
    })

    it('should return undefined for null/undefined', () => {
      expect(getContent(null)).toBeUndefined()
      expect(getContent(undefined)).toBeUndefined()
    })
  })

  describe('getTextContent', () => {
    it('should concatenate all text items', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [
            { type: 'text', text: 'hello ' },
            { type: 'text', text: 'world' },
          ],
        },
      }
      expect(getTextContent(response)).toBe('hello world')
    })

    it('should ignore non-text items', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [
            { type: 'text', text: 'hello' },
            { type: 'image', data: 'abc' },
          ],
        },
      }
      expect(getTextContent(response)).toBe('hello')
    })

    it('should return empty string when no text content', () => {
      expect(getTextContent({})).toBe('')
    })

    it('should support case insensitive option', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: { content: [{ type: 'text', text: 'HELLO' }] },
      }
      expect(getTextContent(response, true)).toBe('hello')
    })
  })

  describe('getFirstContentType', () => {
    it('should return type of first content item', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [
            { type: 'text', text: 'hello' },
            { type: 'image', data: 'abc' },
          ],
        },
      }
      expect(getFirstContentType(response)).toBe('text')
    })

    it('should return undefined for empty content', () => {
      expect(getFirstContentType({ jsonrpc: '2.0', id: 1, result: { content: [] } })).toBeUndefined()
    })

    it('should return undefined for no content', () => {
      expect(getFirstContentType({})).toBeUndefined()
    })
  })

  describe('getMcpError', () => {
    it('should extract error from error response', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32601, message: 'Method not found' },
      }
      const err = getMcpError(response)
      expect(err).not.toBeNull()
      expect(err?.code).toBe(-32601)
      expect(err?.message).toBe('Method not found')
    })

    it('should extract error from direct error object', () => {
      const err = { code: -32000, message: 'Server error', data: { foo: 'bar' } }
      const result = getMcpError(err)
      expect(result?.code).toBe(-32000)
      expect(result?.data).toEqual({ foo: 'bar' })
    })

    it('should return null for success response', () => {
      const response = { jsonrpc: '2.0', id: 1, result: { tools: [] } }
      expect(getMcpError(response)).toBeNull()
    })

    it('should return null for null/undefined', () => {
      expect(getMcpError(null)).toBeNull()
      expect(getMcpError(undefined)).toBeNull()
    })

    it('should return null for malformed error', () => {
      expect(getMcpError({ error: 'not an object' })).toBeNull()
      expect(getMcpError({ error: { code: 'not a number' } })).toBeNull()
    })
  })

  describe('isTransportError', () => {
    it('should return true for TransportError', () => {
      expect(isTransportError({ name: 'TransportError', message: 'fail' })).toBe(true)
    })

    it('should return true for ConnectionLostError', () => {
      expect(isTransportError({ name: 'ConnectionLostError', message: 'lost' })).toBe(true)
    })

    it('should match expected message substring', () => {
      expect(isTransportError({ name: 'TransportError', message: 'connection refused' }, 'connection')).toBe(true)
    })

    it('should reject non-matching message', () => {
      expect(isTransportError({ name: 'TransportError', message: 'timeout' }, 'refused')).toBe(false)
    })

    it('should return false for Error with code -32000', () => {
      expect(isTransportError({ name: 'Error', code: -32000, message: 'server error' })).toBe(true)
    })

    it('should return false for non-error objects', () => {
      expect(isTransportError('not an error')).toBe(false)
      expect(isTransportError(null)).toBe(false)
      expect(isTransportError({ name: 'McpError', message: 'err' })).toBe(false)
    })
  })

  describe('isTimeoutError', () => {
    it('should return true for TimeoutError', () => {
      expect(isTimeoutError({ name: 'TimeoutError' })).toBe(true)
    })

    it('should match expected method', () => {
      expect(isTimeoutError({ name: 'TimeoutError', method: 'tools/call' }, 'tools/call')).toBe(true)
    })

    it('should reject non-matching method', () => {
      expect(isTimeoutError({ name: 'TimeoutError', method: 'tools/call' }, 'resources/list')).toBe(false)
    })

    it('should return false for non-timeout objects', () => {
      expect(isTimeoutError({ name: 'TransportError' })).toBe(false)
      expect(isTimeoutError(null)).toBe(false)
    })
  })

  describe('isFromToolError', () => {
    it('should return true when error data has matching tool', () => {
      const errorResponse = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: 'Tool failed',
          data: { tool: 'myTool', args: { arg1: 'value' } },
        },
      }
      expect(isFromToolError(errorResponse, 'myTool')).toBe(true)
    })

    it('should match tool with expected args', () => {
      const errorResponse = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: 'Tool failed',
          data: { tool: 'myTool', args: { arg1: 'value' } },
        },
      }
      expect(isFromToolError(errorResponse, 'myTool', { arg1: 'value' })).toBe(true)
    })

    it('should reject wrong args', () => {
      const errorResponse = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: 'Tool failed',
          data: { tool: 'myTool', args: { arg1: 'value' } },
        },
      }
      expect(isFromToolError(errorResponse, 'myTool', { arg1: 'wrong' })).toBe(false)
    })

    it('should return false when tool name does not match', () => {
      const errorResponse = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: 'Tool failed',
          data: { tool: 'otherTool', args: {} },
        },
      }
      expect(isFromToolError(errorResponse, 'myTool')).toBe(false)
    })

    it('should return false when no data', () => {
      const errorResponse = {
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32000, message: 'Error' },
      }
      expect(isFromToolError(errorResponse, 'myTool')).toBe(false)
    })

    it('should return false for success response', () => {
      const successResponse = { jsonrpc: '2.0', id: 1, result: {} }
      expect(isFromToolError(successResponse, 'myTool')).toBe(false)
    })
  })
})