/**
 * StdioTransport — communicates with an MCP server via subprocess stdin/stdout.
 * This is the default transport, suitable for local MCP servers.
 */

import { spawn, type ChildProcess } from 'child_process'
import type { Writable } from 'stream'
import type { Transport } from './types.js'
import { unwrapResponse } from './protocol.js'
import type { McpJsonRpcRequest, McpResponse } from '../types/mcp.js'
import { TimeoutError, TransportError, ServerSpawnError } from '../errors/index.js'

/**
 * StdioTransport options.
 */
export interface StdioTransportOptions {
  /** Executable command. */
  command: string
  /** Command arguments. */
  args: string[]
  /** Extra environment variables. */
  env?: Record<string, string>
  /** Timeout in ms, default 5000. */
  timeout?: number
}

const DEFAULT_TIMEOUT = 5000

/**
 * StdioTransport — communicates with an MCP server via subprocess.
 * Ideal for local MCP servers; 80%+ of MCP servers use this mode.
 */
export class StdioTransport implements Transport {
  private proc: ChildProcess | null = null
  private pendingRequests = new Map<number | string, {
    resolve: (value: unknown) => void
    reject: (reason: unknown) => void
    timeoutId: ReturnType<typeof setTimeout>
  }>()
  private notificationHandler?: (notification: object) => void
  private requestId = 0
  private stderrBuffer = ''

  constructor(private options: StdioTransportOptions) {}

  /** @inheritdoc */
  async start(): Promise<void> {
    const timeout = this.options.timeout ?? DEFAULT_TIMEOUT
    const { command, args, env } = this.options

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(timeout))
      }, timeout)

      try {
        const spawnEnv = { ...process.env, ...env }

        this.proc = spawn(command, args, {
          env: spawnEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        this.proc.stderr?.on('data', (chunk: Buffer) => {
          this.stderrBuffer += chunk.toString()
          if (process.env.DEBUG === '1') {
            console.error('[StdioTransport stderr]', chunk.toString().trim())
          }
        })

        this.proc.on('exit', (code, signal) => {
          const msg = `Server exited with code ${code}, signal ${signal}`
          for (const [, pending] of Array.from(this.pendingRequests.entries())) {
            clearTimeout(pending.timeoutId)
            pending.reject(new TransportError(msg, command))
          }
          this.pendingRequests.clear()
        })

        this.proc.on('error', (err) => {
          clearTimeout(timeoutId)
          reject(new ServerSpawnError(command, args, null, err.message))
        })

        this.proc.stdout?.on('data', (chunk: Buffer) => {
          this.handleStdout(chunk.toString())
        })

        setTimeout(() => {
          clearTimeout(timeoutId)
          resolve()
        }, 100)
      } catch (err) {
        clearTimeout(timeoutId)
        reject(new ServerSpawnError(command, args, null, String(err)))
      }
    })
  }

  /** @inheritdoc */
  async send(request: object): Promise<object> {
    if (!this.proc?.stdin) {
      throw new TransportError('Transport not started', this.options.command)
    }

    const stdin: Writable = this.proc.stdin as Writable
    const jsonRpcRequest = request as McpJsonRpcRequest
    const id = jsonRpcRequest.id ?? ++this.requestId

    return new Promise((resolve, reject) => {
      const timeout = this.options.timeout ?? DEFAULT_TIMEOUT
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new TimeoutError(timeout))
      }, timeout)

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject: reject as (reason: unknown) => void,
        timeoutId,
      })

      const line = JSON.stringify({ ...jsonRpcRequest, id }) + '\n'
      stdin.write(line, (err) => {
        if (err) {
          clearTimeout(timeoutId)
          this.pendingRequests.delete(id)
          reject(new TransportError(`Write failed: ${err.message}`, this.options.command))
        }
      })
    })
  }

  /** @inheritdoc */
  async close(): Promise<void> {
    for (const [, pending] of Array.from(this.pendingRequests.entries())) {
      clearTimeout(pending.timeoutId)
      pending.reject(new TransportError('Transport closed'))
    }
    this.pendingRequests.clear()

    if (this.proc) {
      this.proc.kill('SIGTERM')
      this.proc = null
    }
  }

  /** @inheritdoc */
  onNotification(handler: (notification: object) => void): void {
    this.notificationHandler = handler
  }

  /** Gets the stderr buffer (for debugging). */
  getStderr(): string {
    return this.stderrBuffer
  }

  private handleStdout(data: string): void {
    const lines = data.split('\n').filter((l) => l.trim())
    for (const line of lines) {
      try {
        const msg = JSON.parse(line) as McpResponse

        if (!msg.id) {
          this.notificationHandler?.(msg)
          continue
        }

        const pending = this.pendingRequests.get(msg.id)
        if (pending) {
          clearTimeout(pending.timeoutId)
          this.pendingRequests.delete(msg.id)
          try {
            const result = unwrapResponse(msg)
            pending.resolve(result)
          } catch (err) {
            pending.reject(err)
          }
        }
      } catch {
        // Ignore parse errors for non-JSON lines
      }
    }
  }
}