import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createMcpServer } from './server'
import type { McpServer } from './types/api'

describe('createMcpServer', () => {
  let server: McpServer

  afterAll(async () => {
    await server?.close()
  })

  it('should create server and call tool', async () => {
    // Minimal MCP server that responds to tools/call
    const script = `
process.stdin.on('data', (d) => {
  const line = d.toString().trim()
  if (!line) return
  try {
    const req = JSON.parse(line)
    let result = {}
    if (req.method === 'tools/call') {
      result = { content: [{ type: 'text', text: 'ok' }] }
    } else if (req.method === 'tools/list') {
      result = { tools: [] }
    } else if (req.method === 'initialize') {
      result = { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'test', version: '0.1.0' } }
    }
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\\n')
  } catch (e) {}
})
`
    server = await createMcpServer({
      command: 'node',
      args: ['-e', script],
      timeout: 5000,
    })
    const result = await server.listTools()
    expect(result).toBeDefined()
  }, 10000)

  it('should call tool with arguments', async () => {
    const script = `
process.stdin.on('data', (d) => {
  const line = d.toString().trim()
  if (!line) return
  try {
    const req = JSON.parse(line)
    const result = { content: [{ type: 'text', text: JSON.stringify(req.params) }] }
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\\n')
  } catch (e) {}
})
`
    const srv = await createMcpServer({
      command: 'node',
      args: ['-e', script],
    })
    const result = await srv.callTool('echo', { msg: 'hello' })
    expect(result).toBeDefined()
    await srv.close()
  }, 10000)

  it('should throw on spawn failure', async () => {
    await expect(
      createMcpServer({ command: 'nonexistent-command', args: [] })
    ).rejects.toThrow()
  })

  it('should call getCapabilities', async () => {
    const script = `
process.stdin.on('data', (d) => {
  const line = d.toString().trim()
  if (!line) return
  try {
    const req = JSON.parse(line)
    const result = { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'test', version: '0.1.0' } }
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\\n')
  } catch (e) {}
})
`
    const srv = await createMcpServer({
      command: 'node',
      args: ['-e', script],
    })
    const result = await srv.getCapabilities()
    expect(result).toBeDefined()
    await srv.close()
  }, 10000)

  it('should throw when called with no transport and no command/args', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      createMcpServer({} as Parameters<typeof createMcpServer>[0]),
    ).rejects.toThrow(
      'createMcpServer requires either options.transport or both options.command and options.args',
    )
  })

  it('should call listResources', async () => {
    const script = `
process.stdin.on('data', (d) => {
  const line = d.toString().trim()
  if (!line) return
  try {
    const req = JSON.parse(line)
    let result = {}
    if (req.method === 'tools/call') {
      result = { content: [{ type: 'text', text: 'ok' }] }
    } else if (req.method === 'tools/list') {
      result = { tools: [] }
    } else if (req.method === 'initialize') {
      result = { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'test', version: '0.1.0' } }
    } else if (req.method === 'resources/list') {
      result = { resources: [] }
    }
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\\n')
  } catch (e) {}
})
`
    const srv = await createMcpServer({
      command: 'node',
      args: ['-e', script],
    })
    const result = await srv.listResources()
    expect(result).toBeDefined()
    await srv.close()
  }, 10000)
})