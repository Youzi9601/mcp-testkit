/**
 * Schema Validation — three-tier validation mode.
 * - none: no validation
 * - basic: check required fields
 * - full: complete JSON Schema validation (Phase 2+)
 */

/** Validation level. */
export enum ValidationLevel {
  /** No validation, pass through. */
  None = 'none',
  /** Basic validation: checks jsonrpc, id, method required fields. */
  Basic = 'basic',
  /** Full validation: complete JSON Schema validation. */
  Full = 'full',
}

/**
 * Validates a JSON-RPC request (basic level).
 * @param obj - Object to validate
 * @throws {Error} on validation failure
 */
export function validateJsonRpcRequest(obj: unknown): void {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('Request must be an object');
  }
  const req = obj as Record<string, unknown>;
  if (req.jsonrpc !== '2.0') {
    throw new Error('Missing or invalid jsonrpc field');
  }
  if (typeof req.method !== 'string') {
    throw new Error('Missing or invalid method field');
  }
}

/**
 * Validates a JSON-RPC response (basic level).
 * @param obj - Object to validate
 * @throws {Error} on validation failure
 */
export function validateJsonRpcResponse(obj: unknown): void {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('Response must be an object');
  }
  const res = obj as Record<string, unknown>;
  if (res.jsonrpc !== '2.0') {
    throw new Error('Missing or invalid jsonrpc field');
  }
  if (!('result' in res || 'error' in res)) {
    throw new Error('Response must have either result or error');
  }
}
