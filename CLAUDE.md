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

- `@trestleinc/bridge` - Shared types and validators (default)
- `@trestleinc/bridge/client` - Client utilities (errors, logger)
- `@trestleinc/bridge/server` - Server helpers (bridge factory, triggers, errors)
- `@trestleinc/bridge/convex.config` - Component configuration

## Development Commands

```bash
# Build (includes linting and type checking via tsdown)
bun run build        # Runs oxfmt && oxlint --fix && tsdown (outputs to dist/)
bun run clean        # Remove dist/

# Testing
bun test             # Run all tests with Vitest
bun test <path>      # Run specific test file
```

## Architecture

### Package Structure

```
src/
├── client/                  # Client-side utilities
│   ├── index.ts             # Public exports
│   └── errors.ts            # Error classes (Effect-based)
├── server/                  # Server-side (Convex functions)
│   ├── index.ts             # Public exports
│   ├── bridge.ts            # bridge() factory
│   ├── client.ts            # clientApi() factory
│   ├── resource.ts          # Resource builder with hooks
│   ├── triggers.ts          # Trigger generator for change detection
│   ├── errors.ts            # Server error classes
│   └── resources/           # Individual resource implementations
│       ├── index.ts         # Resource type exports
│       ├── card.ts          # Card resource
│       ├── procedure.ts     # Procedure resource
│       ├── deliverable.ts   # Deliverable resource
│       └── evaluation.ts    # Evaluation resource
├── component/               # Internal Convex component
│   ├── convex.config.ts     # Component config
│   ├── schema.ts            # Database schema (cards, procedures, deliverables, evaluations)
│   └── public.ts            # Component API
├── shared/                  # Shared types (all environments)
│   ├── index.ts             # Re-exports from validators.ts
│   ├── validators.ts        # All validators AND types (single source of truth)
│   └── logger.ts            # Unified LogTape logger (ANSI colored console output)
└── env.d.ts                 # Environment type declarations
```

### Core Concepts

**Data Model:**

- **Cards** - Field definitions with types, security levels, and subject associations
- **Procedures** - Data collection definitions (forms, imports, APIs)
- **Deliverables** - Reactive triggers with prerequisites and conditions
- **Evaluations** - Execution records for triggered deliverables

**Data Flow:**

```mermaid
flowchart LR
    A["Card definitions"] --> B["Procedures collect data"]
    B --> C["Deliverables trigger"]
    C --> D["Evaluations track execution"]
```

## Public API Surface

### Server (`@trestleinc/bridge/server`)

```typescript
// Factory (Replicate-inspired pattern)
import {
	bridge,
	AuthorizationError,
	NotFoundError,
	ValidationError,
	ConflictError,
} from "@trestleinc/bridge/server";

const b = bridge.create(components.bridge, {
	subjects: {
		beneficiary: { table: "beneficiaries" },
		event: { table: "events" },
		eventInstance: {
			table: "eventInstances",
			parents: [{ field: "eventId", subject: "event" }],
		},
	},
});
```

### Bridge Instance Methods

```typescript
// Resources (directly on instance)
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

// Bridge methods
b.submit(ctx, submission); // Validate card values through procedure
b.evaluate(ctx, trigger); // Check and trigger deliverables (auto-resolves if subjects bound)
b.resolve(ctx, type, id); // Resolve subject data from bound table
b.register(type, handler); // Register callback handler
b.execute(deliverable, op, ctx); // Run registered callback
b.aggregate(ctx, input); // Aggregate context from subject hierarchy
```

### Client (`@trestleinc/bridge/client`)

```typescript
// Error types (Effect-based)
(NetworkError, AuthorizationError, NotFoundError, ValidationError, NonRetriableError);
```

### Logger (`$/shared/logger`)

```typescript
import { getLogger } from "$/shared/logger";

// Get a LogTape logger with category
const logger = getLogger(["bridge", "cards"]);
logger.info("Card created", { cardId: "card_123" });

// ANSI colored console output configured automatically
// Categories help filter and organize log output
```

### Shared (`@trestleinc/bridge`)

