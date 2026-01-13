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
bridge(component)(options)  // Factory to create bridge instance with hooks
```

### Bridge Options

```typescript
const b = bridge(components.bridge)({
  subjects: { beneficiary: 'beneficiaries' },
  cards: { hooks: { evalRead, onInsert } },
  procedures: { hooks: { evalWrite } },
  deliverables: { hooks: { evalRead } },
  evaluations: { hooks: { onComplete } },
});
```

### Resources (Direct Access)

```typescript
b.cards.get, b.cards.find, b.cards.list, b.cards.create
b.procedures.get, b.procedures.list, b.procedures.create, b.procedures.update, b.procedures.remove, b.procedures.submit
b.deliverables.get, b.deliverables.list, b.deliverables.create, b.deliverables.update, b.deliverables.evaluate
b.evaluations.get, b.evaluations.list, b.evaluations.start, b.evaluations.cancel, b.evaluations.complete
```

### Bridge Methods

```typescript
b.submit(ctx, submission)   // Validate card values
b.evaluate(ctx, trigger)    // Check and trigger deliverables (auto-resolves if subjects bound)
b.resolve(ctx, type, id)    // Resolve subject data from bound table
b.execute(deliverable, op, ctx) // Run registered callback
b.register(type, handler)   // Register callback handler
b.aggregate(ctx, input)     // Aggregate context from subject hierarchy
```

### Hooks

```typescript
evalRead(ctx, organizationId)     // Before read (throw to deny)
evalWrite(ctx, doc)               // Before write (throw to deny)
evalRemove(ctx, id)               // Before remove (throw to deny)
onInsert(ctx, doc)                // After insert
onUpdate(ctx, doc, prev)          // After update
onRemove(ctx, id)                 // After remove
onComplete(ctx, evaluation)       // After evaluation completes (evaluations only)
transform(docs)                   // Transform results before returning
```

### Client (`@trestleinc/bridge/client`)

```typescript
NetworkError, AuthorizationError, NotFoundError, ValidationError, NonRetriableError
getLogger()           // LogTape logger
```

### Type Safety

```typescript
CardId, ProcedureId, DeliverableId, EvaluationId, OrganizationId  // Branded ID types
Duration              // Template literal type: "30s", "5m", "2h", "7d"
parseDuration(d)      // Parse Duration to milliseconds
formatDuration(ms)    // Format milliseconds to Duration
createId.card(s)      // Create typed IDs
```

## Critical Rules (from CLAUDE.md)

- NEVER use WebSearch for library documentation; use Context7.
- Use `bun` for all commands.
- Resource pattern: `b.cards.get`, `b.procedures.list`, etc.
