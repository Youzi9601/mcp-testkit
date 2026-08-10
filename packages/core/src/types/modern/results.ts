/**
 * Modern-era (2026-07-28) cacheable list result shapes.
 */

import type { McpTool, McpResource, McpPrompt } from '../mcp.js';
import type { CacheableResult } from './mrtr.js';

/**
 * Modern-era response wrapper shared by list/read methods.
 * Carries cache hints and the result type discriminator.
 */
export type ModernListResult<T> = T & CacheableResult;

/** Modern-era `tools/list` result. */
export interface ListToolsResult {
  tools: McpTool[]
  nextCursor?: string
}

/** Modern-era `resources/list` result. */
export interface ListResourcesResult {
  resources: McpResource[]
  nextCursor?: string
}

/** Modern-era `prompts/list` result. */
export interface ListPromptsResult {
  prompts: McpPrompt[]
  nextCursor?: string
}
