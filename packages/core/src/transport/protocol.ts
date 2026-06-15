/**
 * MCP JSON-RPC Protocol helpers.
 *
 * @deprecated Import from `../protocol/protocol.js` instead.
 * This module re-exports from protocol/ for backward compatibility.
 */

export {
  createRequest,
  createNotification,
  unwrapResponse,
} from '../protocol/protocol.js';

export type { McpProtocolOptions } from '../protocol/options.js';
