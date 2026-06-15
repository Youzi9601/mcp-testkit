/**
 * @youzi9601/mcp-testkit-reporter-junit
 *
 * JUnit XML reporter for Vitest test results.
 */

export { JUnitReporter, type JUnitReporterOptions } from './junit-reporter.js';
export { JUnitReporterPlugin } from './junit-reporter-plugin.js';
export {
  formatTestSuites,
  formatSingleTestSuite,
  type JUnitTestSuites,
  type JUnitTestSuite,
  type JUnitTestCase,
} from './xml-formatter.js';
