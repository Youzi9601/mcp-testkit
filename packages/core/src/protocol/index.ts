/**
 * Protocol versioning constants and helpers.
 */

export {
  MCP_ERA,
  type McpEra,
  LATEST_PROTOCOL_VERSION,
  MODERN_PROTOCOL_VERSION,
  DEFAULT_LEGACY_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  LEGACY_PROTOCOL_VERSIONS,
  MODERN_PROTOCOL_VERSIONS,
  JSONRPC_VERSION,
  DEFAULT_CLIENT_NAME,
  DEFAULT_CLIENT_VERSION,
} from './constants.js';

export type { McpProtocolOptions } from './options.js';

export {
  createRequest,
  createNotification,
  unwrapResponse,
} from './protocol.js';

export {
  negotiateEra,
  isModernVersion,
  EraNegotiationFailedError,
} from './era.js';

export type {
  ProtocolEra,
  EraNegotiationMode,
  EraNegotiationOptions,
  EraNegotiationResult,
} from './era.js';
