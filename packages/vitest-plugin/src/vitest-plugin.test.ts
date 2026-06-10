import { describe, it, expect } from 'vitest'
import { mcpTestkit } from './index.js'

const version = process.env.npm_package_version ?? '0.0.0'

describe('mcpTestkit', () => {
  it('should export mcpTestkit as function', () => {
    expect(typeof mcpTestkit).toBe('function')
  })

  it('should return plugin object', () => {
    const plugin = mcpTestkit()
    expect(plugin.name).toBe('@youzi9601/mcp-testkit-vitest')
    expect(plugin.version).toBe(version)
    expect(typeof plugin.register).toBe('function')
  })
})