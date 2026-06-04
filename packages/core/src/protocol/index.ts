/**
 * Protocol versioning constants and helpers.
 */

export {
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  JSONRPC_VERSION,
  DEFAULT_CLIENT_NAME,
  DEFAULT_CLIENT_VERSION,
} from './constants.js'

export type { McpProtocolOptions } from './options.js'

export {
  createRequest,
  createNotification,
  unwrapResponse,
} from './protocol.js'