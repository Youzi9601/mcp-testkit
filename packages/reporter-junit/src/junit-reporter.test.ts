/**
 * Unit tests for JUnitReporter.
 * Uses writeFileFn injection to capture output without file system I/O.
 */

import { describe, it, expect } from 'vitest'
import type { File, Suite, TaskResultPack } from '@vitest/runner'
import { JUnitReporter } from './junit-reporter'

/** Builds a minimal mock File object for testing. */
function makeFile(filepath: string, tasks: Array<{ id: string; name: string; type: 'test'; result?: { state: string; duration?: number; errors?: unknown[] } }>): File {
  return {
    id: filepath,
    type: 'suite',
    name: filepath,
    mode: 'run',
    filepath,
    projectName: undefined,
    tasks: tasks.map(t => ({
      id: t.id,
      type: 'test' as const,
      name: t.name,
      mode: 'run' as const,
      parent: null,
      result: t.result ? {
        state: t.result.state as 'pass' | 'fail' | 'skip' | 'todo' | 'run',
        duration: t.result.duration ?? 0,
        errors: t.result.errors ?? [],
      } : undefined,
      // TaskPopulated fields
      context: {} as never,
      teeth: [] as never,
    })),
    suites: [],
    file: null as never,
    suite: null as never,
    hooks: { beforeEach: [], afterEach: [], beforeAll: [], afterAll: [] },
  }
}

describe('JUnitReporter', () => {
  it('produces XML with passing tests', () => {
    const outputs: Array<{ path: string; content: string }> = []
    const reporter = new JUnitReporter({
      outputFile: 'test.xml',
      suiteName: 'test-suite',
      writeFileFn: (path, content) => outputs.push({ path, content }),
    })

    const file = makeFile('example.test.ts', [
      { id: 't1', name: 'first test', type: 'test', result: { state: 'pass', duration: 100 } },
    ])

    // Simulate vitest lifecycle
    reporter.onInit()
    reporter.onCollected([file])
    reporter.onTaskUpdate([['t1', { state: 'pass', duration: 100, errors: [] }, {}]])
    reporter.onFinished([file])

    expect(outputs).toHaveLength(1)
    const { path, content } = outputs[0]
    expect(path).toBe('test.xml')
    expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(content).toContain('tests="1"')
    expect(content).toContain('failures="0"')
    expect(content).toContain('<testcase name="first test"')
    expect(content).toContain('time="0.100"')
  })

  it('produces XML with failing tests', () => {
    const outputs: Array<{ path: string; content: string }> = []
    const reporter = new JUnitReporter({
      outputFile: 'failures.xml',
      writeFileFn: (path, content) => outputs.push({ path, content }),
    })

    const file = makeFile('error.test.ts', [
      {
        id: 't1',
        name: 'throws on bad input',
        type: 'test',
        result: {
          state: 'fail',
          duration: 50,
          errors: [{ message: 'Expected 200, got 500', name: 'Error', stack: 'Error: Expected 200' }],
        },
      },
    ])

    reporter.onInit()
    reporter.onCollected([file])
    reporter.onTaskUpdate([['t1', { state: 'fail', duration: 50, errors: [{ message: 'Expected 200, got 500', name: 'Error', stack: 'Error: Expected 200' }] }, {}]])
    reporter.onFinished([file])

    expect(outputs).toHaveLength(1)
    expect(outputs[0].content).toContain('failures="1"')
    expect(outputs[0].content).toContain('<failure message="Expected 200, got 500"')
  })

  it('produces XML with skipped tests', () => {
    const outputs: Array<{ path: string; content: string }> = []
    const reporter = new JUnitReporter({
      outputFile: 'skipped.xml',
      writeFileFn: (path, content) => outputs.push({ path, content }),
    })

    const file = makeFile('skipped.test.ts', [
      { id: 't1', name: 'optional test', type: 'test', result: { state: 'skip', duration: 0 } },
    ])

    reporter.onInit()
    reporter.onCollected([file])
    reporter.onTaskUpdate([['t1', { state: 'skip', duration: 0, errors: [] }, {}]])
    reporter.onFinished([file])

    expect(outputs).toHaveLength(1)
    expect(outputs[0].content).toContain('skipped="1"')
    expect(outputs[0].content).toContain('<skipped/>')
  })

  it('aggregates totals across multiple files', () => {
    const outputs: Array<{ path: string; content: string }> = []
    const reporter = new JUnitReporter({
      outputFile: 'multi.xml',
      writeFileFn: (path, content) => outputs.push({ path, content }),
    })

    const file1 = makeFile('a.test.ts', [
      { id: 't1', name: 'passing', type: 'test', result: { state: 'pass', duration: 10 } },
    ])
    const file2 = makeFile('b.test.ts', [
      { id: 't2', name: 'failing', type: 'test', result: { state: 'fail', duration: 20 } },
      { id: 't3', name: 'skipped', type: 'test', result: { state: 'skip', duration: 0 } },
    ])

    reporter.onInit()
    reporter.onCollected([file1, file2])
    reporter.onTaskUpdate([
      ['t1', { state: 'pass', duration: 10, errors: [] }, {}],
      ['t2', { state: 'fail', duration: 20, errors: [{ message: 'fail', name: 'Error', stack: '' }] }, {}],
      ['t3', { state: 'skip', duration: 0, errors: [] }, {}],
    ])
    reporter.onFinished([file1, file2])

    expect(outputs).toHaveLength(1)
    const { content } = outputs[0]
    expect(content).toContain('tests="3"')
    expect(content).toContain('failures="1"')
    expect(content).toContain('skipped="1"')
    expect(content).toContain('<testsuite name="a.test.ts"')
    expect(content).toContain('<testsuite name="b.test.ts"')
  })

  it('handles nested describe blocks by flattening to file-level suite', () => {
    const outputs: Array<{ path: string; content: string }> = []
    const reporter = new JUnitReporter({
      outputFile: 'nested.xml',
      writeFileFn: (path, content) => outputs.push({ path, content }),
    })

    const file = makeFile('nested.test.ts', [
      { id: 't1', name: 'outer test', type: 'test', result: { state: 'pass', duration: 5 } },
      { id: 't2', name: 'inner test', type: 'test', result: { state: 'pass', duration: 3 } },
    ])

    reporter.onInit()
    reporter.onCollected([file])
    reporter.onTaskUpdate([
      ['t1', { state: 'pass', duration: 5, errors: [] }, {}],
      ['t2', { state: 'pass', duration: 3, errors: [] }, {}],
    ])
    reporter.onFinished([file])

    expect(outputs).toHaveLength(1)
    expect(outputs[0].content).toContain('tests="2"')
    expect(outputs[0].content).toContain('<testcase name="outer test"')
    expect(outputs[0].content).toContain('<testcase name="inner test"')
  })
})