# AGENTS.md — @youzi9601/mcp-testkit

> This file defines project-specific behavior for AI agents working on this codebase.

---

## Important Notes for Agents

1. **Do not create large files.** If a file exceeds 300 lines, split it.
2. **Do not skip JSDoc.** Every export needs it.
3. **Do not add production dependencies** to core.
4. **Always run coverage** before claiming a task is complete.
5. **Use subagent-driven-development** for multi-step implementations.
6. **Verify before reporting.** Run tests, not just `ls`.

---

## Operational Integrity

### Ground truth

Tool output is authoritative only when it is directly and reliably observable.

Never invent, reconstruct, or guess:
- file paths
- branch names
- commit hashes
- command output
- IDs
- URLs
- error messages
- configuration values

If an observation is unclear, corrupted, truncated, or ambiguous:

1. Do not guess.
2. Do not repeatedly describe the uncertainty.
3. Re-run a deterministic command that retrieves the required value.
4. Continue only after obtaining a reliable observation.

### Failure handling

When an operation fails:

- Prefer a concrete recovery action over narration.
- Do not repeatedly apologize.
- Do not narrate internal confusion.
- Do not speculate about tool or model failures.
- Do not ask the user to reproduce information that can be retrieved from the environment.
- If recovery is impossible, report the specific blocker once and stop.

### Generation stability

If you notice that your output is becoming repetitive, incoherent,
or detached from the current task:

- stop generating explanatory prose;
- re-establish the current task state;
- obtain ground truth from tools;
- continue from the verified state.

Never attempt to repair a corrupted generation by producing more
self-referential explanation.

---

## Project Overview

`@youzi9601/mcp-testkit` is a TypeScript monorepo (pnpm workspaces) that provides a testing framework for MCP (Model Context Protocol) servers.

**Repository:** `https://github.com/youzi9601/mcp-testkit`
**Package scope:** `@youzi9601`
**Node:** >= 18

---

## Design Documents & Plans

All design documents live in `docs/plans/`. The master specification is:

```
docs/plans/SPEC.md          # Full project specification (read this first)
docs/plans/01-overview.md
docs/plans/05-assertions.md  # Matchers, validators, expectations
...                         # Other phase/feature plans
```

**Agents must read `docs/plans/SPEC.md` before implementing any feature.** Implementation must match the SPEC; if the SPEC is outdated or wrong, surface the discrepancy to the user before proceeding.

---

## Architecture

```
mcp-testkit/
├── packages/
│   ├── core/                        # @youzi9601/mcp-testkit
│   │   └── src/
│   │       ├── assertions/          # Matchers, validator, matcher utilities
│   │       ├── errors/              # Error classes (1 class per file)
│   │       ├── fixtures/            # Fixture system
│   │       ├── plugin/              # Plugin interfaces + registry
│   │       ├── protocol/            # JSON-RPC helpers (createRequest, createNotification)
│   │       ├── test-utils/          # MockMcpServer (self-testing only)
│   │       ├── transport/           # StdioTransport + types
│   │       ├── types/               # MCP protocol types
│   │       ├── server.ts            # createMcpServer factory
│   │       └── index.ts            # Public API barrel export
│   │
│   ├── vitest-plugin/              # @youzi9601/mcp-testkit-vitest
│   │   └── src/
│   │       ├── vitest-plugin.ts
│   │       └── index.ts
│   │
│   ├── http-transport/             # @youzi9601/mcp-testkit-http
│   │   └── src/
│   │       ├── http-transport.ts
│   │       ├── http-plugin.ts
│   │       ├── mock-http-server.ts
│   │       └── index.ts
│   │
│   ├── snapshot/                   # @youzi9601/mcp-testkit-snapshot
│   │   └── src/
│   │       ├── snapshot-manager.ts
│   │       ├── snapshot-plugin.ts
│   │       └── index.ts
│   │
│   └── reporter-junit/             # @youzi9601/mcp-testkit-reporter-junit
│       └── src/
│           ├── junit-reporter.ts
│           ├── xml-formatter.ts
│           └── index.ts
│
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
│
├── tsconfig.base.json
└── pnpm-workspace.yaml
```

---

## Modularity Requirements

The codebase must remain modular. These are **architectural rules**, not suggestions.

### File Size Limits

| Metric | Soft Limit | Hard Limit |
|--------|-----------|------------|
| File total lines | 300 | 500 |
| Function | 50 | — |
| Class | 200 | — |

**Hard limit (500 lines) will never be exceeded.**
**Soft limit (300 lines) triggers refactoring review.**

### Module Boundaries

| Concern | Location | Rule |
|---------|----------|------|
| Type definitions | `types/` | 1 type/interface per file |
| Error classes | `errors/` | 1 class per file |
| Transport implementations | `transport/` | 1 class per file |
| Assertions/matchers | `assertions/` | 1 matcher set per file |
| Plugin interfaces | `plugin/` | interface + implementation separate |
| Fixtures | `fixtures/` | 1 fixture type per file |

