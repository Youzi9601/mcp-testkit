export * from './types/mcp.js';
export * from './types/api.js';
export { createMcpServer } from './server.js';
export { StdioTransport } from './transport/index.js';
export type { Transport } from './transport/index.js';
export { registerMatchers } from './assertions/matchers.js';
export * from './errors/index.js';
export { ValidationLevel, validateJsonRpcRequest, validateJsonRpcResponse } from './assertions/schema-validator.js';
export { PluginRegistry } from './plugin/index.js';
export type { Plugin, PluginContext, PluginRegistryOptions } from './plugin/index.js';

// Protocol versioning constants — shared by transports and consumers.
export {
  MODERN_PROTOCOL_VERSION,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  MCP_ERA,
} from './protocol/constants.js';
export type { McpEra } from './protocol/constants.js';
