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

export interface MockMcpServerOptions {
  /** Responses to return (consumed in order). */
  responses: MockResponse[]
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
    const NL = '\n';
    return '\
const responses = ' + JSON.stringify(this.options.responses) + ';' + NL + '\
let responseIndex = 0;' + NL + '\
const delayMs = ' + (this.options.delayMs ?? 0) + ';' + NL + '\
const jsonrpcVersion = ' + JSON.stringify(jsonrpcVersion) + ';' + NL + NL + '\
process.stdin.on("data", async (chunk) => {' + NL + '\
  const lines = chunk.toString().split("\\n").filter(l => l.trim());' + NL + '\
  for (const line of lines) {' + NL + '\
    try {' + NL + '\
      const req = JSON.parse(line);' + NL + '\
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));' + NL + '\
      const response = { ...responses[responseIndex % responses.length] };' + NL + '\
      response.jsonrpc = jsonrpcVersion;' + NL + '\
      response.id = req.id ?? response.id;' + NL + '\
      responseIndex++;' + NL + '\
      process.stdout.write(JSON.stringify(response) + "\\n");' + NL + '\
    } catch (e) {' + NL + '\
      // ignore' + NL + '\
    }' + NL + '\
  }' + NL + '\
});' + NL;
  }
}
