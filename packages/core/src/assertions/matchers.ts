/**
 * Custom Vitest matchers for MCP testing.
 *
 * This module provides MCP-specific matchers that extend Vitest's expect().
 * All helpers are defined internally.
 */

/// <reference types="vitest/globals" />

import type { McpResponse, McpErrorResponse } from '../types/mcp.js'

// Vitest 2.x does not export MatcherState — mirror the minimal interface locally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMatcherState = { isNot: boolean; promise: Promise<any>; utils: readonly { name: string; fn: (...args: any[]) => any }[]; testPath?: string }

// ─── Helper Types ────────────────────────────────────────────────────────────

interface JsonRpcContent {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
  resource?: { uri: string; mimeType?: string }
}

// ─── Core Type Checks ────────────────────────────────────────────────────────

function isMcpResponse(value: unknown): value is McpResponse {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return obj.jsonrpc === '2.0' && ('result' in obj || 'error' in obj)
}

function isErrorResponse(value: unknown): value is McpErrorResponse {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return 'error' in obj && typeof obj.error === 'object' && obj.error !== null
}

// ─── Content Extraction ──────────────────────────────────────────────────────

function getContent(response: unknown, contentType?: string): JsonRpcContent[] | undefined {
  let content: JsonRpcContent[] | undefined

  if (isMcpResponse(response)) {
    if ('result' in response && response.result && typeof response.result === 'object') {
      const result = response.result as Record<string, unknown>
      if (Array.isArray(result.content)) {
        content = result.content as JsonRpcContent[]
      }
    }
  } else if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>
    if (Array.isArray(obj.content)) {
      content = obj.content as JsonRpcContent[]
    }
  }

  if (!content) return undefined
  if (contentType) {
    return content.filter(item => item.type === contentType)
  }
  return content
}

function getTextContent(response: unknown, ignoreCase = false): string {
  const content = getContent(response)
  if (!content) return ''
  const texts = content.filter(item => item.type === 'text' && item.text).map(item => item.text as string)
  let result = texts.join('')
  if (ignoreCase) result = result.toLowerCase()
  return result
}

function getFirstContentType(response: unknown): string | undefined {
  const content = getContent(response)
  if (!content || content.length === 0) return undefined
  return content[0].type
}

// ─── MCP Error Utilities ─────────────────────────────────────────────────────

function isMcpErrorObj(value: unknown): value is { code: number; message: string; data?: unknown } {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return typeof obj.code === 'number' && typeof obj.message === 'string'
}

