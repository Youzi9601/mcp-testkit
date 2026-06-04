/**
 * Direct unit tests for matcher functions.
 * Ensures function-level coverage by directly invoking matcher internals.
 */
import { describe, it, expect } from 'vitest'
import {
  isMcpResponse,
  isErrorResponse,
  getContent,
  getTextContent,
  getFirstContentType,
  getMcpError,
  isTransportError,
  isTimeoutError,
  isFromToolError,
} from './matcher-utils'

describe('matcher-utils direct coverage', () => {
  describe('isMcpResponse', () => {
    it('returns true for valid success response', () => {
      expect(isMcpResponse({ jsonrpc: '2.0', result: {} })).toBe(true)
    })
    it('returns true for valid error response', () => {
      expect(isMcpResponse({ jsonrpc: '2.0', error: { code: -32601, message: 'err' } })).toBe(true)
    })
    it('returns false for null', () => {
      expect(isMcpResponse(null)).toBe(false)
    })
    it('returns false for non-object', () => {
      expect(isMcpResponse('string')).toBe(false)
    })
    it('returns false for missing jsonrpc', () => {
      expect(isMcpResponse({ id: 1, result: {} })).toBe(false)
    })
  })

  describe('isErrorResponse', () => {
    it('returns true for error response', () => {
      expect(isErrorResponse({ jsonrpc: '2.0', error: { code: -32601, message: 'err' } })).toBe(true)
    })
    it('returns false for success response', () => {
      expect(isErrorResponse({ jsonrpc: '2.0', result: {} })).toBe(false)
    })
    it('returns false for null', () => {
      expect(isErrorResponse(null)).toBe(false)
    })
    it('returns false for error field as primitive', () => {
      expect(isErrorResponse({ jsonrpc: '2.0', error: 'not an object' })).toBe(false)
    })
    it('returns false for error field as null', () => {
      expect(isErrorResponse({ jsonrpc: '2.0', error: null })).toBe(false)
    })
  })

  describe('getContent - edge cases', () => {
    it('returns undefined for null result', () => {
      expect(getContent({ jsonrpc: '2.0', id: 1, result: null })).toBeUndefined()
    })
    it('returns undefined for non-array content', () => {
      expect(getContent({ jsonrpc: '2.0', id: 1, result: { content: 'not an array' } })).toBeUndefined()
    })
    it('returns content when result.content is an array', () => {
      const r = { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'hi' }] } }
      expect(getContent(r)).toHaveLength(1)
    })
    it('filters to image type only', () => {
      const r = {
        jsonrpc: '2.0', id: 1,
        result: { content: [{ type: 'text', text: 'a' }, { type: 'image', data: 'b' }] },
      }
      expect(getContent(r, 'image')).toHaveLength(1)
    })
  })

  describe('getTextContent - edge cases', () => {
    it('returns empty string for null content', () => {
      expect(getTextContent({})).toBe('')
    })
    it('ignores items without text field', () => {
      const r = {
        jsonrpc: '2.0', id: 1,
        result: { content: [{ type: 'text', text: 'hi' }, { type: 'text' }] },
      }
      expect(getTextContent(r)).toBe('hi')
    })
  })

  describe('getMcpError - additional cases', () => {
    it('extracts error with data field', () => {
      const r = {
        jsonrpc: '2.0', id: 1,
        error: { code: -32000, message: 'err', data: { foo: 1 } },
      }
      const e = getMcpError(r)
      expect(e?.data).toEqual({ foo: 1 })
    })
    it('returns null when error field is boolean', () => {
      expect(getMcpError({ error: true })).toBeNull()
    })
  })

  describe('isTransportError - additional cases', () => {
    it('returns true for plain object with name Error and code -32000', () => {
      expect(isTransportError({ name: 'Error', code: -32000, message: 'x' })).toBe(true)
    })
    it('returns false when message check fails', () => {
      expect(isTransportError({ name: 'TransportError', message: 'a' }, 'b')).toBe(false)
    })
    it('returns false for McpError', () => {
      expect(isTransportError({ name: 'McpError', message: 'x' })).toBe(false)
    })
  })

  describe('isTimeoutError - additional cases', () => {
    it('returns false for wrong method', () => {
      expect(isTimeoutError({ name: 'TimeoutError', method: 'tools/call' }, 'resources/list')).toBe(false)
    })
    it('returns true when no method constraint', () => {
      expect(isTimeoutError({ name: 'TimeoutError' })).toBe(true)
    })
  })

  describe('isFromToolError - additional cases', () => {
    it('returns false when data.tool is missing', () => {
      const r = {
        jsonrpc: '2.0', id: 1,
        error: { code: -32000, message: 'fail', data: { args: {} } },
      }
      expect(isFromToolError(r, 'myTool')).toBe(false)
    })
    it('returns false when args do not match', () => {
      const r = {
        jsonrpc: '2.0', id: 1,
        error: { code: -32000, message: 'fail', data: { tool: 'myTool', args: { a: 1 } } },
      }
      expect(isFromToolError(r, 'myTool', { a: 2 })).toBe(false)
    })
    it('returns false for null error response', () => {
      expect(isFromToolError(null, 'myTool')).toBe(false)
    })
  })
})