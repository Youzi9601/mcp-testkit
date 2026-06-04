/**
 * Test Fixture interface.
 * Provides test resources (temp dirs, mock data, etc.).
 */
export interface TestFixture {
  /** Fixture name. */
  readonly name: string
  /** Setup — acquires resources. */
  setup(): Promise<void>
  /** Teardown — releases resources. */
  teardown(): Promise<void>
}