function getMcpError(value: unknown): { code: number; message: string; data?: unknown } | null {
  if (!value || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  if ('error' in obj && isMcpErrorObj(obj.error)) {
    return obj.error as { code: number; message: string; data?: unknown }
  }
  if (isMcpErrorObj(obj)) {
    return { code: obj.code as number, message: obj.message as string, data: obj.data }
  }
  return null
}

function isTransportError(value: unknown, expectedMessage?: string): boolean {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  if (obj.name === 'TransportError' || obj.name === 'ConnectionLostError') {
    if (expectedMessage && typeof obj.message === 'string') {
      return obj.message.includes(expectedMessage)
    }
    return true
  }
  if (obj.name === 'Error' && 'code' in obj && obj.code === -32000) {
    if (expectedMessage && typeof obj.message === 'string') {
      return obj.message.includes(expectedMessage)
    }
    return true
  }
  return false
}

function isTimeoutError(value: unknown, expectedMethod?: string): boolean {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  if (obj.name === 'TimeoutError') {
    if (expectedMethod && obj.method !== expectedMethod) return false
    return true
  }
  return false
}

function isFromToolError(
  value: unknown,
  expectedToolName: string,
  expectedArgs?: Record<string, unknown>,
): boolean {
  if (!isErrorResponse(value)) return false
  const mcpError = getMcpError(value)
  if (!mcpError) return false
  const data = mcpError.data as { tool?: string; args?: Record<string, unknown> } | undefined
  if (!data?.tool) return false
  if (data.tool !== expectedToolName) return false
  if (expectedArgs) return JSON.stringify(data.args) === JSON.stringify(expectedArgs)
  return true
}

// ─── Matcher Registration ────────────────────────────────────────────────────

/**
 * Registers all custom matchers with Vitest.
 * Call this once before running tests.
 */
export function registerMatchers(): void {
  ;(expect as any).extend({
    toBeValidMcpResponse(this: AnyMatcherState, received: unknown, ..._args: unknown[]) {
      if (!received || typeof received !== 'object') {
        return { pass: false, actual: String(received), expected: '{ jsonrpc: "2.0", id: ..., result|error: ... }', message: () => 'Expected a valid MCP response object' }
      }
      const obj = received as Record<string, unknown>
      const hasVersion = obj.jsonrpc === '2.0'
      const hasId = 'id' in obj
      const hasResultOrError = 'result' in obj || 'error' in obj
      const pass = hasVersion && hasId && hasResultOrError
      return {
        pass,
        actual: JSON.stringify(received),
        expected: '{ jsonrpc: "2.0", id: ..., result|error: ... }',
        message: () => {
          if (!hasVersion) return `Expected jsonrpc "2.0", got "${obj.jsonrpc}"`
          if (!hasId) return 'Expected id property'
          if (!hasResultOrError) return 'Expected result or error property'
          return 'Expected a valid MCP response'
        },
      }
    },

    toBeMcpSuccess(this: AnyMatcherState, received: unknown, ..._args: unknown[]) {
      if (!received || typeof received !== 'object') {
        return { pass: false, actual: String(received), expected: 'MCP success', message: () => 'Expected an MCP response object' }
      }
      const obj = received as Record<string, unknown>
      const pass = 'result' in obj
      return {
        pass,
        actual: JSON.stringify(received),
        expected: 'MCP success',
        message: () => pass ? 'Expected not to be MCP success' : 'Expected a success response with result',
      }
    },

    toBeMcpError(this: AnyMatcherState, received: unknown, expectedCode?: number) {
      if (!received || typeof received !== 'object') {
        return { pass: false, actual: String(received), expected: 'MCP error', message: () => 'Expected an MCP response object' }
      }
      const obj = received as Record<string, unknown>
      let errorObj: { code: number; message: string } | null = null
      if ('error' in obj && obj.error && typeof obj.error === 'object') {
        errorObj = obj.error as { code: number; message: string }
      } else if ('code' in obj && 'message' in obj) {
        errorObj = { code: obj.code as number, message: obj.message as string }
      }
      if (!errorObj) {
        return { pass: false, actual: 'no error', expected: 'error response', message: () => 'Expected an error response' }
      }
      if (expectedCode !== undefined && errorObj.code !== expectedCode) {
        return { pass: false, actual: errorObj.code, expected: expectedCode, message: () => `Expected error code ${expectedCode}, got ${errorObj.code}` }
      }
      return { pass: true, actual: errorObj, expected: expectedCode ?? 'any', message: () => 'Expected not to be MCP error' }
    },

    toBeValidJsonRpcRequest(this: AnyMatcherState, received: unknown, ..._args: unknown[]) {
      if (!received || typeof received !== 'object') {
        return { pass: false, actual: String(received), expected: 'valid JSON-RPC request', message: () => 'Expected a JSON-RPC request object' }
      }
      const obj = received as Record<string, unknown>
      const pass = 'method' in obj && typeof obj.method === 'string'
      return {
        pass,
        actual: JSON.stringify(received),
        expected: 'valid JSON-RPC request',
        message: () => pass ? 'Expected not to be valid JSON-RPC request' : 'Expected method property',
      }
    },

    toHaveContent(this: AnyMatcherState, received: unknown, options?: { contentType?: string }) {
      const content = getContent(received, options?.contentType)
      if (!content || content.length === 0) {
        const typeHint = options?.contentType ? ` (type: ${options.contentType})` : ''
        return { pass: false, actual: '(no content)', expected: 'content array with entries', message: () => `Expected response to have content${typeHint}` }
      }
      return { pass: true, actual: content, expected: 'content array', message: () => 'Expected response not to have content' }
    },

    toHaveText(this: AnyMatcherState, received: unknown, expected: string, options?: { ignoreCase?: boolean }) {
      const ignoreCase = options?.ignoreCase ?? false
      let text = getTextContent(received, false)
      if (ignoreCase) text = text.toLowerCase()
      const expectedCompare = ignoreCase ? expected.toLowerCase() : expected
      const pass = text.includes(expectedCompare)
      return {
        pass,
        actual: text || '(no text)',
        expected,
        message: () => pass ? `Expected text not to include "${expected}"` : `Expected text to include "${expected}", but got "${text}"`,
      }
    },

    toHaveContentType(this: AnyMatcherState, received: unknown, expected: 'text' | 'image' | 'resource') {
      const actualType = getFirstContentType(received)
      const pass = actualType !== undefined && actualType === expected
      return {
        pass,
        actual: actualType ?? '(no content)',
        expected,
        message: () => pass ? `Expected content-type not to be "${expected}"` : `Expected content-type to be "${expected}", but got "${actualType}"`,
      }
    },

    toBeErrorResponse(this: AnyMatcherState, received: unknown, ..._args: unknown[]) {
      if (!received || typeof received !== 'object') {
        return { pass: false, actual: String(received), expected: 'error response', message: () => 'Expected an error response' }
      }
      const obj = received as Record<string, unknown>
      const hasError = 'error' in obj && typeof obj.error === 'object'
      return {
        pass: hasError,
        actual: hasError ? 'error response' : 'not an error response',
        expected: 'error response',
        message: () => {
          if (!hasError) {
            return 'result' in obj ? 'Expected error response, got success response' : 'Expected error response, got malformed response'
          }
          return 'Expected not to be an error response'
        },
      }
    },

    toMatchMcpError(this: AnyMatcherState, received: unknown, expected: { code?: number; message?: string | RegExp }) {
      const mcpError = getMcpError(received)
      if (!mcpError) {
        return { pass: false, actual: 'not an MCP error', expected: JSON.stringify(expected), message: () => 'Expected an MCP error response' }
      }
      let pass = true
      const errors: string[] = []
      if (expected.code !== undefined && mcpError.code !== expected.code) {
        pass = false
        errors.push(`code: expected ${expected.code}, got ${mcpError.code}`)
      }
      if (expected.message !== undefined) {
        if (typeof expected.message === 'string') {
          if (!mcpError.message.includes(expected.message)) {
            pass = false
            errors.push(`message: expected to include "${expected.message}", got "${mcpError.message}"`)
          }
        } else if (expected.message instanceof RegExp) {
          if (!expected.message.test(mcpError.message)) {
            pass = false
            errors.push(`message: expected to match ${expected.message}, got "${mcpError.message}"`)
          }
        }
      }
      return {
        pass,
        actual: mcpError,
        expected,
        message: () => pass ? `Expected MCP error not to match ${JSON.stringify(expected)}` : `Expected MCP error to match ${JSON.stringify(expected)}, but got: ${errors.join('; ')}`,
      }
    },

    toBeTransportError(this: AnyMatcherState, received: unknown, expectedMessage?: string) {
      const pass = isTransportError(received, expectedMessage)
      return {
        pass,
        actual: received,
        expected: expectedMessage ? `"${expectedMessage}"` : '(any transport error)',
        message: () => pass ? `Expected not to be a transport error with message "${expectedMessage}"` : `Expected a transport error with message "${expectedMessage}"`,
      }
    },

    toBeTimeoutError(this: AnyMatcherState, received: unknown, expectedMethod?: string) {
      const pass = isTimeoutError(received, expectedMethod)
      return {
        pass,
        actual: received,
        expected: expectedMethod ?? '(any method)',
        message: () => pass ? `Expected not to be a timeout error${expectedMethod ? ` for method "${expectedMethod}"` : ''}` : `Expected a timeout error${expectedMethod ? ` for method "${expectedMethod}"` : ''}`,
      }
    },

    toBeFromTool(this: AnyMatcherState, received: unknown, expectedToolName: string, expectedArgs?: Record<string, unknown>) {
      // Success response with content array is considered a tool result
      const content = getContent(received)
      if (content && content.length > 0) {
        return {
          pass: true,
          actual: received,
          expected: expectedToolName,
          message: () => `Expected tool result not to be from tool "${expectedToolName}"`,
        }
      }
      // For error responses, check data.tool field
      const pass = isFromToolError(received, expectedToolName, expectedArgs)
      return {
        pass,
        actual: received,
        expected: expectedToolName,
        message: () => pass ? `Expected error NOT to be from tool "${expectedToolName}"` : `Expected error to be from tool "${expectedToolName}"${expectedArgs ? ` with args ${JSON.stringify(expectedArgs)}` : ''}`,
      }
    },

    async toHaveCapability(this: AnyMatcherState, received: unknown, expected: string) {
      const server = received as { getCapabilities(): Promise<unknown> }
      const response = await server.getCapabilities() as Record<string, unknown>
      const result = response.result as Record<string, unknown> | undefined
      const capabilities = result?.capabilities as Record<string, unknown> | undefined
      const hasCapability = !!capabilities?.[expected]
      if (!hasCapability) {
        return { pass: false, actual: Object.keys(capabilities ?? {}), expected, message: () => `Expected server to have capability "${expected}"` }
      }
      return { pass: true }
    },

    async toHaveTool(this: AnyMatcherState, received: unknown, expectedToolName: string) {
      const server = received as { listTools(): Promise<unknown> }
      const response = await server.listTools() as Record<string, unknown>
      const result = response.result as Record<string, unknown> | undefined
      const tools = result?.tools as Array<{ name: string }> | undefined
      const hasTool = tools?.some(t => t.name === expectedToolName) ?? false
      const toolNames = tools?.map(t => t.name) ?? []
      if (!hasTool) {
        return { pass: false, actual: toolNames, expected: expectedToolName, message: () => `Expected server to have tool "${expectedToolName}"${toolNames.length > 0 ? `, got [${toolNames.map(n => `"${n}"`).join(', ')}]` : ''}` }
      }
      return { pass: true }
    },

    async toHaveResource(this: AnyMatcherState, received: unknown, expectedUri: string) {
      const server = received as { listResources(): Promise<unknown> }
      const response = await server.listResources() as Record<string, unknown>
      const result = response.result as Record<string, unknown> | undefined
      const resources = result?.resources as Array<{ uri: string }> | undefined
      const hasResource = resources?.some(r => r.uri === expectedUri) ?? false
      const uris = resources?.map(r => r.uri) ?? []
      if (!hasResource) {
        return { pass: false, actual: uris, expected: expectedUri, message: () => `Expected server to have resource "${expectedUri}", got [${uris.map(u => `"${u}"`).join(', ')}]` }
      }
      return { pass: true }
    },

    toMatchToolSchema(this: AnyMatcherState, received: unknown, schema: Record<string, unknown>) {
      const tool = received as { inputSchema?: Record<string, unknown> } | Record<string, unknown>
      const inputSchema = tool.inputSchema ?? tool
      const schemaObj = inputSchema as Record<string, unknown>
      const schemaProps = schemaObj.properties as Record<string, { type?: string; description?: string }> | undefined
      const schemaRequired = schemaObj.required as string[] | undefined
      const targetProps = schema.properties as Record<string, { type?: string }> | undefined
      const targetRequired = schema.required as string[] | undefined
      const targetAdditionalProperties = schema.additionalProperties
      const errors: string[] = []

      if (targetProps) {
        if (!schemaProps) {
          errors.push('inputSchema is missing properties field')
        } else {
          for (const [key, targetProp] of Object.entries(targetProps)) {
            const schemaProp = schemaProps[key]
            if (!schemaProp) {
              errors.push(`property "${key}" not found in inputSchema`)
            } else if (targetProp.type && schemaProp.type !== targetProp.type) {
              errors.push(`property "${key}": expected type "${targetProp.type}", got "${schemaProp.type}"`)
            }
          }
        }
      }

      if (targetRequired && schemaRequired) {
        for (const req of targetRequired) {
          if (!schemaRequired.includes(req)) {
            errors.push(`required property "${req}" is missing`)
          }
        }
      }

      // Validate additionalProperties constraint
      if (targetAdditionalProperties === false && schemaProps) {
        const schemaExtraKeys = Object.keys(schemaProps).filter((k) => !(targetProps && k in targetProps))
        if (schemaExtraKeys.length > 0) {
          errors.push(`additionalProperties=false violated: unexpected properties [${schemaExtraKeys.map((k) => `"${k}"`).join(', ')}]`)
        }
      }

      const pass = errors.length === 0
      return {
        pass,
        actual: inputSchema,
        expected: schema,
        message: () => pass
          ? 'Expected tool not to match schema'
          : `Expected tool to match schema, but: ${errors.join('; ')}`,
      }
    },
  })
}