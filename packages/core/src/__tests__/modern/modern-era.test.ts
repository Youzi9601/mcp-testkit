import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createMcpServer } from '../../server'
import type { McpServer } from '../../types/api'

// A minimal inline mock server that answers the modern-era protocol:
// server/discover, and lucky-echo tools/call with resultType.
const MODERN_SERVER_SCRIPT = `
process.stdin.on('data', (d) => {
  const line = d.toString().trim()
  if (!line) return
  let req
  try { req = JSON.parse(line) } catch { return }
  let result = { resultType: 'complete' }
  if (req.method === 'server/discover') {
    result = { protocolVersions: ['2026-07-28'], capabilities: { tools: {} } }
  } else if (req.method === 'tools/call') {
    const name = req.params && req.params.name || ''
    if (name === 'askConfirmation') {
      // MRTR: first round asks for confirmation, then completes.
      if (!req.params.inputResponses) {
        return process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: {
          resultType: 'input_required',
          inputRequests: { confirm: { kind: 'elicit' } },
          requestState: 'state-1'
        } }) + '\\n')
      }
      result = { resultType: 'complete', content: [{ type: 'text', text: 'confirmed' }] }
    } else {
      result = { resultType: 'complete', content: [{ type: 'text', text: 'ok' }] }
    }
  } else if (req.method === 'subscriptions/listen') {
    const filter = req.params || {}
    result = {
      resultType: 'complete',
      honoredFilter: {
        toolsListChanged: filter.toolsListChanged === true,
        promptsListChanged: false,
        resourcesListChanged: false,
      },
    }
  }
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\\n')
})
`

describe('createMcpServer — modern era', () => {
  let server: McpServer

  beforeAll(async () => {
    server = await createMcpServer({
      command: 'node',
      args: ['-e', MODERN_SERVER_SCRIPT],
      timeout: 5000,
      protocol: { era: { negotiation: 'auto' } },
    })
  }, 15000)

  afterAll(async () => {
    await server?.close()
  })

  it('negotiates the modern era', () => {
    expect(server.getProtocolEra()).toBe('modern')
  })

  it('discovers server capabilities via server/discover', async () => {
    const result = await server.discover() as { protocolVersions?: string[]; capabilities?: { tools?: unknown } }
    expect(result.protocolVersions).toContain('2026-07-28')
    expect(result.capabilities?.tools).toBeDefined()
  })

  it('opens a subscriptions/listen stream, returns honored filter, and can close', async () => {
    const sub = await server.listen({ toolsListChanged: true })
    expect(sub.honoredFilter.toolsListChanged).toBe(true)
    await sub.close()
    expect(await sub.closed).toBe('local')
  })

  it('calls a tool and returns a complete result', async () => {
    const result = await server.callTool('greet', {}) as { resultType?: string; content?: unknown }
    expect(result.content).toBeDefined()
  })

  it('returns an input_required result when no MRTR resolver is provided', async () => {
    const result = await server.callTool('askConfirmation', {}) as {
      resultType?: string
      inputRequests?: unknown
      requestState?: string
    }
    expect(result.resultType).toBe('input_required')
    expect(result.inputRequests).toBeDefined()
    expect(result.requestState).toBe('state-1')
  })
})