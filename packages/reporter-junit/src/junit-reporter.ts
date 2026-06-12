/**
 * @youzi9601/mcp-testkit-reporter-junit
 * JUnit XML reporter for Vitest.
 *
 * Produces JUnit-compatible XML output from Vitest test results.
 * Usage in vitest.config.ts:
 * ```ts
 * import { defineConfig } from 'vitest/config'
 * import { JUnitReporter } from '@youzi9601/mcp-testkit-reporter-junit'
 *
 * export default defineConfig({
 *   test: {
 *     reporters: ['default', new JUnitReporter({ outputFile: 'test-results.xml' })],
 *   },
 * })
 * ```
 */

import type { Reporter } from 'vitest/reporters'
import type { File, Suite, Test, TaskResultPack, TaskResult } from '@vitest/runner'

/** Error object shape (compatible with vitest 3.x and 4.x). ErrorWithDiff was removed in vitest 4.x. */
type TestError = {
  message: string
  stack?: string
  name?: string
  expected?: string
  actual?: string
}
import {
  formatTestSuites,
  type JUnitTestSuites,
  type JUnitTestSuite,
  type JUnitTestCase,
} from './xml-formatter'

export interface JUnitReporterOptions {
  /** Output filename for the XML report. Defaults to 'junit.xml' */
  outputFile?: string
  /** Root suite name. Defaults to 'mcp-testkit' */
  suiteName?: string
  /**
   * Custom write function for testing.
   * @internal
   */
  writeFileFn?: (path: string, content: string) => void
}

export class JUnitReporter implements Reporter {
  private readonly options: JUnitReporterOptions
  private readonly taskResults = new Map<string, TaskResult | undefined>()
  private readonly testState = new Map<string, string>()
  private files: File[] = []
  private startTime = 0
  private readonly writeFile: (path: string, content: string) => void

  constructor(options: JUnitReporterOptions = {}) {
    this.options = options
    this.writeFile = options.writeFileFn ?? this.defaultWriteFile
  }

  private readonly defaultWriteFile = (path: string, content: string): void => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { writeFileSync } = require('node:fs') as typeof import('node:fs')
    writeFileSync(path, content, 'utf-8')
  }

  /** @override */
  onInit(): void {
    this.taskResults.clear()
    this.testState.clear()
    this.files = []
    this.startTime = Date.now()
  }

  /** @override */
  onCollected(files?: File[]): void {
    if (!files) return
    this.files = files
    this.startTime = Date.now()
  }

  /** @override */
  onTaskUpdate(packs: TaskResultPack[]): void {
    for (const pack of packs) {
      const [id, result] = pack
      this.taskResults.set(id, result)
      if (result) {
        this.testState.set(id, result.state)
      }
    }
  }

  /** @override */
  onFinished(files: File[], _errors: unknown[]): void {
    const suites = this.buildSuites(files)
    const suiteName = this.options.suiteName ?? 'mcp-testkit'
    const outputFile = this.options.outputFile ?? 'junit.xml'

    const totalTests = suites.reduce((sum, s) => sum + s.tests, 0)
    const totalFailures = suites.reduce((sum, s) => sum + s.failures, 0)
    const totalSkipped = suites.reduce((sum, s) => sum + s.skipped, 0)
    const totalErrors = suites.reduce((sum, s) => sum + s.errors, 0)

    const xml = formatTestSuites({
      name: suiteName,
      tests: totalTests,
      failures: totalFailures,
      errors: totalErrors,
      skipped: totalSkipped,
      time: 0,
      suites,
    })
    this.writeFile(outputFile, xml)
  }

  private buildSuites(files: File[]): JUnitTestSuite[] {
    const fileMap = new Map<string, JUnitTestSuite>()

    for (const file of files) {
      const suite = this.getOrCreateSuite(fileMap, file.filepath ?? 'unknown')
      this.processSuite(file, suite)
    }

    return Array.from(fileMap.values())
  }

  private getOrCreateSuite(map: Map<string, JUnitTestSuite>, name: string): JUnitTestSuite {
    if (!map.has(name)) {
      map.set(name, {
        name,
        tests: 0,
        failures: 0,
        errors: 0,
        skipped: 0,
        time: 0,
        testCases: [],
      })
    }
    return map.get(name)!
  }

  private processSuite(suite: Suite, parentSuite: JUnitTestSuite): void {
    for (const task of suite.tasks) {
      if (task.type === 'suite') {
        this.processSuite(task as Suite, parentSuite)
      } else {
        this.processTest(task as Test, parentSuite)
      }
    }
  }

  private processTest(task: Test, suite: JUnitTestSuite): void {
    const result = this.taskResults.get(task.id)
    const state = this.testState.get(task.id) ?? 'run'

    const testCase: JUnitTestCase = {
      name: task.name,
      classname: suite.name,
      time: (result?.duration ?? 0) / 1000,
    }

    suite.tests++

    if (state === 'skip' || state === 'todo') {
      testCase.skipped = true
      suite.skipped++
    } else if (state === 'fail') {
      suite.failures++
      const errors = result?.errors ?? []
      if (errors.length > 0) {
        const err = errors[0] as TestError
        testCase.failure = {
          message: err?.message ?? 'Test failed',
          type: err?.name ?? 'Error',
          content: err?.stack ?? err?.message ?? '',
        }
      }
    }
    // else: pass — no failure/error/skipped

    suite.testCases.push(testCase)
  }
}

export default JUnitReporter