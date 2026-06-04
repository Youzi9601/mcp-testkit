/**
 * JUnit XML formatter for test results.
 * Produces XML strings conforming to the JUnit XML schema.
 */

export interface JUnitTestCase {
  name: string
  classname: string
  time: number
  failure?: {
    message: string
    type: string
    content: string
  }
  error?: {
    message: string
    type: string
    content: string
  }
  skipped?: boolean
}

export interface JUnitTestSuite {
  name: string
  tests: number
  failures: number
  errors: number
  skipped: number
  time: number
  testCases: JUnitTestCase[]
}

export interface JUnitTestSuites {
  name: string
  tests: number
  failures: number
  errors: number
  skipped: number
  time: number
  suites: JUnitTestSuite[]
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;')
}

function formatFailure(failure: JUnitTestCase['failure']): string {
  if (!failure) return ''
  return (
    `<failure message="${escapeXml(failure.message)}" type="${escapeXml(failure.type)}">` +
    `${escapeXml(failure.content)}</failure>`
  )
}

function formatError(error: JUnitTestCase['error']): string {
  if (!error) return ''
  return (
    `<error message="${escapeXml(error.message)}" type="${escapeXml(error.type)}">` +
    `${escapeXml(error.content)}</error>`
  )
}

/**
 * Formats a single test case into JUnit XML.
 */
function formatTestCase(tc: JUnitTestCase): string {
  const attrs = `name="${escapeXml(tc.name)}" classname="${escapeXml(tc.classname)}" time="${tc.time.toFixed(3)}"`
  if (tc.skipped) {
    return `    <testcase ${attrs}>\n      <skipped/>\n    </testcase>`
  }
  const failure = formatFailure(tc.failure)
  const error = formatError(tc.error)
  if (failure || error) {
    return `    <testcase ${attrs}>\n      ${failure}${error}\n    </testcase>`
  }
  return `    <testcase ${attrs}/>`
}

/**
 * Formats a single test suite into JUnit XML.
 */
function formatTestSuite(suite: JUnitTestSuite): string {
  const attrs = [
    `name="${escapeXml(suite.name)}"`,
    `tests="${suite.tests}"`,
    `failures="${suite.failures}"`,
    `errors="${suite.errors}"`,
    `skipped="${suite.skipped}"`,
    `time="${suite.time.toFixed(3)}"`,
  ].join(' ')
  const testCases = suite.testCases.map(formatTestCase).join('\n')
  return `  <testsuite ${attrs}>\n${testCases}\n  </testsuite>`
}

/**
 * Formats the top-level testsuites element.
 */
export function formatTestSuites(suites: JUnitTestSuites): string {
  const attrs = [
    `name="${escapeXml(suites.name)}"`,
    `tests="${suites.tests}"`,
    `failures="${suites.failures}"`,
    `errors="${suites.errors}"`,
    `skipped="${suites.skipped}"`,
    `time="${suites.time.toFixed(3)}"`,
  ].join(' ')
  const suiteBlocks = suites.suites.map(formatTestSuite).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites ${attrs}>\n${suiteBlocks}\n</testsuites>`
}

/**
 * Formats a single testsuite element (without the testsuites wrapper).
 * Used when outputFile maps to a single file.
 */
export function formatSingleTestSuite(suite: JUnitTestSuite): string {
  const attrs = [
    `name="${escapeXml(suite.name)}"`,
    `tests="${suite.tests}"`,
    `failures="${suite.failures}"`,
    `errors="${suite.errors}"`,
    `skipped="${suite.skipped}"`,
    `time="${suite.time.toFixed(3)}"`,
  ].join(' ')
  const testCases = suite.testCases.map(formatTestCase).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite ${attrs}>\n${testCases}\n</testsuite>`
}