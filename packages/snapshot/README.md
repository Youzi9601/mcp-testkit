# @youzi9601/mcp-testkit-snapshot

Snapshot testing plugin for MCP servers — detect breaking tool schema changes across releases.

## Installation

```bash
npm install -D @youzi9601/mcp-testkit-snapshot
```

Requires `@youzi9601/mcp-testkit` and `vitest@>=2.0.0 <5.0.0` as peer dependencies:

```bash
npm install @youzi9601/mcp-testkit
npm install -D vitest
```

## Setup

1. Create a setup file to initialize the snapshot directory:

```ts
// vitest.setup.ts
import { setup } from '@youzi9601/mcp-testkit-snapshot'
setup('./test-snapshots')
```

2. Register the plugin in your Vitest config:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { SnapshotPlugin } from '@youzi9601/mcp-testkit-snapshot'

export default defineConfig({
  plugins: [SnapshotPlugin()],
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

## Usage

```ts
import { createMcpServer } from '@youzi9601/mcp-testkit'

test('tool list snapshot', async () => {
  const server = await createMcpServer({
    command: 'node',
    args: ['./dist/server.js'],
  })

  const result = await server.listTools()
  await expect(result).toMatchSnapshot({ name: 'my-tools' })

  await server.close()
})
```

On first run, if no snapshot exists, the test fails with a message to create one. Set `UPDATE_SNAPSHOTS=true` to write the initial snapshot:

```bash
UPDATE_SNAPSHOTS=true npx vitest run
```

After that, subsequent runs compare the live tool list against the stored snapshot. Any change in tool names, schemas, or ordering causes a mismatch.

### Updating snapshots

```bash
# Update all snapshots
UPDATE_SNAPSHOTS=true npx vitest run

# Or per-assertion (in code)
await expect(result).toMatchSnapshot({ name: 'my-tools', update: true })
```

## API

### `setup(dir)`

Initialize the global `SnapshotManager` with a snapshot directory.

```ts
import { setup } from '@youzi9601/mcp-testkit-snapshot'
setup('./test-snapshots')
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dir` | `string` | Directory path for storing `.snap.json` files |

---

### `SnapshotPlugin()`

Vitest plugin that registers the `toMatchSnapshot` custom matcher. Add to `plugins` in `vitest.config.ts`.

---

### `toMatchSnapshot(options?)`

Custom Vitest matcher. Compares the `result.tools` array from a listTools response against the stored snapshot.

```ts
await expect(listToolsResult).toMatchSnapshot({ name: 'my-tools' })
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `name` | `'default'` | Snapshot name within the test file |
| `update` | `false` | Write new value on mismatch instead of failing |

**Environment variable:** Set `UPDATE_SNAPSHOTS=true` to update all snapshots regardless of the `update` option.

---

### `SnapshotManager`

Low-level snapshot file reader/writer. Useful for custom tooling.

```ts
import { SnapshotManager } from '@youzi9601/mcp-testkit-snapshot'

const manager = new SnapshotManager('./snapshots')
manager.writeSnapshot('server.test.ts', 'my-tools', toolList)
const entry = manager.readSnapshot('server.test.ts', 'my-tools')
```

| Method | Description |
|--------|-------------|
| `writeSnapshot(testFilePath, name, toolList)` | Write a snapshot entry to disk |
| `readSnapshot(testFilePath, name)` | Read a snapshot entry; returns `undefined` if not found |
| `getSnapshotDir()` | Returns the configured snapshot directory path |

**Types:**

```ts
interface SnapshotEntry {
  toolList: unknown[]
  timestamp: number
}

interface SnapshotFile {
  version: string
  snapshots: Record<string, SnapshotEntry>
}
```

## Snapshot file format

Snapshots are stored as `.snap.json` files in the configured directory:

```json
{
  "version": "1.0.0",
  "snapshots": {
    "my-tools": {
      "toolList": [
        { "name": "readFile", "description": "Read a file" }
      ],
      "timestamp": 1719000000000
    }
  }
}
```

## License

MIT
