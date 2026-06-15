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

import { writeFileSync } from 'node:fs';
import type { Test as TestCase, Suite as TestSuite } from '@vitest/runner';
import {
  formatTestSuites,
  type JUnitTestSuite,
  type JUnitTestCase,
} from './xml-formatter';

/** Error object shape. Compatible with vitest 3.x and 4.x. */
type TestError = {
  message: string
  stack?: string
  name?: string
  expected?: string
  actual?: string
};

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

/**
 * JUnit XML reporter for Vitest.
 *
 * Implements the vitest 4.x Reporter interface:
 * - onInit(vitest)     → initialize state, capture vitest instance
 * - onTestRunStart()   → clear previous results
 * - onTestRunEnd()     → build and write XML report
 *
 * @implements vitest Reporter interface (vitest 4.x)
 */
export class JUnitReporter {
  private readonly options: JUnitReporterOptions;
  private readonly writeFile: (path: string, content: string) => void;
   
  private vitestInstance: any;

  constructor(options: JUnitReporterOptions = {}) {
    this.options = options;
    this.writeFile = options.writeFileFn ?? this.defaultWriteFile;
  }

  private readonly defaultWriteFile = (path: string, content: string): void => {
    writeFileSync(path, content, 'utf-8');
  };

  /**
   * Called when the reporter is initialized with the Vitest instance.
   * @override vitest Reporter.onInit
   */
  onInit(vitest: any): void {
    this.vitestInstance = vitest;
  }

  /**
   * Called when a new test run starts.
   * @override vitest Reporter.onTestRunStart
   */
  onTestRunStart(): void {}

  /**
   * Called when the test run finishes.
   * @override vitest Reporter.onTestRunEnd
   */
  onTestRunEnd(): void {
    if (!this.vitestInstance) return;

    const suites = this.buildSuites();
    const suiteName = this.options.suiteName ?? 'mcp-testkit';
    const outputFile = this.options.outputFile ?? 'junit.xml';

    const totalTests = suites.reduce((sum, s) => sum + s.tests, 0);
    const totalFailures = suites.reduce((sum, s) => sum + s.failures, 0);
    const totalSkipped = suites.reduce((sum, s) => sum + s.skipped, 0);
    const totalErrors = suites.reduce((sum, s) => sum + s.errors, 0);

    const xml = formatTestSuites({
      name: suiteName,
      tests: totalTests,
      failures: totalFailures,
      errors: totalErrors,
      skipped: totalSkipped,
      time: 0,
      suites,
    });
    this.writeFile(outputFile, xml);
  }

  private buildSuites(): JUnitTestSuite[] {
    if (!this.vitestInstance) return [];

    const projects = this.vitestInstance.projects;
    const fileMap = new Map<string, JUnitTestSuite>();

    for (const project of projects) {
      if (!project.files) continue;
      for (const file of project.files) {
        const suite = this.getOrCreateSuite(fileMap, file.filepath ?? 'unknown');
        this.processFile(file, suite);
      }
    }

    return Array.from(fileMap.values());
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
      });
    }
    return map.get(name)!;
  }

  private processFile(file: { tasks?: readonly unknown[]; filepath?: string }, parentSuite: JUnitTestSuite): void {
    if (!file.tasks) return;
    for (const task of file.tasks) {
      this.processTask(task as TestSuite | TestCase, parentSuite);
    }
  }

  private processTask(task: TestSuite | TestCase, parentSuite: JUnitTestSuite): void {
    if (task.type === 'suite') {
      const suite = task as TestSuite;
      for (const child of suite.tasks ?? []) {
        this.processTask(child as TestSuite | TestCase, parentSuite);
      }
    } else {
      this.processTestCase(task as TestCase, parentSuite);
    }
  }

  private processTestCase(task: TestCase, suite: JUnitTestSuite): void {
    const result = task.result;

    const testCase: JUnitTestCase = {
      name: task.name,
      classname: suite.name,
      time: (result?.duration ?? 0) / 1000,
    };

    suite.tests++;

    const state = result?.state ?? 'run';

    if (state === 'skip' || state === 'todo') {
      testCase.skipped = true;
      suite.skipped++;
    } else if (state === 'fail') {
      suite.failures++;
      const errors = (result?.errors ?? []) as TestError[];
      if (errors.length > 0) {
        const err = errors[0];
        testCase.failure = {
          message: err?.message ?? 'Test failed',
          type: err?.name ?? 'Error',
          content: err?.stack ?? err?.message ?? '',
        };
      }
    }
    // else: pass — no failure/error/skipped

    suite.testCases.push(testCase);
  }
}

export default JUnitReporter;
