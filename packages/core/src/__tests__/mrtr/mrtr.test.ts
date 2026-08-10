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

describe('createMcpServer — MRTR with resolver', () => {
  let server: McpServer

  beforeAll(async () => {
    server = await createMcpServer({
      command: 'node',
      args: ['-e', MODERN_SERVER_SCRIPT],
      timeout: 5000,
      protocol: { era: { negotiation: 'auto' } },
      mrtr: {
        resolveInput: async (inputRequests) => {
          expect(inputRequests).toBeDefined()
          return { confirm: { action: 'accept', content: { confirm: true } } }
        },
      },
    })
  }, 15000)

  afterAll(async () => {
    await server?.close()
  })

  it('retries the call with inputResponses and completes', async () => {
    const result = await server.callTool('askConfirmation', {}) as {
      resultType?: string
      content?: Array<{ text: string }>
    }
    expect(result.content?.[0]?.text).toBe('confirmed')
  })
})