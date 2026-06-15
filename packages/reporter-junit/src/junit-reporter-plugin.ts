/**
 * JUnitReporterPlugin — Plugin-shape wrapper for JUnitReporter.
 *
 * Provides a `core.Plugin`-compatible object so that consumer projects can
 * pass this reporter through `PluginRegistry` for version compatibility
 * checks, even though the reporter itself is instantiated directly by
 * Vitest (the actual XML report generation does not flow through
 * `PluginRegistry`).
 *
 * Usage:
 * ```ts
 * import { JUnitReporterPlugin } from '@youzi9601/mcp-testkit-reporter-junit'
 * import { PluginRegistry } from '@youzi9601/mcp-testkit'
 *
 * const registry = new PluginRegistry({ coreVersion: '0.1.5' })
 * registry.register(JUnitReporterPlugin({ outputFile: 'junit.xml' }))
 * // The reporter still needs to be wired into vitest config separately.
 * ```
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from '@youzi9601/mcp-testkit';
import { JUnitReporter, type JUnitReporterOptions } from './junit-reporter.js';

/**
 * Reads the package version from the nearest package.json.
 *
 * Falls back to process.env.npm_package_version (set by npm/pnpm lifecycle
 * scripts), then to '0.0.0' when neither is available (e.g., raw source
 * import in test environments).
 */
function loadPackageVersion(): string {
  if (process.env.npm_package_version) {
    return process.env.npm_package_version;
  }
  try {
    const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const version = loadPackageVersion();

/**
 * Creates a Plugin-shaped wrapper around JUnitReporter.
 *
 * @param options - JUnit reporter options (output filename, suite name, etc.)
 * @returns A Plugin-compatible object suitable for `PluginRegistry.register()`.
 *
 * @remarks
 * The returned Plugin's `register()` is a no-op: JUnit XML generation is
 * driven by Vitest's reporter lifecycle (`onInit`, `onTestRunEnd`), not by
 * `PluginRegistry`. The wrapper exists for compatibility with version checks
 * and to provide a uniform plugin discovery surface across the monorepo.
 */
export function JUnitReporterPlugin(options: JUnitReporterOptions = {}): Plugin {
  return {
    name: '@youzi9601/mcp-testkit-reporter-junit',
    version,
    supportedCoreVersions: '^0.1.0',
    register() {
      // JUnitReporter is instantiated by Vitest's reporter system, not by
      // PluginRegistry. This wrapper exists only for version compatibility.
      // Touching `options` via JUnitReporter keeps tree-shaking honest about
      // the consumer's intent (and validates the wrapper in type tests).
      void new JUnitReporter(options);
    },
  };
}

export default JUnitReporterPlugin;
