/**
 * Plugin system core interface.
 * Allows third-party extensions of @youzi9601/mcp-testkit (custom transports, assertions, reporters).
 */

/**
 * Plugin interface.
 * All plugins must implement this interface.
 *
 * @property name - Plugin name (unique)
 * @property version - Plugin version (SemVer)
 * @property supportedCoreVersions - Supported core version range (SemVer range)
 * @property register - Plugin initialization hook
 */
export interface Plugin {
  /** Plugin name (unique identifier). */
  readonly name: string
  /** Plugin version (SemVer). */
  readonly version: string
  /** Supported @youzi9601/mcp-testkit core version range (SemVer range). Optional — if omitted, no version check is performed. */
  readonly supportedCoreVersions?: string
  /**
   * Plugin initialization.
   * @param context - Plugin context (provides registry, etc.)
   */
  register(context: PluginContext): void
}

/**
 * Plugin context.
 * Plugins use this object to access framework-provided functionality.
 */
export interface PluginContext {
  /** Register a custom matcher. */
  registerMatcher(name: string, fn: (...args: unknown[]) => unknown): void
  /** Gets the current core version. */
  getCoreVersion(): string
}

/** Plugin registry options (passed when creating a registry). */
export interface PluginRegistryOptions {
  /** Current core version. */
  coreVersion: string
  /** Whether to throw on major version mismatch (default true). */
  strictVersionCheck?: boolean
}