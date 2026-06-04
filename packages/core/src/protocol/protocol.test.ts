/**
 * Tests for protocol versioning support.
 */

import { describe, it, expect } from 'vitest'
import {
  createRequest,
  createNotification,
  JSONRPC_VERSION,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  DEFAULT_CLIENT_NAME,
  DEFAULT_CLIENT_VERSION,
} from './index.js'

describe('protocol constants', () => {
  it('exports LATEST_PROTOCOL_VERSION', () => {
    expect(LATEST_PROTOCOL_VERSION).toBe('2024-11-05')
  })

  it('exports SUPPORTED_PROTOCOL_VERSIONS', () => {
    expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(LATEST_PROTOCOL_VERSION)
  })

  it('exports JSONRPC_VERSION', () => {
    expect(JSONRPC_VERSION).toBe('2.0')
  })

  it('exports DEFAULT_CLIENT_NAME and DEFAULT_CLIENT_VERSION', () => {
    expect(DEFAULT_CLIENT_NAME).toBe('mcp-testkit')
    expect(DEFAULT_CLIENT_VERSION).toBe('0.1.0')
  })
})

describe('createRequest with options', () => {
  it('uses default JSONRPC_VERSION when no options provided', () => {
    const req = createRequest(1, 'tools/list')
    expect(req.jsonrpc).toBe(JSONRPC_VERSION)
  })

  it('uses custom jsonrpcVersion when provided', () => {
    const req = createRequest(1, 'tools/list', undefined, { jsonrpcVersion: '2.1' })
    expect(req.jsonrpc).toBe('2.1')
  })

  it('uses LATEST_PROTOCOL_VERSION as default protocolVersion in params', () => {
    const req = createRequest(
      1,
      'initialize',
      {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: DEFAULT_CLIENT_NAME, version: DEFAULT_CLIENT_VERSION },
      },
      {},
    )
    expect(req.params!.protocolVersion).toBe(LATEST_PROTOCOL_VERSION)
  })

  it('uses custom clientInfo when provided', () => {
    const req = createRequest(
      1,
      'initialize',
      {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'my-client', version: '1.0.0' },
      },
      { clientInfo: { name: 'my-client', version: '1.0.0' } },
    )
    expect((req.params! as { clientInfo: { name: string; version: string } }).clientInfo.name).toBe('my-client')
    expect((req.params! as { clientInfo: { name: string; version: string } }).clientInfo.version).toBe('1.0.0')
  })
})

describe('createNotification with options', () => {
  it('uses default JSONRPC_VERSION', () => {
    const req = createNotification('tools/list_changed')
    expect(req.jsonrpc).toBe(JSONRPC_VERSION)
  })

  it('uses custom jsonrpcVersion when provided', () => {
    const req = createNotification('tools/list_changed', undefined, { jsonrpcVersion: '2.1' })
    expect(req.jsonrpc).toBe('2.1')
  })

  it('includes params when provided', () => {
    const req = createNotification('notifications/initialized')
    expect(req.method).toBe('notifications/initialized')
  })

  it('omits params field when params is explicitly undefined', () => {
    const req = createNotification('notifications/initialized', undefined)
    expect(req).not.toHaveProperty('params')
  })
})