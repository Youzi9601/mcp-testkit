/**
 * MockMcpServer — self-contained test MCP server.
 * Does not depend on @modelcontextprotocol/sdk; implements MCP protocol from scratch.
 *
 * Used for framework's own unit tests (assertions, transport, error handling).
 */

export interface MockResponse {
  jsonrpc: string
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string }
}

/**
 * A scripted response rule keyed on an incoming request method.
 * Lets the mock behave differently per method (e.g. answer `server/discover`).
 */
export interface MockMethodRule {
  /** JSON-RPC method the rule matches (e.g. `'server/discover'`, `'tools/list'`). */
  method: string
  /** Response result. */
  result?: unknown
  /** Response error. */
  error?: { code: number; message: string }
  /**
   * Modern-era `resultType` discriminator to stamp on the result.
   * When `'input_required'`, the script only returns it on the first matching call;
   * subsequent calls for the same method return the `completeResult` (if provided),
   * modelling an MRTR round-trip.
   */
  resultType?: 'complete' | 'input_required'
  /**
   * Result to return after an `input_required` exchange completes (MRTR retry).
   */
  completeResult?: unknown
}

export interface MockMcpServerOptions {
  /** Responses to return (consumed in order). */
  responses: MockResponse[]
  /**
   * Optional per-method rules, evaluated when a request's method matches.
   * When present for a method, it takes precedence over `responses` for that method.
   */
  methodRules?: MockMethodRule[]
  /** Response delay in ms. */
  delayMs?: number
  /**
   * JSON-RPC version injected into generated response JSON.
   * Defaults to '2.0'.
   */
  jsonrpcVersion?: string
}

/**
 * MockMcpServer factory.
 * Generates a controllable-response MCP server script and spawn command.
 *
 * Uses `node -e "<inline-script>"` to avoid filesystem I/O in tests.
 */
export class MockMcpServer {
  private responseIndex = 0;

  constructor(private options: MockMcpServerOptions) {}

  /**
   * Gets the spawn command for this mock server.
   * Uses `node -e` to inline the script — no filesystem writes required.
   */
  getSpawnCommand(): { command: string; args: string[] } {
    const script = this.getServerScript();
    // Escape double quotes and backslashes for shell embedding
    const escaped = script.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return { command: 'node', args: ['-e', escaped] };
  }

  /**
   * Returns the server script path.
   * @deprecated Use getSpawnCommand() instead. This method still writes to fs.
   */
  getServerScriptPath(): string {
    // Lazy import to avoid side-effects in pure unit tests
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const os = require('node:os') as typeof import('node:os');
    const tmp = os.tmpdir();
    const scriptPath = path.join(tmp, `mock-mcp-${Date.now()}.js`);
    fs.writeFileSync(scriptPath, this.getServerScript());
    return scriptPath;
  }

  /**
   * Gets the server script content.
   */
  getServerScript(): string {
    const jsonrpcVersion = this.options.jsonrpcVersion ?? '2.0';
    const methodRules = this.options.methodRules ?? [];
    const NL = '\n';
    return '\
const responses = ' + JSON.stringify(this.options.responses) + ';' + NL + '\
const methodRules = ' + JSON.stringify(methodRules) + ';' + NL + '\
let responseIndex = 0;' + NL + '\
const delayMs = ' + (this.options.delayMs ?? 0) + ';' + NL + '\
const jsonrpcVersion = ' + JSON.stringify(jsonrpcVersion) + ';' + NL + '\
const mrtrState = {};' + NL + NL + '\
function respondTo(req) {' + NL + '\
  const rule = methodRules.find(r => r.method === req.method);' + NL + '\
  if (rule) {' + NL + '\
    if (rule.resultType === "input_required") {' + NL + '\
      const key = req.method + ":" + JSON.stringify(req.params && req.params.arguments || {});' + NL + '\
      const seen = mrtrState[key] || 0;' + NL + '\
      mrtrState[key] = seen + 1;' + NL + '\
      if (seen === 0) {' + NL + '\
        return { jsonrpc: jsonrpcVersion, id: req.id, result: Object.assign({}, rule.result, { resultType: "input_required", inputRequests: rule.result && rule.result.inputRequests || {} }) };' + NL + '\
      }' + NL + '\
      return { jsonrpc: jsonrpcVersion, id: req.id, result: Object.assign({}, rule.completeResult || rule.result) };' + NL + '\
    }' + NL + '\
    return { jsonrpc: jsonrpcVersion, id: req.id, result: Object.assign({}, rule.result) };' + NL + '\
  }' + NL + '\
  const response = { ...responses[responseIndex % responses.length] };' + NL + '\
  response.jsonrpc = jsonrpcVersion;' + NL + '\
  response.id = req.id ?? response.id;' + NL + '\
  responseIndex++;' + NL + '\
  return response;' + NL + '\
}' + NL + NL + '\
process.stdin.on("data", async (chunk) => {' + NL + '\
  const lines = chunk.toString().split("\\n").filter(l => l.trim());' + NL + '\
  for (const line of lines) {' + NL + '\
    try {' + NL + '\
      const req = JSON.parse(line);' + NL + '\
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));' + NL + '\
      const response = respondTo(req);' + NL + '\
      process.stdout.write(JSON.stringify(response) + "\\n");' + NL + '\
    } catch (e) {' + NL + '\
      // ignore' + NL + '\
    }' + NL + '\
  }' + NL + '\
});' + NL;
  }
}
