# @youzi9601/mcp-testkit-reporter-junit

JUnit XML reporter for Vitest — produces JUnit-compatible test result XML for MCP test suites.

## Install

```bash
npm install --save-dev @youzi9601/mcp-testkit-reporter-junit
# or
pnpm add -D @youzi9601/mcp-testkit-reporter-junit
```

Requires `vitest@>=2.0.0`.

## Usage

Add to your `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import { JUnitReporter } from '@youzi9601/mcp-testkit-reporter-junit'

export default defineConfig({
  test: {
    reporters: ['default', new JUnitReporter({ outputFile: 'test-results.xml' })],
    // or for multiple reporters:
    // reporters: ['default', new JUnitReporter({ outputFile: 'junit.xml' })],
  },
})
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `outputFile` | `'junit.xml'` | Output filename for the XML report |
| `suiteName` | `'mcp-testkit'` | Root `<testsuites>` name attribute |

## Output Format

Produces JUnit XML:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="mcp-testkit" tests="10" failures="0" time="2.500">
  <testsuite name="server.test.ts" tests="5" failures="0" time="1.200">
    <testcase name="server starts" classname="server.test.ts" time="0.450"/>
  </testsuite>
</testsuites>
```

Failing tests include `<failure>` elements with the error message and stack trace.

## CI Integration

Compatible with CI systems that accept JUnit XML reports (GitHub Actions, Jenkins, etc.).

```yaml
# Example: GitHub Actions
- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: junit-report
    path: test-results.xml
```
