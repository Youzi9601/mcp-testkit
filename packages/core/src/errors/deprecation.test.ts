import { describe, it, expect, beforeEach, vi } from 'vitest'
import { warnDeprecated, _resetDeprecationTracker, DEPRECATION_SUNSET_2027 } from './deprecation'

describe('warnDeprecated', () => {
  beforeEach(() => {
    _resetDeprecationTracker()
    delete process.env.MCP_TESTKIT_NO_DEPRECATION_WARNINGS
  })

  it('emits a console.warn on first call for a feature', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const emitted = warnDeprecated('initialize handshake', 'server/discover', '2027-07-28')
    expect(emitted).toBe(true)
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain('initialize handshake')
    expect(spy.mock.calls[0][0]).toContain('server/discover')
    expect(spy.mock.calls[0][0]).toContain('2027-07-28')
    spy.mockRestore()
  })

  it('does not warn twice for the same feature (dedup)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warnDeprecated('initialize handshake', 'server/discover', '2027-07-28')
    const second = warnDeprecated('initialize handshake', 'server/discover', '2027-07-28')
    expect(second).toBe(false)
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it('is silenced when MCP_TESTKIT_NO_DEPRECATION_WARNINGS=1', () => {
    process.env.MCP_TESTKIT_NO_DEPRECATION_WARNINGS = '1'
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const emitted = warnDeprecated('initialize handshake', 'server/discover', '2027-07-28')
    expect(emitted).toBe(false)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('exports the standard sunset date', () => {
    expect(DEPRECATION_SUNSET_2027).toBe('2027-07-28')
  })
})
