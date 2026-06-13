import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { mcpTestkit } from './index.js'

function loadPackageVersion(): string {
  const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url))
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return pkg.version ?? '0.0.0'
  } catch (err) {
    throw new Error(`Failed to read ${pkgPath}: ${(err as Error).message}. This usually means the test was run from the wrong directory or the package build is missing.`)
  }
}

const version = loadPackageVersion()

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
