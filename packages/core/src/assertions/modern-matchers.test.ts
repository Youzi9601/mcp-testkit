/**
 * Unit tests for modern-era (2026-07-28) pure assertion helpers and matchers.
 *
 * Each `assert*` function is tested directly (they are pure, no side effects).
 * The matchers are exercised via `expect.extend` against known shapes.
 */

import { describe, it, expect } from 'vitest'
import {
  assertHasRequestMeta,
  assertHasMcpHeaders,
  assertCompleteResult,
  assertHasResultType,
  assertInputRequiredResult,
  registerModernMatchers,
} from './modern-matchers.js'

describe('modern-matchers — pure assertions', () => {
  describe('assertHasRequestMeta', () => {
    it('returns true when params._meta has the protocolVersion key', () => {
      const req = { params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } } }
      expect(assertHasRequestMeta(req)).toBe(true)
    })

    it('returns false when _meta is absent', () => {
      expect(assertHasRequestMeta({ params: {} })).toBe(false)
    })

    it('returns false when received is not an object', () => {
      expect(assertHasRequestMeta(null)).toBe(false)
      expect(assertHasRequestMeta(undefined)).toBe(false)
      expect(assertHasRequestMeta('string')).toBe(false)
    })

    it('returns false when _meta lacks the protocolVersion key', () => {
      expect(assertHasRequestMeta({ params: { _meta: {} } })).toBe(false)
    })
  })

  describe('assertHasMcpHeaders', () => {
    it('returns true when both MCP-Protocol-Version and Mcp-Method present', () => {
      const req = { headers: { 'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'tools/call' } }
      expect(assertHasMcpHeaders(req)).toBe(true)
    })

    it('returns true with lowercase header keys (case-insensitive)', () => {
      const req = { headers: { 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/call' } }
      expect(assertHasMcpHeaders(req)).toBe(true)
    })

    it('returns false when only one header is present', () => {
      expect(assertHasMcpHeaders({ headers: { 'MCP-Protocol-Version': '2026-07-28' } })).toBe(false)
      expect(assertHasMcpHeaders({ headers: { 'Mcp-Method': 'tools/call' } })).toBe(false)
    })

    it('returns false for null received', () => {
      expect(assertHasMcpHeaders(null)).toBe(false)
    })
  })

  describe('assertCompleteResult', () => {
    it('returns true when resultType is "complete"', () => {
      expect(assertCompleteResult({ resultType: 'complete' })).toBe(true)
    })

    it('returns false when resultType is "input_required"', () => {
      expect(assertCompleteResult({ resultType: 'input_required' })).toBe(false)
    })

    it('returns false when resultType is absent', () => {
      expect(assertCompleteResult({})).toBe(false)
    })

    it('returns false for null', () => {
      expect(assertCompleteResult(null)).toBe(false)
    })
  })

  describe('assertHasResultType', () => {
    it('returns true when resultType is "complete"', () => {
      expect(assertHasResultType({ resultType: 'complete' })).toBe(true)
    })

    it('returns true when resultType is "input_required"', () => {
      expect(assertHasResultType({ resultType: 'input_required' })).toBe(true)
    })

    it('returns true for a wrapped response with result.resultType', () => {
      expect(assertHasResultType({ result: { resultType: 'complete' } })).toBe(true)
    })

    it('returns false when resultType is absent — spec violation', () => {
      expect(assertHasResultType({})).toBe(false)
    })

    it('returns false for null', () => {
      expect(assertHasResultType(null)).toBe(false)
    })
  })

  describe('assertInputRequiredResult', () => {
    it('returns true when resultType is "input_required" and inputRequests present', () => {
      expect(assertInputRequiredResult({ resultType: 'input_required', inputRequests: [{ name: 'x' }] })).toBe(true)
    })

    it('returns true for a wrapped response', () => {
      expect(assertInputRequiredResult({ result: { resultType: 'input_required', inputRequests: [] } })).toBe(true)
    })

    it('returns false when resultType is "input_required" but inputRequests absent', () => {
      expect(assertInputRequiredResult({ resultType: 'input_required' })).toBe(false)
    })

    it('returns false when resultType is "complete"', () => {
      expect(assertInputRequiredResult({ resultType: 'complete', inputRequests: [] })).toBe(false)
    })

    it('returns false for null', () => {
      expect(assertInputRequiredResult(null)).toBe(false)
    })
  })
})

describe('registerModernMatchers', () => {
  it('registers all 5 modern matchers via expect.extend', () => {
    const registered: Record<string, unknown> = {}
    registerModernMatchers((m) => {
      Object.assign(registered, m)
    })
    expect(registered.toHaveRequestMeta).toBeDefined()
    expect(registered.toHaveMcpHeaders).toBeDefined()
    expect(registered.toBeCompleteResult).toBeDefined()
    expect(registered.toHaveResultType).toBeDefined()
    expect(registered.toBeInputRequiredResult).toBeDefined()
  })

  it('each registered matcher closure returns a valid MatcherResult when invoked', () => {
    const registered: Record<string, (this: unknown, received: unknown) => { pass: boolean; actual: unknown; expected: unknown; message: () => string }> = {}
    registerModernMatchers((m) => {
      Object.assign(registered, m)
    })

    // Invoke each closure with a known value to exercise its body.
    // The `this` context is not used by the matchers, so an empty object suffices.
    const fakeThis = { isNot: false, promise: Promise.resolve(), utils: [] as const }

    const r1 = registered.toHaveRequestMeta.call(fakeThis, { params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } } })
    expect(r1.pass).toBe(true)
    expect(typeof r1.message()).toBe('string')

    const r2 = registered.toHaveMcpHeaders.call(fakeThis, { headers: { 'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'tools/call' } })
    expect(r2.pass).toBe(true)

    const r3 = registered.toBeCompleteResult.call(fakeThis, { resultType: 'complete' })
    expect(r3.pass).toBe(true)

    const r4 = registered.toHaveResultType.call(fakeThis, { resultType: 'complete' })
    expect(r4.pass).toBe(true)

    const r5 = registered.toBeInputRequiredResult.call(fakeThis, { resultType: 'input_required', inputRequests: [] })
    expect(r5.pass).toBe(true)
  })
})
