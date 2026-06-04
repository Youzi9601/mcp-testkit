/**
 * Unit tests for JUnit XML formatter.
 */

import { describe, it, expect } from 'vitest'
import {
  formatTestSuites,
  formatSingleTestSuite,
  type JUnitTestSuite,
} from './xml-formatter'

describe('formatSingleTestSuite', () => {
  it('formats a suite with passing tests', () => {
    const suite: JUnitTestSuite = {
      name: 'server.test.ts',
      tests: 2,
      failures: 0,
      errors: 0,
      skipped: 0,
      time: 0.5,
      testCases: [
        { name: 'server starts', classname: 'server.test.ts', time: 0.1 },
        { name: 'handles request', classname: 'server.test.ts', time: 0.4 },
      ],
    }

    const xml = formatSingleTestSuite(suite)

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('name="server.test.ts"')
    expect(xml).toContain('tests="2"')
    expect(xml).toContain('failures="0"')
    expect(xml).toContain('time="0.500"')
    expect(xml).toContain('<testcase name="server starts"')
    expect(xml).toContain('<testcase name="handles request"')
  })

  it('formats a suite with a failing test', () => {
    const suite: JUnitTestSuite = {
      name: 'server.test.ts',
      tests: 1,
      failures: 1,
      errors: 0,
      skipped: 0,
      time: 0.2,
      testCases: [
        {
          name: 'throws on invalid input',
          classname: 'server.test.ts',
          time: 0.2,
          failure: {
            message: 'Expected 200, got 500',
            type: 'Error',
            content: 'Error: Expected 200, got 500',
          },
        },
      ],
    }

    const xml = formatSingleTestSuite(suite)

    expect(xml).toContain('failures="1"')
    expect(xml).toContain('<failure message="Expected 200, got 500"')
  })

  it('formats a suite with a skipped test', () => {
    const suite: JUnitTestSuite = {
      name: 'optional.test.ts',
      tests: 1,
      failures: 0,
      errors: 0,
      skipped: 1,
      time: 0.001,
      testCases: [
        { name: 'legacy behavior', classname: 'optional.test.ts', time: 0, skipped: true },
      ],
    }

    const xml = formatSingleTestSuite(suite)

    expect(xml).toContain('skipped="1"')
    expect(xml).toContain('<skipped/>')
  })

  it('escapes XML special characters in test names and messages', () => {
    const suite: JUnitTestSuite = {
      name: 'escape.test.ts',
      tests: 1,
      failures: 1,
      errors: 0,
      skipped: 0,
      time: 0.1,
      testCases: [
        {
          name: 'test with <html> chars',
          classname: 'escape.test.ts',
          time: 0.1,
          failure: {
            message: 'Error: expected "foo" & "bar"',
            type: 'AssertionError',
            content: '<p>Content</p>',
          },
        },
      ],
    }

    const xml = formatSingleTestSuite(suite)

    // < and > should be escaped
    expect(xml).toContain('<html>')
    expect(xml).toContain('&')
    expect(xml).toContain('<p>Content</p>')
  })
})

describe('formatTestSuites', () => {
  it('formats multiple test suites', () => {
    const suites: JUnitTestSuite[] = [
      {
        name: 'server.test.ts',
        tests: 1,
        failures: 0,
        errors: 0,
        skipped: 0,
        time: 0.5,
        testCases: [{ name: 'server starts', classname: 'server.test.ts', time: 0.5 }],
      },
      {
        name: 'transport.test.ts',
        tests: 2,
        failures: 1,
        errors: 0,
        skipped: 0,
        time: 0.8,
        testCases: [
          { name: 'stdio works', classname: 'transport.test.ts', time: 0.3 },
          {
            name: 'http works',
            classname: 'transport.test.ts',
            time: 0.5,
            failure: { message: 'Connection refused', type: 'Error', content: '' },
          },
        ],
      },
    ]

    const xml = formatTestSuites({
      name: 'mcp-testkit',
      tests: 3,
      failures: 1,
      errors: 0,
      skipped: 0,
      time: 0,
      suites,
    })

    expect(xml).toContain('tests="3"')
    expect(xml).toContain('failures="1"')
    expect(xml).toContain('<testsuite name="server.test.ts"')
    expect(xml).toContain('<testsuite name="transport.test.ts"')
    expect(xml).toContain('<testcase name="stdio works"')
    expect(xml).toContain('<failure message="Connection refused"')
  })
})