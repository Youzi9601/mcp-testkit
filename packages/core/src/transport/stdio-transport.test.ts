import { describe, it, expect, afterEach } from 'vitest'
import { StdioTransport } from './stdio-transport'
import type { Transport } from './types'

describe('StdioTransport', () => {
  afterEach(async () => {
    // Cleanup any lingering processes
  })

  it('should implement Transport interface', () => {
    const transport = new StdioTransport({
      command: 'node',
      args: ['-e', 'process.exit(0)'],
    })
    expect(typeof transport.start).toBe('function')
    expect(typeof transport.send).toBe('function')
    expect(typeof transport.close).toBe('function')
  })

  it('should start and close successfully', async () => {
    const transport = new StdioTransport({
      command: 'node',
      args: ['-e', 'process.stdin.resume()'],
    })
    await transport.start()
    expect(transport.getStderr()).toBe('')
    await transport.close()
  })

  it('should handle simple JSON exchange', async () => {
    // A minimal MCP-like server that echoes a JSON-RPC response
    const script = `
process.stdin.on('data', (d) => {
  const line = d.toString().trim()
  if (!line) return
  try {
    const req = JSON.parse(line)
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: req.id,
      result: { echo: true }
    }) + '\\n')
  } catch (e) {}
})
`
    const transport = new StdioTransport({
      command: 'node',
      args: ['-e', script],
      timeout: 5000,
    })

    await transport.start()
    const result = await transport.send({ jsonrpc: '2.0', id: 1, method: 'test', params: {} })
    expect(result).toEqual({ echo: true })
    await transport.close()
  })

  it('should buffer stderr correctly', async () => {
    const transport = new StdioTransport({
      command: 'node',
      args: ['-e', 'console.error("test error")'],
    })
    await transport.start()
    // Poll: production start() resolves after a 100ms fallback; under parallel load the
    // child stderr pipe may not yet have flushed into buffer at the moment start() returns.
    const deadline = Date.now() + 1000
    while (Date.now() < deadline && !transport.getStderr().includes('test error')) {
      await new Promise((r) => setTimeout(r, 20))
    }
    expect(transport.getStderr()).toContain('test error')
    await transport.close()
  })

  it('should throw when sending before start', async () => {
    const transport = new StdioTransport({
      command: 'node',
      args: ['-e', 'process.exit(0)'],
    })
    await expect(
      transport.send({ jsonrpc: '2.0', id: 1, method: 'test' })
    ).rejects.toThrow('Transport not started')
  })

  it('should throw when process exits unexpectedly', async () => {
    const transport = new StdioTransport({
      command: 'node',
      args: ['-e', 'process.exit(1)'],
      timeout: 5000,
    })

    await transport.start()
    // Wait for process to exit
    await new Promise((r) => setTimeout(r, 200))

    // Sending should fail because process died
    await expect(
      transport.send({ jsonrpc: '2.0', id: 1, method: 'test' })
    ).rejects.toThrow()
    await transport.close()
  })

  it('should reject when server returns an error response (unwrapResponse throws)', async () => {
    // Server sends a valid JSON-RPC error response — unwrapResponse throws
    // which triggers the pending.reject(err) branch at stdio-transport.ts:177
    const script = `
process.stdin.on('data', (d) => {
  const line = d.toString().trim()
  if (!line) return
  try {
    const req = JSON.parse(line)
    // Return a valid JSON-RPC error response (no result, has error field)
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: req.id,
      error: { code: -32601, message: 'Method not found' }
    }) + '\\n')
  } catch (e) {}
})
`
    const transport = new StdioTransport({
      command: 'node',
      args: ['-e', script],
    })
    await transport.start()
    await expect(
      transport.send({ jsonrpc: '2.0', id: 1, method: 'someMethod' }),
    ).rejects.toThrow('Method not found')
    await transport.close()
  })

  it('should handle notifications', async () => {
    let receivedNotification: object | null = null
    const script = `
process.stdin.on('data', (d) => {
  const line = d.toString().trim()
  if (!line) return
  try {
    const req = JSON.parse(line)
    // Server sends a notification first
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'server/notification',
      params: { msg: 'hello' }
    }) + '\\n')
    // Then the response to the request
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: req.id,
      result: {}
    }) + '\\n')
  } catch (e) {}
})
`
    const transport = new StdioTransport({
      command: 'node',
      args: ['-e', script],
    })

    transport.onNotification((notification) => {
      receivedNotification = notification
    })

    await transport.start()
    await transport.send({ jsonrpc: '2.0', id: 1, method: 'test' })

    expect(receivedNotification).toEqual({
      jsonrpc: '2.0',
      method: 'server/notification',
      params: { msg: 'hello' },
    })

    await transport.close()
  })
})

describe('Transport interface', () => {
  it('StdioTransport should satisfy Transport contract', () => {
    const transport: Transport = new StdioTransport({
      command: 'node',
      args: ['-e', 'process.exit(0)'],
    })
    expect(typeof transport.start).toBe('function')
    expect(typeof transport.send).toBe('function')
    expect(typeof transport.close).toBe('function')
    expect(typeof transport.onNotification).toBe('function')
  })
})