/**
 * Deprecation warning helper for legacy-era API surface.
 *
 * Emits a one-time `console.warn` per feature so test output stays readable, and
 * respects `MCP_TESTKIT_NO_DEPRECATION_WARNINGS=1` as a global silence switch.
 *
 * @module errors/deprecation
 */

/** Tracks features already warned about, to avoid duplicate warnings. */
const warned = new Set<string>();

/**
 * Emits a deprecation warning for a legacy-era feature, unless suppressed.
 *
 * @param feature - Human-readable name of the deprecated feature (e.g. `'initialize handshake'`).
 * @param replacement - What replaces it (e.g. `'server/discover'`).
 * @param sunsetDate - Earliest removal date (ISO), per the 12-month sliding window.
 * @returns `true` when a warning was emitted, `false` when suppressed or already warned.
 */
export function warnDeprecated(
  feature: string,
  replacement: string,
  sunsetDate: string,
): boolean {
  if (process.env.MCP_TESTKIT_NO_DEPRECATION_WARNINGS === '1') return false;
  if (warned.has(feature)) return false;
  warned.add(feature);
  console.warn(
    `[mcp-testkit] deprecation: ${feature} is deprecated. ` +
      `Use ${replacement} instead. ` +
      `Scheduled for removal at the first revision on or after ${sunsetDate}.`,
  );
  return true;
}

/**
 * Resets the deprecation warning tracker. Intended for test isolation only.
 *
 * @internal
 */
export function _resetDeprecationTracker(): void {
  warned.clear();
}

/**
 * Standard sunset date for all 2026-07-28-era deprecations.
 * The 12-month sliding window per SEP-2596 / SEP-2577.
 */
export const DEPRECATION_SUNSET_2027 = '2027-07-28';
