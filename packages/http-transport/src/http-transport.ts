/**
 * HttpTransport — communicates with an MCP server over HTTP.
 *
 * Uses the Streamable HTTP protocol:
 * POST /mcp with JSON-RPC request body.
 * Server responds with 200 OK, Content-Type: application/json, chunked transfer.
 */

import { spawn as nodeSpawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import type { Transport } from './types.js'

/**
 * JSON-RPC 2.0 request object.
 */
export interface JsonRpcRequest {
  jsonrpc: string
  id: number | string | null
  method: string
  params?: Record<string, unknown>
}

/**
 * JSON-RPC 2.0 response object.
 */
export interface JsonRpcResponse {
  jsonrpc: string
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string }
}

export interface HttpTransportOptions {
  /** MCP HTTP endpoint URL (e.g., 'http://localhost:3000/mcp'). */
  url: string
  /**
   * Optional server process to start before connecting.
   * When provided, the transport will spawn the process and wait for it to be ready.
   */
  startServer?: {
    command: string
    args: string[]
    cwd?: string
    env?: Record<string, string>
    /** Readiness check URL (GET). Defaults to checking the base URL. */
    readinessUrl?: string
  }
  /** Extra HTTP headers sent with every request. */
  headers?: Record<string, string>
  /** fetch implementation. Defaults to globalThis.fetch. */
  fetch?: typeof fetch
  /** AbortSignal for request timeout. */
  signal?: AbortSignal
  /** Request timeout in ms. Default: 30000. */
  timeout?: number
}

const DEFAULT_TIMEOUT = 30_000

/**
 * HTTP transport for MCP servers.
 * Implements the Transport interface using fetch-based HTTP POST.
 */
export class HttpTransport implements Transport {
  private childProc: ChildProcess | undefined
  private serverReady = false
  private readonly fetchImpl: typeof fetch
  private readonly requestHeaders: Record<string, string>

  constructor(private options: HttpTransportOptions) {
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.requestHeaders = {
      'Content-Type': 'application/json',
      ...this.options.headers,
    }
  }

  /** @inheritdoc */
  async start(): Promise<void> {
    if (this.options.startServer) {
      await this.startInternalServer()
    }
  }

  /** @inheritdoc */
  async send(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.options.url) {
      throw new Error('HttpTransport not started: no URL configured')
    }

    const timeout = this.options.timeout ?? DEFAULT_TIMEOUT
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await this.fetchImpl(this.options.url, {
        method: 'POST',
        headers: this.requestHeaders,
        body: JSON.stringify(request),
        signal: this.options.signal ?? controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const text = await response.text()

      if (!text.trim()) {
        throw new Error('Empty response from server')
      }

      // Parse full response body; reject non-JSON bodies up front.
      try {
        return JSON.parse(text) as JsonRpcResponse
      } catch {
        throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timed out')
      }
      throw err
    }
  }

  /** @inheritdoc */
  async close(): Promise<void> {
    if (this.childProc) {
      this.childProc.kill()
      this.childProc = undefined
    }
  }

  /* istanbul ignore next */
  private async startInternalServer(): Promise<void> {
    const proc = nodeSpawn(
      this.options.startServer!.command,
      this.options.startServer!.args,
      {
        cwd: this.options.startServer!.cwd,
        env: { ...process.env, ...this.options.startServer!.env },
        stdio: 'pipe',
      },
    )

    this.childProc = proc

    // Suppress ENOENT and other spawn errors - they're surfaced via exitCode checks in the polling loop
    proc.on('error', () => {
      // ignore - exitCode path handles this
    })

    // Wait for server to be ready
    const readyUrl = this.options.startServer!.readinessUrl ?? this.options.url
    const maxAttempts = 20
    const delay = 100

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check if process has already exited before making HTTP request
      /* istanbul ignore if: defensive check — difficult to trigger in unit tests (process exits during poll interval) */
      if (this.childProc?.exitCode !== null && this.childProc?.exitCode !== undefined) {
        throw new Error(`Server process exited with code ${this.childProc.exitCode}`)
      }

      await new Promise((r) => setTimeout(r, delay))

      // Check again after the sleep (process may have crashed during the delay)
      /* istanbul ignore if: defensive check — difficult to trigger in unit tests */
      if (this.childProc?.exitCode !== null && this.childProc?.exitCode !== undefined) {
        throw new Error(`Server process exited with code ${this.childProc.exitCode}`)
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await this.fetchImpl(readyUrl, {
          method: 'GET',
          headers: this.requestHeaders,
        })
        if (res.ok || res.status !== 404) {
          this.serverReady = true
          return
        }
      } catch {
        // not ready yet
      }
    }

    // Final exit code check after loop exhausts
    const exitCode = this.childProc?.exitCode
    if (exitCode !== null && exitCode !== undefined) {
      throw new Error(`Server process exited with code ${exitCode}`)
    }

    this.serverReady = true
  }
}