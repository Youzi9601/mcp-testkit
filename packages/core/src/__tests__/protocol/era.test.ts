import { describe, it, expect } from 'vitest'
import { isModernVersion, negotiateEra } from '../../protocol/era'
import type { Transport } from '../../transport/types'

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