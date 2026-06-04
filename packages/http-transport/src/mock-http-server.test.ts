/**
 * Tests for mock HTTP server.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  startMockHttpServer,
  stopMockHttpServer,
} from './mock-http-server.js'
import type { Server } from 'node:http'

describe('mock-http-server', () => {
  let server: Server
  let port: number

  afterEach(async () => {
    await stopMockHttpServer(server)
  })

  describe('startMockHttpServer', () => {
    it('should start on the specified port', async () => {
      const started = await startMockHttpServer({
        responses: [{ jsonrpc: '2.0', id: null, result: {} }],
        port: 38457,
      })
      server = started.server
      port = started.port
      expect(port).toBe(38457)
    })

    it('should respond with JSON-RPC response', async () => {
      const started = await startMockHttpServer({
        responses: [
          { jsonrpc: '2.0', id: 1, result: { value: 42 } },
        ],
        port: 38458,
      })
      server = started.server
      port = started.port

      const res = await fetch(`http://localhost:${port}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'test' }),
      })

      expect(res.status).toBe(200)
      const text = await res.text()
      const parsed = JSON.parse(text.trim())
      expect(parsed).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        result: { value: 42 },
      })
    })

    it('should return 404 for unknown routes', async () => {
      const started = await startMockHttpServer({
        responses: [{ jsonrpc: '2.0', id: null, result: {} }],
        port: 38459,
      })
      server = started.server
      port = started.port

      const res = await fetch(`http://localhost:${port}/unknown`, {
        method: 'GET',
      })
      expect(res.status).toBe(404)
    })

    it('should cycle responses in order', async () => {
      const started = await startMockHttpServer({
        responses: [
          { jsonrpc: '2.0', id: null, result: { n: 1 } },
          { jsonrpc: '2.0', id: null, result: { n: 2 } },
          { jsonrpc: '2.0', id: null, result: { n: 3 } },
        ],
        port: 38460,
      })
      server = started.server
      port = started.port

      const send = (n: number) =>
        fetch(`http://localhost:${port}/mcp`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: n, method: 'test' }),
        }).then((r) => r.text())

      const r1 = JSON.parse((await send(1)).trim())
      const r2 = JSON.parse((await send(2)).trim())
      const r3 = JSON.parse((await send(3)).trim())
      const r4 = JSON.parse((await send(4)).trim()) // cycles back

      expect(r1.result.n).toBe(1)
      expect(r2.result.n).toBe(2)
      expect(r3.result.n).toBe(3)
      expect(r4.result.n).toBe(1) // back to start
    })

    it('should apply delay when delayMs is set', async () => {
      const started = await startMockHttpServer({
        responses: [{ jsonrpc: '2.0', id: null, result: {} }],
        port: 38461,
        delayMs: 50,
      })
      server = started.server
      port = started.port

      const start = Date.now()
      await fetch(`http://localhost:${port}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'test' }),
      })
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(45)
    })
  })

  describe('stopMockHttpServer', () => {
    it('should close the server gracefully', async () => {
      const started = await startMockHttpServer({
        responses: [{ jsonrpc: '2.0', id: null, result: {} }],
      })
      server = started.server
      port = started.port

      await stopMockHttpServer(server)

      // Server should no longer be listening; fetch should fail with connection refused
      await expect(
        fetch(`http://localhost:${port}/mcp`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'test' }),
        }),
      ).rejects.toThrow('fetch failed')
    })
  })
})