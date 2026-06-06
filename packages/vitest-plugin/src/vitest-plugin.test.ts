import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { mcpTestkit } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../../package.json'), 'utf8'))

describe('mcpTestkit', () => {
  it('should export mcpTestkit as function', () => {
    expect(typeof mcpTestkit).toBe('function')
  })

  it('should return plugin object', () => {
    const plugin = mcpTestkit()
    expect(plugin.name).toBe('@youzi9601/mcp-testkit-vitest')
    expect(plugin.version).toBe(pkg.version)
    expect(typeof plugin.register).toBe('function')
  })
})