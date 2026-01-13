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
- `@trestleinc/bridge/server` - Server helpers (bridge factory)
- `@trestleinc/bridge/convex.config` - Component configuration

## Development Commands

```bash
# Build (includes ESLint + TypeScript checking via rslib plugins)
bun run build        # Build with Rslib (outputs to dist/)
bun run clean        # Remove dist/

# Publishing
bun run prepublish   # Runs build (which includes linting)
```

**Note:** Linting, formatting, and type checking run automatically during `bun run build` via rslib plugins:

- `pluginEslint` with `fix: true` - runs ESLint and auto-fixes issues
- `pluginTypeCheck` - runs TypeScript type checking
- `@stylistic/eslint-plugin` - handles code formatting (indentation, quotes, semicolons)

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
│   ├── bridge.ts            # bridge() factory
│   ├── resource.ts          # Resource builder with hooks
│   ├── errors.ts            # Server error classes
│   └── resources/           # Individual resource implementations
│       ├── card.ts
│       ├── procedure.ts
│       ├── deliverable.ts
│       └── evaluation.ts
├── component/               # Internal Convex component
│   ├── convex.config.ts     # Component config
│   ├── schema.ts            # Database schema
│   ├── public.ts            # Component API
│   └── logger.ts            # Component logging
├── shared/                  # Shared types (all environments)
│   ├── index.ts             # Re-exports
│   └── validators.ts        # Types and Convex validators (single source of truth)
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
NetworkError;
AuthorizationError;
NotFoundError;
ValidationError;
NonRetriableError;

// Logger
getLogger();
```

### Server (`@trestleinc/bridge/server`)

```typescript
bridge(); // Factory to create bridge instance bound to component
```

### Shared (`@trestleinc/bridge`)

```typescript
// Types
(Card, CardInput);
(Procedure, ProcedureInput, ProcedureUpdate);
(Deliverable, DeliverableInput, DeliverableUpdate);
(Evaluation, EvaluationContext, EvaluationResult);

// Validators
(cardTypeValidator, securityLevelValidator, subjectTypeValidator);
(procedureTypeValidator, operationValidator);
(evaluationStatusValidator, deliverableStatusValidator);
```

### Resource API (via bridge instance)

```typescript
(b.cards.get, b.cards.find, b.cards.list, b.cards.create);
(b.procedures.get,
	b.procedures.list,
	b.procedures.create,
	b.procedures.update,
	b.procedures.remove,
	b.procedures.submit);
(b.deliverables.get,
	b.deliverables.list,
	b.deliverables.create,
	b.deliverables.update,
	b.deliverables.evaluate);
(b.evaluations.get,
	b.evaluations.list,
	b.evaluations.start,
	b.evaluations.cancel,
	b.evaluations.complete);
```

### Bridge Methods

```typescript
b.submit(ctx, submission); // Validate card values through procedure
b.evaluate(ctx, trigger); // Check and trigger deliverables (auto-resolves if subjects bound)
b.resolve(ctx, type, id); // Resolve subject data from bound table
b.execute(deliverable, op, ctx); // Run registered callback handler
b.register(type, handler); // Register callback handler
b.aggregate(ctx, input); // Aggregate context from subject hierarchy
```

## Key Patterns

### Server: bridge Factory

```typescript
// convex/bridge.ts (create once)
import { bridge } from "@trestleinc/bridge/server";
import { components } from "./_generated/api";

export const b = bridge(components.bridge)({
	// Bind subject types to host tables for auto-resolution
	subjects: {
		beneficiary: "beneficiaries",
		event: "events",
		eventInstance: "eventInstances",
	},
	// Per-resource hooks
	cards: {
		hooks: {
			evalRead: async (ctx, organizationId) => {
				/* auth check */
			},
			evalWrite: async (ctx, doc) => {
				/* auth check */
			},
			onInsert: async (ctx, doc) => {
				/* side effect */
			},
		},
	},
	procedures: {
		hooks: {
			evalWrite: async (ctx, doc) => {
				/* auth check */
			},
		},
	},
	deliverables: {
		hooks: {
			evalRead: async (ctx, organizationId) => {
				/* auth check */
			},
		},
	},
	evaluations: {
		hooks: {
			onComplete: async (ctx, evaluation) => {
				/* react to completion */
			},
		},
	},
});
```

### Using the Bridge API

```typescript
// convex/cards.ts
import { b } from "./bridge";

// Export bridge resources directly as Convex functions
export const get = b.cards.get;
export const find = b.cards.find;
export const list = b.cards.list;
export const create = b.cards.create;
```

## Technology Stack

- **TypeScript** (strict mode)
- **Effect** for dependency injection (in dependencies)
- **Convex** for backend (cloud database + functions)
- **Rslib** for building (with ESLint + TypeScript plugins)
- **ESLint** for linting (runs during build via rslib plugin)
- **LogTape** for logging (avoid console.\*)

## Naming Conventions

- **Public API**: Single-word function names (`bridge()`, `get`, `list`, `create`)
- **Namespaced exports**: `card.get`, `procedure.list`, `deliverable.evaluate`
- **Error classes**: Short names with "Error" suffix (`NetworkError`, `ValidationError`)

## Important Notes

- **Linting runs during build** - ESLint runs via rslib's `pluginEslint` during `bun run build`
- **LogTape logging** - Use LogTape, not console.\*
- **Import types** - Use `import type` for type-only imports
- **bun for commands** - Use `bun run` not `pnpm run` for all commands
- **Organization-scoped** - All data is scoped by `organizationId`
