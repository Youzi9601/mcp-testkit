/**
 * Unit tests for JUnitReporter (vitest 4.x).
 * Uses writeFileFn injection to capture output without file system I/O.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect } from 'vitest'
import type { File, Test as TestCase, TaskResult } from '@vitest/runner'
import { JUnitReporter } from './junit-reporter'

type TaskDef = {
  id: string
  name: string
  result?: { state: string; duration?: number; errors?: unknown[] }
}

/** Builds a File object matching vitest 4.x runner File interface. */
function makeFile(filepath: string, taskDefs: TaskDef[]): File {
  return {
    id: filepath,
    type: 'suite',
    name: filepath,
    mode: 'run',
    filepath,
    projectName: undefined,
    tasks: taskDefs.map((t) => ({
      id: t.id,
      type: 'test' as const,
      name: t.name,
      mode: 'run' as const,
      parent: null,
      result: t.result
        ? ({
            state: t.result.state as TaskResult['state'],
            duration: t.result.duration ?? 0,
            errors: t.result.errors ?? [],
          } as TaskResult)
        : undefined,
    })) as unknown as File['tasks'],
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

    reporter.onInit({
      projects: [{ name: 'example.test.ts', files: [makeFile('example.test.ts', [
        { id: 't1', name: 'first test', result: { state: 'pass', duration: 100 } },
      ])] }],
    } as any)
    reporter.onTestRunStart()
    reporter.onTestRunEnd()

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

    reporter.onInit({
      projects: [{ name: 'error.test.ts', files: [makeFile('error.test.ts', [
        {
          id: 't1',
          name: 'throws on bad input',
          result: {
            state: 'fail',
            duration: 50,
            errors: [{ message: 'Expected 200, got 500', name: 'Error', stack: 'Error: Expected 200' }],
          },
        },
      ])] }],
    } as any)
    reporter.onTestRunStart()
    reporter.onTestRunEnd()

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

    reporter.onInit({
      projects: [{ name: 'skipped.test.ts', files: [makeFile('skipped.test.ts', [
        { id: 't1', name: 'optional test', result: { state: 'skip', duration: 0 } },
      ])] }],
    } as any)
    reporter.onTestRunStart()
    reporter.onTestRunEnd()

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

    reporter.onInit({
      projects: [
        { name: 'a.test.ts', files: [makeFile('a.test.ts', [
          { id: 't1', name: 'passing', result: { state: 'pass', duration: 10 } },
        ])] },
        { name: 'b.test.ts', files: [makeFile('b.test.ts', [
          { id: 't2', name: 'failing', result: { state: 'fail', duration: 20 } },
          { id: 't3', name: 'skipped', result: { state: 'skip', duration: 0 } },
        ])] },
      ],
    } as any)
    reporter.onTestRunStart()
    reporter.onTestRunEnd()

    expect(outputs).toHaveLength(1)
    const { content } = outputs[0]
    expect(content).toContain('tests="3"')
    expect(content).toContain('failures="1"')
    expect(content).toContain('skipped="1"')
    expect(content).toContain('<testsuite name="a.test.ts"')
    expect(content).toContain('<testsuite name="b.test.ts"')
  })

  it('handles multiple tests from a single file', () => {
    const outputs: Array<{ path: string; content: string }> = []
    const reporter = new JUnitReporter({
      outputFile: 'nested.xml',
      writeFileFn: (path, content) => outputs.push({ path, content }),
    })

    reporter.onInit({
      projects: [{ name: 'nested.test.ts', files: [makeFile('nested.test.ts', [
        { id: 't1', name: 'outer test', result: { state: 'pass', duration: 5 } },
        { id: 't2', name: 'inner test', result: { state: 'pass', duration: 3 } },
      ])] }],
    } as any)
    reporter.onTestRunStart()
    reporter.onTestRunEnd()

    expect(outputs).toHaveLength(1)
    expect(outputs[0].content).toContain('tests="2"')
    expect(outputs[0].content).toContain('<testcase name="outer test"')
    expect(outputs[0].content).toContain('<testcase name="inner test"')
  })

  it('uses defaultWriteFile and writes to disk when no writeFileFn is provided', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'junit-reporter-'))
    const outputPath = join(tmpDir, 'junit.xml')

    try {
      const reporter = new JUnitReporter({
        outputFile: outputPath,
        suiteName: 'tmp-suite',
      })

      reporter.onInit({
        projects: [{ name: 'tmp.test.ts', files: [makeFile('tmp.test.ts', [
          { id: 't1', name: 'persisted test', result: { state: 'pass', duration: 12 } },
        ])] }],
      } as any)
      reporter.onTestRunStart()
      reporter.onTestRunEnd()

      const written = readFileSync(outputPath, 'utf-8')
      expect(written).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(written).toContain('tests="1"')
      expect(written).toContain('<testcase name="persisted test"')
    } finally {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})