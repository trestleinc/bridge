# @trestleinc/bridge

Reactive data layer for schema-driven Cards, Procedures, and Deliverables.

Bridge is a Convex component that provides a structured approach to defining data fields, collection procedures, and reactive triggers. It's designed for applications that need to dynamically define what data to collect and when to trigger automated workflows.

## Features

- **Cards** - Field definitions with types, security levels, and subject associations
- **Procedures** - Data collection definitions (forms, imports, APIs) that specify which cards to collect
- **Deliverables** - Reactive triggers with prerequisites and conditions that fire when data is ready
- **Evaluations** - Execution tracking with scheduling, status management, and results

## Installation

```bash
bun add @trestleinc/bridge
```

## Quick Start

### 1. Install the Convex Component

```typescript
// convex/convex.config.ts
import { defineApp } from 'convex/server';
import bridge from '@trestleinc/bridge/convex.config';

const app = defineApp();
app.use(bridge);

export default app;
```

### 2. Create a Bridge Instance

```typescript
// convex/bridge.ts
import { bridge } from '@trestleinc/bridge/server';
import { components } from './_generated/api';

export const b = bridge(components.bridge)({
  // Bind subject types to your host tables for automatic context resolution
  subjects: {
    beneficiary: 'beneficiaries',
    event: 'events',
    eventInstance: 'eventInstances',
  },
  hooks: {
    read: async (ctx, orgId) => { /* auth check */ },
    write: async (ctx, orgId) => { /* auth check */ },
  },
});
```

### 3. Use in Queries and Mutations

```typescript
// convex/cards.ts
import { b } from './bridge';

// Export bridge resources directly as Convex functions
export const get = b.cards.get;
export const find = b.cards.find;
export const list = b.cards.list;
export const create = b.cards.create;
```

## API Reference

### Cards

Field definitions with types and security metadata.

| Method | Description |
|--------|-------------|
| `b.cards.get` | Get a card by ID |
| `b.cards.find` | Find a card by organization and slug |
| `b.cards.list` | List cards for an organization |
| `b.cards.create` | Create a new card |

### Procedures

Data collection definitions (forms, imports, APIs).

| Method | Description |
|--------|-------------|
| `b.procedures.get` | Get a procedure by ID |
| `b.procedures.list` | List procedures for an organization |
| `b.procedures.create` | Create a new procedure |
| `b.procedures.update` | Update an existing procedure |
| `b.procedures.remove` | Delete a procedure |
| `b.procedures.submit` | Validate card values against procedure schema |

### Deliverables

Reactive triggers with conditions.

| Method | Description |
|--------|-------------|
| `b.deliverables.get` | Get a deliverable by ID |
| `b.deliverables.list` | List deliverables for an organization |
| `b.deliverables.create` | Create a new deliverable |
| `b.deliverables.update` | Update an existing deliverable |
| `b.deliverables.evaluate` | Check and trigger ready deliverables |

### Evaluations

Execution records for triggered deliverables.

| Method | Description |
|--------|-------------|
| `b.evaluations.get` | Get an evaluation by ID |
| `b.evaluations.list` | List evaluations for a deliverable |
| `b.evaluations.start` | Start a scheduled evaluation |
| `b.evaluations.cancel` | Cancel a pending evaluation |
| `b.evaluations.complete` | Mark an evaluation as complete |

## Data Model

### Card

```typescript
interface Card {
  id: string;
  organizationId: string;
  slug: string;
  label: string;
  variant: Variant;         // 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | ...
  security: Security;       // 'PUBLIC' | 'CONFIDENTIAL' | 'RESTRICTED'
  subject: string;
  createdBy: string;
  createdAt: number;
}
```

### Procedure

```typescript
interface Procedure {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  source: Source;           // 'form' | 'import' | 'api'
  subject?: {
    type: string;
    operation: Operation;   // 'create' | 'update' | 'delete'
  };
  cards: ProcedureCard[];   // Cards to collect with field mappings
  createdAt: number;
  updatedAt: number;
}
```

### Deliverable

```typescript
interface Deliverable {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  subject: string;
  operations: DeliverableOperations;
  schedule?: Schedule;
  status: DeliverableStatus; // 'active' | 'paused'
  createdAt: number;
  updatedAt: number;
}
```

### Evaluation

```typescript
interface Evaluation {
  id: string;
  deliverableId: string;
  organizationId: string;
  operation: Operation;
  context: EvaluationContext;
  variables: Record<string, unknown>;
  status: EvaluationStatus; // 'pending' | 'running' | 'completed' | 'failed'
  scheduledFor?: number;
  result?: EvaluationResult;
  createdAt: number;
  completedAt?: number;
}
```

## Bridge Methods

The bridge instance provides convenience methods for common operations:

### submit

Validate and submit card values through a procedure:

```typescript
const result = await b.submit(ctx, {
  procedureId: 'proc_123',
  organizationId: 'org_456',
  subject: 'beneficiary',
  subjectId: 'ben_789',
  values: { firstName: 'John', lastName: 'Doe' },
});

if (result.success) {
  // Write validated values to your tables
}
```

### evaluate

Trigger deliverable evaluation for a subject. If subjects are bound, variables are auto-resolved from the host table:

```typescript
// With auto-resolution (subjects bound) - no variables needed!
const readiness = await b.evaluate(ctx, {
  organizationId: 'org_456',
  subject: 'beneficiary',
  subjectId: 'ben_789',
  operation: 'create',
});

for (const r of readiness) {
  if (r.ready) {
    console.log(`Deliverable ${r.deliverableId} triggered, evaluation ${r.evaluationId}`);
  }
}
```

### resolve

Manually resolve subject data from a bound host table:

```typescript
const variables = await b.resolve(ctx, 'beneficiary', 'ben_789');
// { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
```

### register & execute

Register callback handlers and execute deliverables:

```typescript
// Register handlers at module level
b.register('automation', async (deliverable, context) => {
  // Execute automation logic
  return { success: true, data: { sent: true } };
});

// Execute in an action
const result = await b.execute(deliverable, 'create', {
  subject: 'beneficiary',
  subjectId: 'ben_789',
  variables: { firstName: 'John' },
});
```

## Subject Bindings

Bind subject types to your host tables for automatic context resolution:

```typescript
const b = bridge(components.bridge)({
  subjects: {
    beneficiary: 'beneficiaries',  // Your beneficiaries table
    event: 'events',               // Your events table
    eventInstance: 'eventInstances',
  },
});
```

When subjects are bound, Bridge can automatically fetch subject data when evaluating deliverables. Your host tables must have:
- An `id` field (UUID string)
- An `attributes` array with `{ slug, value }` objects
- A `by_uuid` index on the `id` field

## Server Hooks

Configure authorization and side effects:

```typescript
const b = bridge(components.bridge)({
  subjects: { ... },
  cards: {
    hooks: {
      evalRead: async (ctx, organizationId) => { /* auth check */ },
      evalWrite: async (ctx, doc) => { /* auth check */ },
      onInsert: async (ctx, doc) => { /* side effect */ },
    },
  },
  procedures: {
    hooks: { ... },
  },
  deliverables: {
    hooks: { ... },
  },
  evaluations: {
    hooks: {
      onComplete: async (ctx, evaluation) => { /* react to completion */ },
    },
  },
});
```

## License

Apache-2.0
