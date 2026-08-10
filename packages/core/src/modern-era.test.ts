import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createMcpServer } from './server'
import type { McpServer } from './types/api'
import { registerMatchers } from './assertions/index'
import { negotiateEra, isModernVersion } from './protocol/era'
import type { Transport } from './transport/types'
import { REQUEST_META_KEYS } from './types/modern/meta'
import { RESULT_TYPE } from './types/modern/mrtr'

// Register the matchers (some tests rely on them via expect.extend).
registerMatchers()

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

describe('modern era negotiation', () => {
  it('isModernVersion classifies 2026-07-28 as modern', () => {
    expect(isModernVersion('2026-07-28')).toBe(true)
    expect(isModernVersion('2024-11-05')).toBe(false)
    expect(isModernVersion('2025-11-25')).toBe(false)
  })

  it('negotiateEra probes a modern server via server/discover', async () => {
    const transport: Transport = {
      start: async () => {},
      send: async (_req) => {
        const req = _req as { method?: string; id?: number }
        if (req.method === 'server/discover') {
          return { jsonrpc: '2.0', id: req.id, result: { protocolVersions: ['2026-07-28'], capabilities: { tools: {} } } }
        }
        return { jsonrpc: '2.0', id: req.id, result: {}, resultType: 'complete' }
      },
      close: async () => {},
    }
    const result = await negotiateEra(transport, { mode: 'auto' })
    expect(result.era).toBe('modern')
    expect(result.protocolVersion).toBe('2026-07-28')
    expect(result.discover?.protocolVersions).toContain('2026-07-28')
  })

  it('negotiateEra falls back to legacy when the server does not answer discover', async () => {
    const transport: Transport = {
      start: async () => {},
      send: async () => {
        const err = Object.assign(new Error('Method not found'), { code: -32601 })
        throw err
      },
      close: async () => {},
    }
    const result = await negotiateEra(transport, {
      mode: 'auto',
      supportedProtocolVersions: ['2026-07-28', '2024-11-05'],
    })
    expect(result.era).toBe('legacy')
  })

  it('negotiateEra throws when pinning a modern era against a legacy-only server', async () => {
    const transport: Transport = {
      start: async () => {},
      send: async () => {
        const err = Object.assign(new Error('Method not found'), { code: -32601 })
        throw err
      },
      close: async () => {},
    }
    await expect(negotiateEra(transport, { mode: { pin: '2026-07-28' } })).rejects.toThrow(
      /pinned protocol version 2026-07-28/,
    )
  })

  it('negotiateEra throws when pinning modern era against a modern server that offers other versions', async () => {
    // Server responds to server/discover but doesn't list the pinned version.
    // This hits the pickMutualVersion pinned-error branch (era.ts lines 206-207).
    const transport: Transport = {
      start: async () => {},
      send: async (_req) => {
        const req = _req as { method?: string; id?: number }
        if (req.method === 'server/discover') {
          return {
            jsonrpc: '2.0',
            id: req.id,
            result: { supportedVersions: ['2030-01-01'], capabilities: { tools: {} } },
          }
        }
        return { jsonrpc: '2.0', id: req.id, result: {}, resultType: 'complete' }
      },
      close: async () => {},
    }
    await expect(
      negotiateEra(transport, { mode: { pin: '2026-07-28' } }),
    ).rejects.toThrow(/pinned protocol version 2026-07-28/)
  })

  it('negotiateEra throws EraNegotiationFailedError when server offers no mutual version', async () => {
    // Server responds to server/discover but only offers versions the client doesn't support.
    const transport: Transport = {
      start: async () => {},
      send: async (_req) => {
        const req = _req as { method?: string; id?: number }
        if (req.method === 'server/discover') {
          return {
            jsonrpc: '2.0',
            id: req.id,
            result: { supportedVersions: ['2030-01-01'], capabilities: { tools: {} } },
          }
        }
        return { jsonrpc: '2.0', id: req.id, result: {}, resultType: 'complete' }
      },
      close: async () => {},
    }
    await expect(
      negotiateEra(transport, {
        mode: 'auto',
        supportedProtocolVersions: ['2026-07-28'],
      }),
    ).rejects.toThrow(/none intersect the client's supported versions/)
  })
})

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

describe('custom matchers', () => {
  it('toHaveRequestMeta passes for a request with a _meta envelope', () => {
    const req = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: { _meta: { [REQUEST_META_KEYS.protocolVersion]: '2026-07-28' } },
    }
    // The matcher is registered via registerMatchers(); use expect().
    expect(req).toHaveRequestMeta()
  })

  it('RESULT_TYPE constants are exported', () => {
    expect(RESULT_TYPE.COMPLETE).toBe('complete')
    expect(RESULT_TYPE.INPUT_REQUIRED).toBe('input_required')
  })

  it('toHaveResultType passes for a result with resultType and fails when absent', () => {
    const withType = { resultType: 'complete', content: [] }
    expect(withType).toHaveResultType()

    const inputReq = { resultType: 'input_required', inputRequests: {} }
    expect(inputReq).toHaveResultType()

    // Absent resultType — spec violation in modern era.
    const withoutType = { content: [] }
    expect(withoutType).not.toHaveResultType()
  })
})

describe('subscriptions/listen — notification dispatch', () => {
  it('delivers pushed notifications to the subscription handler', async () => {
    let pushNotification: ((n: object) => void) | undefined

    const transport: Transport = {
      start: async () => {},
      send: async (request: object) => {
        const req = request as { method?: string; id?: number }
        if (req.method === 'server/discover') {
          return { jsonrpc: '2.0', id: req.id, result: { protocolVersions: ['2026-07-28'], capabilities: { tools: {} } } }
        }
        if (req.method === 'subscriptions/listen') {
          // Schedule notification dispatch after the ack resolves.
          setTimeout(() => {
            pushNotification?.({ method: 'notifications/tools/list_changed', params: {} })
          }, 10)
          return {
            jsonrpc: '2.0',
            id: req.id,
            result: { resultType: 'complete', honoredFilter: { toolsListChanged: true } },
          }
        }
        return { jsonrpc: '2.0', id: req.id, result: { resultType: 'complete' } }
      },
      close: async () => {},
      onNotification(handler: (n: object) => void) {
        pushNotification = handler
      },
    }

    const server = await createMcpServer({ transport, protocol: { era: { negotiation: 'auto' } } })
    expect(server.getProtocolEra()).toBe('modern')

    const sub = await server.listen({ toolsListChanged: true })
    expect(sub.honoredFilter.toolsListChanged).toBe(true)

    const received: string[] = []
    sub.onNotification((n) => { received.push(n.method) })

    // Allow the transport's deferred push to fire.
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(received).toContain('notifications/tools/list_changed')
    await sub.close()
    expect(await sub.closed).toBe('local')
    await server.close()
  })
})