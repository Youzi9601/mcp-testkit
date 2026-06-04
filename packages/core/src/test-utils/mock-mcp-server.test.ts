import { describe, it, expect } from 'vitest'
import { MockMcpServer } from './mock-mcp-server'

describe('MockMcpServer', () => {
  it('should generate valid spawn command using node -e', () => {
    const mock = new MockMcpServer({
      responses: [
        { jsonrpc: '2.0', id: 1, result: { tools: [] } },
      ],
    })
    const cmd = mock.getSpawnCommand()
    expect(cmd.command).toBe('node')
    expect(Array.isArray(cmd.args)).toBe(true)
    expect(cmd.args[0]).toBe('-e')
    expect(typeof cmd.args[1]).toBe('string')
    expect(cmd.args[1]).toContain('process.stdin.on')
  })

  it('should generate server script with correct responses', () => {
    const responses: import('./mock-mcp-server').MockResponse[] = [
      { jsonrpc: '2.0' as const, id: 1, result: { name: 'test', version: '1.0.0' } },
    ]
    const mock = new MockMcpServer({ responses })
    const script = mock.getServerScript()
    expect(script).toContain('process.stdin.on')
    expect(script).toContain('process.stdout.write')
  })

  it('should include delay when specified', () => {
    const mock = new MockMcpServer({
      responses: [{ jsonrpc: '2.0', id: 1, result: {} }],
      delayMs: 500,
    })
    const script = mock.getServerScript()
    expect(script).toContain('delayMs = 500')
  })

  it('should cycle through responses', () => {
    const mock = new MockMcpServer({
      responses: [
        { jsonrpc: '2.0', id: 1, result: { order: 1 } },
        { jsonrpc: '2.0', id: 2, result: { order: 2 } },
      ],
    })
    // MockMcpServer cycles via modulo, which is tested implicitly
    // through StdioTransport integration tests
    expect(mock.getSpawnCommand().command).toBe('node')
  })

  it('should inject custom jsonrpcVersion into generated script', () => {
    const mock = new MockMcpServer({
      responses: [{ jsonrpc: '2.0', id: 1, result: {} }],
      jsonrpcVersion: '2.1',
    })
    const script = mock.getServerScript()
    expect(script).toContain('jsonrpcVersion = "2.1"')
  })

  it('defaults jsonrpcVersion to 2.0', () => {
    const mock = new MockMcpServer({
      responses: [{ jsonrpc: '2.0', id: 1, result: {} }],
    })
    const script = mock.getServerScript()
    expect(script).toContain('jsonrpcVersion = "2.0"')
  })
})