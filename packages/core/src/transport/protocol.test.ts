import { describe, it, expect } from 'vitest'
import { createRequest, createNotification, unwrapResponse } from './protocol'

describe('protocol helpers', () => {
  describe('createRequest', () => {
    it('should create request with numeric id', () => {
      const req = createRequest(1, 'tools/list')
      expect(req).toEqual({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    })

    it('should create request with string id', () => {
      const req = createRequest('abc-123', 'tools/call', { name: 'test', arguments: {} })
      expect(req).toEqual({
        jsonrpc: '2.0',
        id: 'abc-123',
        method: 'tools/call',
        params: { name: 'test', arguments: {} },
      })
    })

    it('should omit params when not provided', () => {
      const req = createRequest(5, 'initialize')
      expect(req).not.toHaveProperty('params')
    })
  })

  describe('createNotification', () => {
    it('should create notification without id', () => {
      const req = createNotification('tools/list_changed')
      expect(req).toEqual({ jsonrpc: '2.0', method: 'tools/list_changed' })
      expect(req).not.toHaveProperty('id')
    })

    it('should include params when provided', () => {
      const req = createNotification('notifications/initialized')
      expect(req).toEqual({ jsonrpc: '2.0', method: 'notifications/initialized' })
    })
  })

  describe('unwrapResponse', () => {
    it('should return result from success response', () => {
      const res = { jsonrpc: '2.0' as const, id: 1, result: { tools: [] } }
      expect(unwrapResponse(res)).toEqual({ tools: [] })
    })

    it('should throw with error code and message from error response', () => {
      const res = {
        jsonrpc: '2.0' as const,
        id: 1,
        error: { code: -32601, message: 'Method not found' },
      }
      expect(() => unwrapResponse(res)).toThrow('Method not found')
    })

    it('should throw error with code property', () => {
      const res = {
        jsonrpc: '2.0' as const,
        id: 1,
        error: { code: -32602, message: 'Invalid params', data: { foo: 'bar' } },
      }
      try {
        unwrapResponse(res)
        expect.fail('should have thrown')
      } catch (err: unknown) {
        expect((err as { code: number }).code).toBe(-32602)
        expect((err as { data: unknown }).data).toEqual({ foo: 'bar' })
      }
    })
  })
})