### Immediate Extraction Rules

- If a function is used in 2+ places → extract immediately
- If a type is referenced in 2+ files → move to shared location
- If logic could be tested independently → extract to its own file
- **Never copy-paste logic** — extract shared code first

### Enforcement

Before implementing any feature:

1. Inspect current file structure under `packages/*/src/`
2. Determine appropriate module boundaries
3. Propose new file organization
4. Implement using multiple focused files

**Creating additional files is always preferred over creating large files.**

---

## TypeScript Standards

### JSDoc Requirements

Every exported type, function, class, and interface **must** have JSDoc:

```ts
/**
 * [One sentence description of what this does.]
 *
 * @param name - [Description of parameter]
 * @returns [Description of return value]
 * @throws {ErrorType} [When this error is thrown]
 *
 * @example
 * ```ts
 * // minimal usage example
 * ```
 */
export function example(name: string): Promise<Result> { ... }
```

### JSDoc & Documentation Language

**All JSDoc comments and documentation must be written in English.**

Rationale: packages are published internationally; English is the industry standard for npm ecosystem documentation. Chinese comments in source code create barriers for contributors and AI tooling outside Chinese-speaking contexts.

```ts
// ✅ Correct
/**
 * Sends a JSON-RPC request and waits for a response.
 * @param request - The JSON-RPC request object
 * @returns The parsed JSON-RPC response
 * @throws {TransportError} if the transport is not started
 */

// ❌ Incorrect (do not use Chinese in JSDoc)
// /**
//  * 傳送 JSON-RPC 請求並等待回應
//  * @param request - JSON-RPC 請求物件
//  */
```

### Naming Conventions

| Construct | Convention | Example |
|-----------|------------|---------|
| Classes | PascalCase | `StdioTransport` |
| Functions | camelCase | `createMcpServer` |
| Interfaces | PascalCase | `ServerOptions` |
| Types | PascalCase | `McpResponse` |
| Enums | PascalCase | `McpErrorCode` |
| Files | kebab-case | `mcp-error.ts` |
| Test files | `*.test.ts` | `stdio-transport.test.ts` |

---

## Dependency Rules

### Core Package

- `dependencies: {}` — **empty**, no production dependencies
- All implementation is self-contained within the monorepo
- MockMcpServer for self-testing (no `@modelcontextprotocol/sdk` dependency)

### Version Pinning

| Dependency type | Strategy |
|----------------|----------|
| `devDependencies` | Exact version (`vitest@4.1.8`) |
| `peerDependencies` | Major-bounded range (`>=2.0.0 <5.0.0`) |
| `dependencies` | Workspace reference (`workspace:*`) |

### Lockfile

- CI uses `--frozen-lockfile` — no automatic updates
- Manual `pnpm update` to refresh dependencies locally
- Commit lockfile changes explicitly

---

## Testing Strategy

### Coverage Gates

Each package defines its own thresholds in `vitest.config.ts`. These are enforced by `vitest --coverage` on CI.

| Package | Lines | Functions | Branches | Note |
|---------|-------|-----------|----------|------|
| `core` | >= 80% | >= 90% | >= 70% | Aspirational; currently ~93% |
| `http-transport` | >= 75% | >= 80% | >= 70% | Structural unreachable code (ignored lines 89, 193-195) |
| `reporter-junit` | >= 80% | >= 85% | >= 70% | Branch 73.46% due to XML edge cases |
| `vitest-plugin` | — | — | — | No coverage threshold (thin wrapper) |
| `snapshot` | — | — | — | No coverage threshold (thin wrapper) |

### Test File Organization

- `*.test.ts` co-located with source: `server.test.ts` next to `server.ts`
- `test-utils/` directory for shared testing utilities
- **MockMcpServer** for all unit/integration tests — no real MCP server dependency

### Test Isolation

- `core` tests: Each test spawns its own subprocess; no filesystem/network dependencies.
- `http-transport` tests: Use `startMockHttpServer` for in-process HTTP mock — no external network required.
- `beforeEach` resets mock state per test.
- No shared mutable state between tests.

---

## Git Workflow

### Commit Message Format

```
type(scope): description

types: feat | fix | docs | test | chore | refactor | perf
```

Example:
```
feat(core): add StdioTransport class
docs(core): add JSDoc to server.ts
test(core): add coverage for toBeMcpSuccess matcher
```

### Branch Naming

```
{type}/{short-description}
feat/plugin-system
fix/timeout-error
docs/readme
```

---

## npm Publishing

- All packages use `@youzi9601` scope
- Unified versioning: all packages share the same version
- `workspace:*` references resolve to actual versions at publish time

---

## CI/CD

- **CI:** On every PR/push to main — lint, typecheck, coverage
- **Release:** On git tag `v*` — build, test, publish all packages
- Coverage reports uploaded as artifacts

