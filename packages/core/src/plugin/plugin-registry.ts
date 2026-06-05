/**
 * Plugin Registry — manages all registered plugins.
 */

import type { Plugin, PluginContext } from './plugin.js'

/** Map of registered plugins. */
const plugins = new Map<string, Plugin>()

/**
 * Extracts the SemVer major version from a version string.
 * @param version - SemVer version string (may include range prefix like ^2.0.0)
 */
function getMajor(version: string): string {
  const cleaned = version.replace(/^[^\d]+/, '')
  const match = cleaned.match(/^(\d+)\./)
  return match ? match[1] : '0'
}

/**
 * Checks plugin compatibility with current core version.
 * @param pluginVersionRange - Plugin's stated supported SemVer range
 * @param coreVersion - Current core version
 * @param pluginName - Plugin name (for error messages)
 * @throws {Error} throws on major version mismatch
 */
function checkVersionCompatibility(
  pluginVersionRange: string,
  coreVersion: string,
  pluginName: string,
): void {
  const pluginMajor = getMajor(pluginVersionRange)
  const coreMajor = getMajor(coreVersion)
  if (pluginMajor !== coreMajor) {
    throw new Error(
      `Plugin "${pluginName}" major version mismatch: plugin requires ${pluginVersionRange}, core is ${coreVersion}`,
    )
  }
}

/**
 * Plugin Registry.
 * Manages plugin registration, version checking, and initialization.
 */
export class PluginRegistry {
  private strict: boolean

  constructor(private coreVersion: string, strict = true) {
    this.strict = strict
  }

  /**
   * Registers a plugin.
   * @param plugin - Plugin instance to register
   * @throws {Error} throws on major version mismatch
   */
  register(plugin: Plugin): void {
    if (this.strict && plugin.supportedCoreVersions) {
      checkVersionCompatibility(plugin.supportedCoreVersions, this.coreVersion, plugin.name)
    }
    plugins.set(plugin.name, plugin)
  }

  /** Gets a plugin by name. */
  get(name: string): Plugin | undefined {
    return plugins.get(name)
  }

  /** Lists all registered plugins. */
  list(): Plugin[] {
    return Array.from(plugins.values())
  }

  /** Creates a plugin context. */
  createContext(): PluginContext {
    return {
      registerMatcher: (_name: string, _fn: (...args: unknown[]) => unknown) => {
        // Matcher registration handled by vitest plugin
      },
      getCoreVersion: () => this.coreVersion,
    }
  }

  /** Initializes all registered plugins. */
  initialize(): void {
    const ctx = this.createContext()
    for (const plugin of Array.from(plugins.values())) {
      plugin.register(ctx)
    }
  }

  /** Clears all plugins (for testing). */
  clear(): void {
    plugins.clear()
  }
}