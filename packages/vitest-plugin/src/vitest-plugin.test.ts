import { describe, it, expect } from 'vitest'
import mcpTestkit from './vitest-plugin'

describe('vitest-plugin smoke', () => {
  it('should export mcpTestkit as function', () => {
    expect(typeof mcpTestkit).toBe('function')
  })

  it('should return plugin object', () => {
    const plugin = mcpTestkit()
    expect(plugin.name).toBe('@youzi9601/mcp-testkit-vitest')
    expect(plugin.version).toBe('0.1.0')
    expect(typeof plugin.register).toBe('function')
  })
})