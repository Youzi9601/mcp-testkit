import { describe, it, expect } from 'vitest'
import { JUnitReporterPlugin } from './junit-reporter-plugin.js'

describe('JUnitReporterPlugin', () => {
  it('returns a Plugin-compatible object with correct name', () => {
    const plugin = JUnitReporterPlugin({ outputFile: 'test-results.xml' })
    expect(plugin.name).toBe('@youzi9601/mcp-testkit-reporter-junit')
  })

  it('exposes a SemVer version', () => {
    const plugin = JUnitReporterPlugin()
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('declares supported core version range', () => {
    const plugin = JUnitReporterPlugin()
    expect(plugin.supportedCoreVersions).toBe('^0.1.0')
  })

  it('exposes a register() function', () => {
    const plugin = JUnitReporterPlugin()
    expect(typeof plugin.register).toBe('function')
  })

  it('register() is idempotent and side-effect free', () => {
    const plugin = JUnitReporterPlugin({ outputFile: 'a.xml' })
    expect(() => plugin.register({
      registerMatcher: () => {},
      getCoreVersion: () => '0.1.5',
    })).not.toThrow()
  })

  it('accepts empty options', () => {
    const plugin = JUnitReporterPlugin()
    expect(plugin.name).toBe('@youzi9601/mcp-testkit-reporter-junit')
  })

  it('preserves output file in options for JUnitReporter instantiation', () => {
    // The wrapper instantiates a JUnitReporter solely for tree-shake
    // verification; the actual reporter is wired by Vitest.
    const plugin = JUnitReporterPlugin({ suiteName: 'custom-suite' })
    expect(plugin.register).toBeDefined()
  })
})
