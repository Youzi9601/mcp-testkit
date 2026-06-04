import { describe, it, expect } from 'vitest'
import {
  ValidationLevel,
  validateJsonRpcRequest,
  validateJsonRpcResponse,
} from './schema-validator'

describe('schema-validator', () => {
  describe('ValidationLevel', () => {
    it('should have correct enum values', () => {
      expect(ValidationLevel.None).toBe('none')
      expect(ValidationLevel.Basic).toBe('basic')
      expect(ValidationLevel.Full).toBe('full')
    })
  })

  describe('validateJsonRpcRequest', () => {
    it('should pass for valid request', () => {
      expect(() =>
        validateJsonRpcRequest({ jsonrpc: '2.0', method: 'test', id: 1 }),
      ).not.toThrow()
    })

    it('should pass for request with params', () => {
      expect(() =>
        validateJsonRpcRequest({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'test' },
        }),
      ).not.toThrow()
    })

    it('should throw for null', () => {
      expect(() => validateJsonRpcRequest(null)).toThrow('must be an object')
    })

    it('should throw for non-object', () => {
      expect(() => validateJsonRpcRequest('string')).toThrow('must be an object')
    })

    it('should throw for missing jsonrpc field', () => {
      expect(() => validateJsonRpcRequest({ method: 'test' })).toThrow(
        'Missing or invalid jsonrpc field',
      )
    })

    it('should throw for invalid jsonrpc version', () => {
      expect(() =>
        validateJsonRpcRequest({ jsonrpc: '1.0', method: 'test' }),
      ).toThrow('Missing or invalid jsonrpc field')
    })

    it('should throw for missing method', () => {
      expect(() =>
        validateJsonRpcRequest({ jsonrpc: '2.0', id: 1 }),
      ).toThrow('Missing or invalid method field')
    })

    it('should throw for non-string method', () => {
      expect(() =>
        validateJsonRpcRequest({ jsonrpc: '2.0', method: 123 }),
      ).toThrow('Missing or invalid method field')
    })
  })

  describe('validateJsonRpcResponse', () => {
    it('should pass for success response', () => {
      expect(() =>
        validateJsonRpcResponse({ jsonrpc: '2.0', id: 1, result: {} }),
      ).not.toThrow()
    })

    it('should pass for error response', () => {
      expect(() =>
        validateJsonRpcResponse({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32601, message: 'err' },
        }),
      ).not.toThrow()
    })

    it('should throw for null', () => {
      expect(() => validateJsonRpcResponse(null)).toThrow('must be an object')
    })

    it('should throw for non-object', () => {
      expect(() => validateJsonRpcResponse(42)).toThrow('must be an object')
    })

    it('should throw for missing jsonrpc field', () => {
      expect(() => validateJsonRpcResponse({ id: 1, result: {} })).toThrow(
        'Missing or invalid jsonrpc field',
      )
    })

    it('should throw for missing result and error', () => {
      expect(() =>
        validateJsonRpcResponse({ jsonrpc: '2.0', id: 1 }),
      ).toThrow('must have either result or error')
    })
  })
})