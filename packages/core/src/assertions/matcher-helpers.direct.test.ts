/**
 * Direct unit tests for matcher-helpers.ts — covering branches not yet
 * reached by the matcher-utils.direct tests (which import from matcher-utils).
 *
 * Targets: isTransportError code -32000 + expectedMessage branch (217-220),
 *  isFromToolError full path (268-274), isTimeoutError.
 */
import { describe, it, expect } from 'vitest'
import {
  isTransportError,
  isFromToolError,
  isTimeoutError,
} from './matcher-helpers.js'

describe('matcher-helpers direct coverage', () => {
  describe('isTransportError', () => {
    it('returns true for Error with code -32000 and matching expectedMessage', () => {
      const err = { name: 'Error', code: -32000, message: 'connection refused' }
      expect(isTransportError(err, 'connection')).toBe(true)
    })

    it('returns false for Error with code -32000 but non-matching expectedMessage', () => {
      const err = { name: 'Error', code: -32000, message: 'timeout' }
      expect(isTransportError(err, 'refused')).toBe(false)
    })

    it('returns true for Error with code -32000 and no expectedMessage', () => {
      const err = { name: 'Error', code: -32000, message: 'server error' }
      expect(isTransportError(err)).toBe(true)
    })
  })

  describe('isTimeoutError', () => {
    it('returns true for TimeoutError', () => {
      const err = { name: 'TimeoutError', message: 'timed out' }
      expect(isTimeoutError(err)).toBe(true)
    })

    it('returns true for TimeoutError with expectedMethod match', () => {
      const err = { name: 'TimeoutError', message: 'timed out', method: 'tools/call' }
      expect(isTimeoutError(err, 'tools/call')).toBe(true)
    })

    it('returns false for TimeoutError with non-matching expectedMethod', () => {
      const err = { name: 'TimeoutError', message: 'timed out', method: 'tools/call' }
      expect(isTimeoutError(err, 'resources/list')).toBe(false)
    })

    it('returns false for non-timeout error', () => {
      expect(isTimeoutError({ name: 'Error', message: 'x' })).toBe(false)
    })
  })

  describe('isFromToolError', () => {
    it('returns false for non-error response', () => {
      expect(isFromToolError({ jsonrpc: '2.0', id: 1, result: {} }, 'myTool')).toBe(false)
    })

    it('returns false when error has no MCP error structure', () => {
      const r = { jsonrpc: '2.0', id: 1, error: { code: 0, message: 'x' } }
      expect(isFromToolError(r, 'myTool')).toBe(false)
    })

    it('returns false when data has no tool field', () => {
      const r = {
        jsonrpc: '2.0', id: 1,
        error: { code: -32000, message: 'fail', data: {} },
      }
      expect(isFromToolError(r, 'myTool')).toBe(false)
    })

    it('returns false when tool name does not match', () => {
      const r = {
        jsonrpc: '2.0', id: 1,
        error: { code: -32000, message: 'fail', data: { tool: 'otherTool' } },
      }
      expect(isFromToolError(r, 'myTool')).toBe(false)
    })

    it('returns true when tool name matches and no expectedArgs', () => {
      const r = {
        jsonrpc: '2.0', id: 1,
        error: { code: -32000, message: 'fail', data: { tool: 'myTool' } },
      }
      expect(isFromToolError(r, 'myTool')).toBe(true)
    })

    it('returns true when tool name and args match', () => {
      const r = {
        jsonrpc: '2.0', id: 1,
        error: { code: -32000, message: 'fail', data: { tool: 'myTool', args: { a: 1 } } },
      }
      expect(isFromToolError(r, 'myTool', { a: 1 })).toBe(true)
    })

    it('returns false when tool name matches but args do not', () => {
      const r = {
        jsonrpc: '2.0', id: 1,
        error: { code: -32000, message: 'fail', data: { tool: 'myTool', args: { a: 1 } } },
      }
      expect(isFromToolError(r, 'myTool', { a: 2 })).toBe(false)
    })
  })
})
