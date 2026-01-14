# AGENTS.md - Development Guide

## Commands

- **Build:** `bun run build` (runs `oxfmt && oxlint --fix && tsdown`, outputs to `dist/`)
- **Test:** `bun test` (Vitest). Run single: `bun test src/path/to/test.ts`
- **Type Check:** Build includes type checking via tsdown

## Code Style & Conventions

- **Formatting:** 2 spaces, single quotes, semicolons (enforced by oxfmt).
- **Imports:** Use `import type` for types. Use `node:` protocol for Node built-ins.
- **Logging:** Use `LogTape`. Avoid `console.*` (warns in oxlint, allowed in tests).
- **Structure:** Single package. `src/client` (browser), `src/server` (Convex), `src/component`.
- **Documentation:** ALWAYS use `Context7` tool for library docs (Convex, Effect).
- **Scoping:** All data is scoped by `organizationId`.
- **Validation:** All types derived from validators using `Infer<typeof validator>`.

## File Structure

```
src/
├── client/                  # Client-side utilities
│   ├── index.ts             # Public exports
│   ├── errors.ts            # Error classes (Effect-based)
│   └── logger.ts            # LogTape logger
├── server/                  # Server-side (Convex functions)
│   ├── index.ts             # Public exports
│   ├── bridge.ts            # bridge() factory
│   ├── client.ts            # clientApi() factory
│   ├── resource.ts          # Resource builder with hooks
│   ├── triggers.ts          # Trigger generator
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
├── shared/                  # Shared validators and types
│   ├── index.ts             # Re-exports
│   └── validators.ts        # All validators AND types (single source of truth)
└── env.d.ts                 # Environment type declarations
```

## Public API

### Server (`@trestleinc/bridge/server`)

```typescript
// Factory
bridge(component)(options)              // Create bridge instance with hooks and subject bindings

// Options structure
{
  subjects: { beneficiary: "beneficiaries", event: "events" },
  cards: { hooks: { evalRead, evalWrite, evalRemove, onInsert, onUpdate, onRemove, transform } },
  procedures: { hooks: { ... } },
  deliverables: { hooks: { ... } },
  evaluations: { hooks: { ..., onComplete } },
}

// Trigger utilities
createTriggers(config)                  // Generate Convex trigger handlers
createSubjectTrigger(subjectConfig)     // Single trigger handler
extractAttributeChanges(op, old, new)   // Detect changed attributes

// Error types
BridgeError                             // Base error class with code property
NotFoundError                           // Resource not found
ValidationError                         // Validation failed (with field errors)
AuthorizationError                      // Authorization denied
ConflictError                           // Conflict error
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
// Error types
(NetworkError, AuthorizationError, NotFoundError, ValidationError, NonRetriableError);

// Logger
getLogger();
```

### Shared (`@trestleinc/bridge`)

```typescript
// Enums
(CardType, SecurityLevel, ProcedureType, Operation, EvaluationStatus, DeliverableStatus);

// Validators
(cardTypeValidator, securityLevelValidator, procedureTypeValidator);
(operationValidator, evaluationStatusValidator, deliverableStatusValidator);

// Types
(Card, Procedure, Deliverable, Evaluation);
(ProcedureCard, DeliverableOperation, EvaluationContext, EvaluationResult);

// Branded IDs
(CardId, ProcedureId, DeliverableId, EvaluationId, OrganizationId);
(createId.card(), createId.procedure(), createId.deliverable(), createId.evaluation());

// Duration utilities
(Duration, parseDuration, formatDuration);
```

## Hooks Reference

### Authorization Hooks (eval\*)

Run BEFORE operation. Throw to deny access.

```typescript
evalRead: (ctx, organizationId) => void | Promise<void>   // Before reads
evalWrite: (ctx, doc) => void | Promise<void>             // Before writes
evalRemove: (ctx, doc) => void | Promise<void>            // Before deletes (receives full doc)
```

### Side Effect Hooks (on\*)

Run AFTER operation for logging, notifications.

```typescript
onInsert: (ctx, doc) => void | Promise<void>              // After insert
onUpdate: (ctx, doc, prev) => void | Promise<void>        // After update
onRemove: (ctx, doc) => void | Promise<void>              // After delete (receives full doc)
onComplete: (ctx, evaluation) => void | Promise<void>     // After evaluation completes (evaluations only)
transform: (docs) => T[] | Promise<T[]>                   // Transform results before returning
```

## Subject Bindings

Bind subject types to host tables for automatic context resolution:

```typescript
const b = bridge(components.bridge)({
	subjects: {
		beneficiary: "beneficiaries",
		event: "events",
		eventInstance: "eventInstances",
	},
});
```

Host tables must have:

- `id` field (UUID string)
- `attributes` array with `{ slug, value }` objects
- `by_uuid` index on `id` field

## Critical Rules (from CLAUDE.md)

- NEVER use WebSearch for library documentation; use Context7.
- Use `bun` for all commands.
- Resource pattern: `b.cards.get`, `b.procedures.list`, `b.deliverables.evaluate`.
- All data scoped by `organizationId`.
- Subject bindings enable auto-resolution in `b.evaluate()`.
- Hooks: eval* for auth (throw to deny), on* for side effects.
- evalRemove and onRemove receive full document (not just ID).
- Import validators and types from `$/shared/validators` (single source of truth).
- Types derived from validators using `Infer<typeof validator>`.
