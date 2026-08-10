import { describe, it, expect } from 'vitest'
import type { Transport } from '../../transport/types'
import { createMcpServer } from '../../server'
import { registerMatchers } from '../../assertions/index'
import { REQUEST_META_KEYS } from '../../types/modern/meta'
import { RESULT_TYPE } from '../../types/modern/mrtr'

// Register the matchers (some tests rely on them via expect.extend).
registerMatchers()

describe('custom matchers', () => {
  it('toHaveRequestMeta passes for a request with a _meta envelope', () => {
    const req = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: { _meta: { [REQUEST_META_KEYS.protocolVersion]: '2026-07-28' } },
    }
    // The matcher is registered via registerMatchers(); use expect().
    expect(req).toHaveRequestMeta()
  })

  it('RESULT_TYPE constants are exported', () => {
    expect(RESULT_TYPE.COMPLETE).toBe('complete')
    expect(RESULT_TYPE.INPUT_REQUIRED).toBe('input_required')
  })

  it('toHaveResultType passes for a result with resultType and fails when absent', () => {
    const withType = { resultType: 'complete', content: [] }
    expect(withType).toHaveResultType()

    const inputReq = { resultType: 'input_required', inputRequests: {} }
    expect(inputReq).toHaveResultType()

    // Absent resultType — spec violation in modern era.
    const withoutType = { content: [] }
    expect(withoutType).not.toHaveResultType()
  })
})