```typescript
// Enums with display names and validation
CardType; // STRING, TEXT, NUMBER, BOOLEAN, DATE, EMAIL, URL, PHONE, SSN, ADDRESS, SUBJECT, ARRAY
SecurityLevel; // PUBLIC, CONFIDENTIAL, RESTRICTED
ProcedureType; // form, import, api
Operation; // create, update, delete
EvaluationStatus; // pending, running, completed, failed
DeliverableStatus; // active, paused

// Validators
(cardTypeValidator, securityLevelValidator, procedureTypeValidator);
(operationValidator, evaluationStatusValidator, deliverableStatusValidator);

// Types (derived from validators)
(Card, Procedure, Deliverable, Evaluation);
(ProcedureCard, DeliverableOperation, EvaluationContext, EvaluationResult);

// Branded IDs
(CardId, ProcedureId, DeliverableId, EvaluationId, OrganizationId);
(createId.card(),
	createId.procedure(),
	createId.deliverable(),
	createId.evaluation(),
	createId.organization());

// Duration utilities
Duration; // Template literal type: "30s", "5m", "2h", "7d"
parseDuration(d); // Parse Duration to milliseconds
formatDuration(ms); // Format milliseconds to Duration
```

## Key Patterns

### Server: bridge Factory

```typescript
// convex/bridge.ts
import { bridge } from "@trestleinc/bridge/server";
import { components } from "./_generated/api";

// Minimal configuration - authorization handled at wrapper level
export const b = bridge.create(components.bridge, {
	subjects: {
		beneficiary: { table: "beneficiaries" },
		event: { table: "events" },
		eventInstance: {
			table: "eventInstances",
			parents: [{ field: "eventId", subject: "event" }],
		},
	},
});
```

### Authorization Pattern (Wrapper Level)

**Important**: Authorization hooks (`evalRead`, `evalWrite`, `evalRemove`) receive generic context types from the component that may not be compatible with your host app's schema. Instead, handle authorization in wrapper functions where you have properly typed context:

```typescript
// convex/procedures.ts - Authorization at wrapper level
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import { verifyOrgAccess } from "./permissions";

export const procedureGet = query({
	args: { id: v.string() },
	handler: async (ctx, { id }) => {
		const procedure = await ctx.runQuery(components.bridge.public.procedureGet, { id });
		if (procedure) {
			// Verify with properly typed context from your schema
			await verifyOrgAccess(ctx, procedure.organizationId);
		}
		return procedure;
	},
});
```

### Using the Bridge API

```typescript
// convex/cards.ts
import { query, mutation } from "./_generated/server";
import { b } from "./bridge";

// Export bridge resources directly
export const get = b.cards.get;
export const find = b.cards.find;
export const list = b.cards.list;
export const create = b.cards.create;
```

### Subject Resolution

```typescript
// convex/triggers.ts
import { b } from "./bridge";
import { createTriggers } from "@trestleinc/bridge/server";

// Generate trigger handlers for change detection
export const triggers = createTriggers({
	subjects: {
		beneficiary: {
			table: "beneficiaries",
			trackedFields: ["firstName", "lastName", "email"],
		},
	},
	onTrigger: async (ctx, subject, subjectId, operation) => {
		await b.evaluate(ctx, { organizationId, subject, subjectId, operation });
	},
});
```

## Error Handling

```typescript
import {
  BridgeError, // Base class with code property
  NotFoundError, // new NotFoundError('Card', id)
  ValidationError, // new ValidationError('message', { fields: [...] })
  AuthorizationError, // new AuthorizationError('message')
  ConflictError, // new ConflictError('message')
} from "@trestleinc/bridge/server";

// In handlers
try {
  await ctx.runMutation(b.cards.create, { ... });
} catch (error) {
  if (error instanceof NotFoundError) {
    // error.code === 'NOT_FOUND'
  }
}
```

## Technology Stack

- **TypeScript** (strict mode)
- **Effect** for dependency injection (in dependencies)
- **Convex** for backend (cloud database + functions)
- **tsdown** for building
- **oxlint/oxfmt** for linting and formatting (fast, zero-config)
- **LogTape** for logging (avoid console.\*)

## Naming Conventions

- **Public API**: `bridge()` factory, direct resource access `b.cards.*`, `b.procedures.*`
- **Error classes**: Short names with "Error" suffix (`NotFoundError`, `ValidationError`)
- **Types not classes**: Use `type` for inputs, results - NOT interfaces

## Important Notes

- **bun for commands** - Use `bun run` for all commands
- **Organization-scoped** - All data is scoped by `organizationId`
- **Subject bindings** - Bind subjects to host tables for auto-resolution
- **Authorization at wrapper level** - Component hooks receive generic context types; use wrapper functions for auth
- **LogTape logging** - Use LogTape from `$/shared/logger`, not console.\*
- **Import types** - Use `import type` for type-only imports
- **Single source of truth** - All validators and types in `$/shared/validators`
- **Types from validators** - Use `Infer<typeof validator>`, not duplicate interfaces
