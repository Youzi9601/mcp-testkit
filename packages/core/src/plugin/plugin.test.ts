import { describe, it, expect, beforeEach } from 'vitest'
import { PluginRegistry } from './plugin-registry'
import type { Plugin } from './plugin'

describe('PluginRegistry', () => {
  let registry: PluginRegistry

  beforeEach(() => {
    registry = new PluginRegistry('0.1.0')
  })

  afterEach(() => {
    registry.clear()
  })

  it('should register and retrieve plugin', () => {
    const mockPlugin: Plugin = {
      name: 'test-plugin',
      version: '0.1.0',
      supportedCoreVersions: '^0.1.0',
      register() {},
    }
    registry.register(mockPlugin)
    expect(registry.get('test-plugin')).toBe(mockPlugin)
  })

  it('should list all registered plugins', () => {
    const plugin1: Plugin = { name: 'p1', version: '0.1.0', supportedCoreVersions: '^0.1.0', register() {} }
    const plugin2: Plugin = { name: 'p2', version: '0.1.0', supportedCoreVersions: '^0.1.0', register() {} }
    registry.register(plugin1)
    registry.register(plugin2)
    expect(registry.list()).toHaveLength(2)
  })

  it('should throw on major version mismatch', () => {
    const badPlugin: Plugin = {
      name: 'bad-plugin',
      version: '2.0.0',
      supportedCoreVersions: '^2.0.0',
      register() {},
    }
    expect(() => registry.register(badPlugin)).toThrow('major version mismatch')
  })

  it('should not throw when strict is false', () => {
    const lenientRegistry = new PluginRegistry('0.1.0', false)
    const badPlugin: Plugin = {
      name: 'bad-plugin',
      version: '2.0.0',
      supportedCoreVersions: '^2.0.0',
      register() {},
    }
    expect(() => lenientRegistry.register(badPlugin)).not.toThrow()
  })

  it('should return undefined for unknown plugin', () => {
    expect(registry.get('nonexistent')).toBeUndefined()
  })

  it('should call register on initialize', () => {
    const mockPlugin: Plugin = {
      name: 'test-plugin',
      version: '0.1.0',
      supportedCoreVersions: '^0.1.0',
      register() {},
    }
    const spy = vi.spyOn(mockPlugin, 'register')
    registry.register(mockPlugin)
    registry.initialize()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should provide correct context to plugins', () => {
    let capturedVersion: string | null = null
    const mockPlugin: Plugin = {
      name: 'test-plugin',
      version: '0.1.0',
      supportedCoreVersions: '^0.1.0',
      register(context) {
        capturedVersion = context.getCoreVersion()
      },
    }
    registry.register(mockPlugin)
    registry.initialize()
    expect(capturedVersion).toBe('0.1.0')
  })
})