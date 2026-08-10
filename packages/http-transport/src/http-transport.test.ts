/**
 * Tests for HttpTransport.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { HttpTransport } from './http-transport.js'
import { startMockHttpServer, stopMockHttpServer } from './mock-http-server.js'
import type { Server } from 'node:http'

describe('HttpTransport', () => {
  let mockServer: Server
  let mockPort: number

  beforeEach(async () => {
    // Default mock server with a success response
    const started = await startMockHttpServer({
      responses: [
        { jsonrpc: '2.0', id: null, result: { tools: [] } },
      ],
    })
    mockServer = started.server
    mockPort = started.port
  })

  afterEach(async () => {
    await stopMockHttpServer(mockServer)
  })

  describe('send', () => {
    it('should send a JSON-RPC request and receive a response', async () => {
      const transport = new HttpTransport({
        url: `http://localhost:${mockPort}/mcp`,
      })

      const response = await transport.send({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      })

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: null,
        result: { tools: [] },
      })
    })

    it('should include custom headers via provided fetch', async () => {
      // Test that the fetch wrapper sees the correct headers
      let capturedHeaders: Record<string, string> = {}
      const testFetch = async (
        _url: string,
        init?: RequestInit,
      ): Promise<Response> => {
        capturedHeaders = (init?.headers as Record<string, string>) ?? {}
        return new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        )
      }

      const transport = new HttpTransport({
        url: `http://localhost:${mockPort}/mcp`,
        headers: { Authorization: 'Bearer test-token' },
        fetch: testFetch,
      })

      await transport.send({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      })

      expect(capturedHeaders['authorization'] ?? capturedHeaders['Authorization']).toBe('Bearer test-token')
      expect(capturedHeaders['content-type'] ?? capturedHeaders['Content-Type']).toBe('application/json')
    })

    it('should throw on HTTP error status', async () => {
      const { stopMockHttpServer: stop2 } = await import('./mock-http-server.js')
      await stop2(mockServer)

      // Server that returns 500
      const errorServer = await startMockHttpServer({ responses: [] })
      const srv = errorServer.server
      srv.removeAllListeners('request')
      srv.on('request', (_req, res) => {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end('Internal Server Error')
      })

      const transport = new HttpTransport({
        url: `http://localhost:${errorServer.port}/mcp`,
      })

      await expect(
        transport.send({ jsonrpc: '2.0', id: 1, method: 'test' }),
      ).rejects.toThrow('HTTP 500')

      await stopMockHttpServer(srv)
    })

    it('should handle JSON-RPC error responses', async () => {
      const { stopMockHttpServer: stop2 } = await import('./mock-http-server.js')
      await stop2(mockServer)

      const errorServer = await startMockHttpServer({
        responses: [
          {
            jsonrpc: '2.0',
            id: 1,
            error: { code: -32601, message: 'Method not found' },
          },
        ],
      })

      const transport = new HttpTransport({
        url: `http://localhost:${errorServer.port}/mcp`,
      })

      const response = await transport.send({ jsonrpc: '2.0', id: 1, method: 'unknown' })
      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32601, message: 'Method not found' },
      })

      await stopMockHttpServer(errorServer.server)
    })

    it('should cycle through multiple responses', async () => {
      const { stopMockHttpServer: stop2 } = await import('./mock-http-server.js')
      await stop2(mockServer)

      const multiServer = await startMockHttpServer({
        responses: [
          { jsonrpc: '2.0', id: 1, result: { order: 1 } },
          { jsonrpc: '2.0', id: 2, result: { order: 2 } },
        ],
      })

      const transport = new HttpTransport({
        url: `http://localhost:${multiServer.port}/mcp`,
      })

      const res1 = await transport.send({ jsonrpc: '2.0', id: 1, method: 'first' })
      const res2 = await transport.send({ jsonrpc: '2.0', id: 2, method: 'second' })

      expect(res1).toMatchObject({ result: { order: 1 } })
      expect(res2).toMatchObject({ result: { order: 2 } })

      await stopMockHttpServer(multiServer.server)
    })

    it('should handle empty response with error', async () => {
      const { stopMockHttpServer: stop2 } = await import('./mock-http-server.js')
      await stop2(mockServer)

      const emptyServer = await startMockHttpServer({ responses: [] })
      const srv = emptyServer.server
      srv.removeAllListeners('request')
      srv.on('request', (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end('') // empty body
      })

      const transport = new HttpTransport({
        url: `http://localhost:${emptyServer.port}/mcp`,
      })

      await expect(
        transport.send({ jsonrpc: '2.0', id: 1, method: 'test' }),
      ).rejects.toThrow('Empty response from server')

      await stopMockHttpServer(srv)
    })

    it('should throw on invalid JSON response', async () => {
      const { stopMockHttpServer: stop2 } = await import('./mock-http-server.js')
      await stop2(mockServer)

      const badJsonServer = await startMockHttpServer({ responses: [] })
      const srv = badJsonServer.server
      srv.removeAllListeners('request')
      srv.on('request', (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end('not valid json{')
      })

      const transport = new HttpTransport({
        url: `http://localhost:${badJsonServer.port}/mcp`,
      })

      await expect(
        transport.send({ jsonrpc: '2.0', id: 1, method: 'test' }),
      ).rejects.toThrow('Invalid JSON response')

      await stopMockHttpServer(srv)
    })

    it('should throw "not started: no URL configured" when url is empty', async () => {
      // Construct with no url — the guard at send() preempts any
      // network attempt. Covers the `!this.options.url` branch.
      const transport = new HttpTransport({ url: '' })
      await expect(
        transport.send({ jsonrpc: '2.0', id: 1, method: 'test' }),
      ).rejects.toThrow('no URL configured')
    })

    it('should throw "Request timed out" when the fetch aborts on timeout', async () => {
      // A custom fetch that throws AbortError covers the
      // `err.name === 'AbortError'` branch in send().
      const abortFetch = async (): Promise<Response> => {
        const err = new Error('The operation was aborted')
        err.name = 'AbortError'
        throw err
      }

      const transport = new HttpTransport({
        url: `http://localhost:${mockPort}/mcp`,
        fetch: abortFetch as typeof fetch,
      })

      await expect(
        transport.send({ jsonrpc: '2.0', id: 1, method: 'test' }),
      ).rejects.toThrow('Request timed out')
    })
  })

  describe('close', () => {
    it('should close without error when no child process', async () => {
      const transport = new HttpTransport({
        url: `http://localhost:${mockPort}/mcp`,
      })
      await expect(transport.close()).resolves.toBeUndefined()
    })

    it('should close with child process after server spawn error', async () => {
      // start() will fail because 'nonexistent-cmd-xyz' doesn't exist,
      // but the childProc is set before the error is thrown,
      // so close() should still be callable and kill the process.
      const transport = new HttpTransport({
        url: `http://localhost:${mockPort}/mcp`,
        startServer: {
          command: 'nonexistent-cmd-xyz',
          args: [],
        },
      })

      // Wait for start() to fail (process exits quickly)
      try {
        await transport.start()
      } catch {
        // Expected: ServerSpawnError
      }

      // Even after the error, close() should work without throwing
      await expect(transport.close()).resolves.toBeUndefined()
    })
  })
})