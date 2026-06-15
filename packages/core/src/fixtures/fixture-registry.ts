/**
 * Fixture Registry — manages test resource lifecycle.
 */

import type { TestFixture } from './types.js';

const fixtures = new Map<string, TestFixture>();

export class FixtureRegistry {
  /** Registers a fixture. */
  register(fixture: TestFixture): void {
    fixtures.set(fixture.name, fixture);
  }

  /** Sets up all fixtures. */
  async setupAll(): Promise<void> {
    for (const fixture of fixtures.values()) {
      await fixture.setup();
    }
  }

  /** Tears down all fixtures. */
  async teardownAll(): Promise<void> {
    for (const fixture of Array.from(fixtures.values()).reverse()) {
      await fixture.teardown();
    }
  }

  /** Clears all fixtures (for testing). */
  clear(): void {
    fixtures.clear();
  }
}
