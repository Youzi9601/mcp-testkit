import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Transport } from '../../transport/types'
import { createMcpServer } from '../../server'

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