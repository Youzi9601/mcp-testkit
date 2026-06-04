/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { SnapshotManager } from './snapshot-manager.js'
import { rmSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

describe('SnapshotManager', () => {
  const testDir = join(__dirname, '..', '..', '.test-snapshots')
  let manager: SnapshotManager

  beforeEach(() => {
    manager = new SnapshotManager(testDir)
    // Clean up before each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
    mkdirSync(testDir, { recursive: true })
  })

  afterAll(() => {
    // Cleanup after all tests
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
  })

  describe('writeSnapshot / readSnapshot', () => {
    it('should write and read a snapshot', () => {
      const testFile = 'my-test.test.ts'
      const name = 'default'
      const tools = [{ name: 'tool1', inputSchema: {} }]

      manager.writeSnapshot(testFile, name, tools)
      const stored = manager.readSnapshot(testFile, name)

      expect(stored).toBeDefined()
      expect(stored?.toolList).toEqual(tools)
    })

    it('should return undefined for non-existent snapshot', () => {
      const stored = manager.readSnapshot('non-existent.test.ts', 'default')
      expect(stored).toBeUndefined()
    })

    it('should overwrite existing snapshot', () => {
      const testFile = 'overwrite.test.ts'
      const name = 'default'
      const tools1 = [{ name: 'tool1' }]
      const tools2 = [{ name: 'tool2' }]

      manager.writeSnapshot(testFile, name, tools1)
      manager.writeSnapshot(testFile, name, tools2)

      const stored = manager.readSnapshot(testFile, name)
      expect(stored?.toolList).toEqual(tools2)
    })

    it('should support multiple snapshot names per test file', () => {
      const testFile = 'multi-name.test.ts'
      const toolsA = [{ name: 'toolA' }]
      const toolsB = [{ name: 'toolB' }]

      manager.writeSnapshot(testFile, 'snap-a', toolsA)
      manager.writeSnapshot(testFile, 'snap-b', toolsB)

      expect(manager.readSnapshot(testFile, 'snap-a')?.toolList).toEqual(toolsA)
      expect(manager.readSnapshot(testFile, 'snap-b')?.toolList).toEqual(toolsB)
    })
  })
})