import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { mcpTestkit } from './index.js'

const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'))
const version = pkg.version ?? '0.0.0'

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