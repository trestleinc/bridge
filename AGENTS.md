# AGENTS.md - Development Guide

## Commands
- **Build:** `bun run build` (uses Rslib, outputs to `dist/`)
- **Test:** `bun test` (Vitest). Run single: `bun test src/path/to/test.ts`
- **Lint & Format:** `bun run check:fix` (Biome) - **ALWAYS RUN BEFORE COMMITTING**
- **Type Check:** Build includes type checking via Rslib

## Code Style & Conventions
- **Formatting:** 2 spaces, single quotes, semicolons (enforced by Biome).
- **Imports:** Use `import type` for types. Use `node:` protocol for Node built-ins.
- **Logging:** Use `LogTape`. Avoid `console.*` (warns in Biome, allowed in tests).
- **Structure:** Single package. `src/client` (browser), `src/server` (Convex), `src/component`.
- **Documentation:** ALWAYS use `Context7` tool for library docs (Convex, Effect).
- **Scoping:** All data is scoped by `organizationId`.

## Public API

### Server (`@trestleinc/bridge/server`)
```typescript
bridge()              // Factory to create BridgeClient
BridgeClient          // Client with hooks support
BridgeHooks           // Authorization and side effect hooks
```

### Client (`@trestleinc/bridge/client`)
```typescript
NetworkError, AuthorizationError, NotFoundError, ValidationError, NonRetriableError
getLogger()           // LogTape logger
```

### Component API (via `client.api`)
```typescript
card.get, card.find, card.list, card.create
procedure.get, procedure.list, procedure.create, procedure.update, procedure.remove
deliverable.get, deliverable.list, deliverable.create, deliverable.update, deliverable.evaluate
evaluation.get, evaluation.list, evaluation.start, evaluation.cancel, evaluation.complete
```

## Critical Rules (from CLAUDE.md)
- NEVER use WebSearch for library documentation; use Context7.
- Use `bun` for all commands.
- Namespaced API pattern: `card.get`, `procedure.list`, etc.
