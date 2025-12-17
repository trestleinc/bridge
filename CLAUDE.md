# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Always Use Context7 for Library Documentation

**CRITICAL**: When looking up documentation for any library (Convex, Effect, etc.), ALWAYS use the Context7 MCP tool. NEVER use WebSearch for library documentation.

**Usage pattern:**
1. First resolve the library ID: `mcp__context7__resolve-library-id` with library name
2. Then fetch docs: `mcp__context7__get-library-docs` with the resolved ID and topic

## Project Overview

**Bridge** (`@trestleinc/bridge`) - Reactive data layer for schema-driven Cards, Procedures, and Deliverables.

Single package with exports:
- `@trestleinc/bridge` - Shared types and validators
- `@trestleinc/bridge/client` - Client utilities (errors, logger)
- `@trestleinc/bridge/server` - Server helpers (bridge factory, BridgeClient)
- `@trestleinc/bridge/convex.config` - Component configuration

## Development Commands

```bash
# Build
bun run build        # Build with Rslib (outputs to dist/)
bun run clean        # Remove dist/

# Code Quality (Biome v2)
bun run check        # Lint + format check (dry run)
bun run check:fix    # Auto-fix all issues (ALWAYS run before committing)

# Testing
bun test             # Run all tests with Vitest
bun test <path>      # Run specific test file

# Publishing
bun run prepublish   # Build + check:fix (runs before npm publish)
```

## Architecture

### Package Structure
```
src/
├── client/                  # Client-side utilities
│   ├── index.ts             # Public exports
│   ├── errors.ts            # Error classes
│   └── logger.ts            # LogTape logger
├── server/                  # Server-side (Convex functions)
│   ├── index.ts             # Public exports
│   └── builder.ts           # bridge() factory, BridgeClient
├── component/               # Internal Convex component
│   ├── convex.config.ts     # Component config
│   ├── schema.ts            # Database schema (cards, procedures, deliverables, evaluations)
│   ├── public.ts            # Component API (card.*, procedure.*, deliverable.*, evaluation.*)
│   └── logger.ts            # Component logging
├── shared/                  # Shared types (all environments)
│   ├── index.ts             # Re-exports
│   ├── types.ts             # Card, Procedure, Deliverable, Evaluation interfaces
│   └── validators.ts        # Convex validators for all types
└── env.d.ts                 # Environment type declarations
```

### Core Concepts

**Data Model:**
- **Cards** - Field definitions with types, security levels, and subject associations
- **Procedures** - Data collection definitions (forms, imports, APIs)
- **Deliverables** - Reactive triggers with prerequisites and conditions
- **Evaluations** - Execution records for triggered deliverables

**Data Flow:**
```
Card definitions -> Procedures collect data -> Deliverables trigger -> Evaluations track execution
```

## Public API Surface

### Client (`@trestleinc/bridge/client`)
```typescript
// Error types
NetworkError
AuthorizationError
NotFoundError
ValidationError
NonRetriableError

// Logger
getLogger()
```

### Server (`@trestleinc/bridge/server`)
```typescript
bridge()              // Factory to create BridgeClient bound to component
BridgeClient          // Client class with hooks support
BridgeHooks           // Hook interface for authorization and side effects
BridgeConfig          // Configuration type
```

### Shared (`@trestleinc/bridge`)
```typescript
// Types
Card, CardInput
Procedure, ProcedureInput, ProcedureUpdate
Deliverable, DeliverableInput, DeliverableUpdate
Evaluation, EvaluationContext, EvaluationResult

// Validators
cardTypeValidator, securityLevelValidator, subjectTypeValidator
procedureTypeValidator, operationValidator
evaluationStatusValidator, deliverableStatusValidator
```

### Component API (via `client.api`)
```typescript
card.get, card.find, card.list, card.create
procedure.get, procedure.list, procedure.create, procedure.update, procedure.remove, procedure.submit
deliverable.get, deliverable.list, deliverable.create, deliverable.update, deliverable.evaluate
evaluation.get, evaluation.list, evaluation.start, evaluation.cancel, evaluation.complete
```

### BridgeClient Methods
```typescript
client.submit(ctx, submission)     // Validate card values through procedure
client.evaluate(ctx, trigger)      // Check and trigger deliverables
client.execute(deliverable, ctx)   // Run registered callback handler
client.register(type, handler)     // Register callback handler
client.handler(type)               // Get registered handler
```

## Key Patterns

### Server: bridge Factory
```typescript
// convex/bridge.ts (create once)
import { bridge } from '@trestleinc/bridge/server';
import { components } from './_generated/api';

export const client = bridge(components.bridge)({
  hooks: {
    evalRead: async (ctx, organizationId) => { /* auth check */ },
    evalWrite: async (ctx, organizationId) => { /* auth check */ },
    onCardCreated: async (ctx, card) => { /* side effect */ },
  }
});
```

### Using the Client API
```typescript
// convex/cards.ts
import { query, mutation } from './_generated/server';
import { client } from './bridge';

export const list = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    return ctx.runQuery(client.api.card.list, { organizationId });
  },
});
```

## Technology Stack

- **TypeScript** (strict mode)
- **Effect** for dependency injection (in dependencies)
- **Convex** for backend (cloud database + functions)
- **Rslib** for building
- **Biome** for linting/formatting
- **LogTape** for logging (avoid console.*)

## Naming Conventions

- **Public API**: Single-word function names (`bridge()`, `get`, `list`, `create`)
- **Namespaced exports**: `card.get`, `procedure.list`, `deliverable.evaluate`
- **Error classes**: Short names with "Error" suffix (`NetworkError`, `ValidationError`)

## Important Notes

- **Biome config** - `noExplicitAny` OFF, `noConsole` warns (except in test files and component logger)
- **LogTape logging** - Use LogTape, not console.* (Biome warns on console)
- **Import types** - Use `import type` for type-only imports (Biome enforces this)
- **bun for commands** - Use `bun run` not `pnpm run` for all commands
- **Organization-scoped** - All data is scoped by `organizationId`
