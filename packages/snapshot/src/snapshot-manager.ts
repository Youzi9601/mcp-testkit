import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Snapshot data stored per test file.
 */
export interface SnapshotFile {
  version: string
  snapshots: Record<string, SnapshotEntry>
}

export interface SnapshotEntry {
  toolList: unknown[]
  timestamp: number
}

/** Snapshot manager that reads/writes snapshot files on disk. */
export class SnapshotManager {
  private snapshotDir: string;

  constructor(snapshotDir: string) {
    this.snapshotDir = snapshotDir;
  }

  /**
   * Returns the snapshot file path for a given test file path.
   */
  private snapshotPath(testFilePath: string): string {
    const rel = testFilePath.replace(/^\.[\\/]/, '').replace(/[^a-zA-Z0-9_.-]/g, '_');
    return join(this.snapshotDir, `${rel}.snap.json`);
  }

  /**
   * Reads an existing snapshot for a given snapshot name.
   * Returns undefined if no snapshot file or entry exists.
   */
  readSnapshot(testFilePath: string, snapshotName: string): SnapshotEntry | undefined {
    const filePath = this.snapshotPath(testFilePath);
    if (!existsSync(filePath)) {
      return undefined;
    }
    try {
      const content = readFileSync(filePath, 'utf-8');
      const data: SnapshotFile = JSON.parse(content);
      return data.snapshots[snapshotName];
    } catch {
      return undefined;
    }
  }

  /**
   * Writes a snapshot entry to disk.
   * Creates directories and file if they don't exist.
   */
  writeSnapshot(testFilePath: string, snapshotName: string, toolList: unknown[]): void {
    const filePath = this.snapshotPath(testFilePath);
    let data: SnapshotFile = { version: '1.0.0', snapshots: {} };

    if (existsSync(filePath)) {
      try {
        data = JSON.parse(readFileSync(filePath, 'utf-8'));
      } catch {
        // start fresh
      }
    }

    data.snapshots[snapshotName] = {
      toolList,
      timestamp: Date.now(),
    };

    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /** Returns the snapshot directory path. */
  getSnapshotDir(): string {
    return this.snapshotDir;
  }
}

// Global singleton — set by SnapshotPlugin.setup()
let manager: SnapshotManager | undefined;

/** Sets the global snapshot manager (called by SnapshotPlugin.setup). */
export function setSnapshotManager(m: SnapshotManager): void {
  manager = m;
}

/** Returns the current global snapshot manager. */
export function getSnapshotManager(): SnapshotManager {
  if (!manager) {
    throw new Error('SnapshotManager not initialized. Call SnapshotPlugin.setup() first.');
  }
  return manager;
}
