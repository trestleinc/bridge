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
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { b } from './bridge';

export const list = query({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    return ctx.runQuery(b.api.card.list, { organizationId });
  },
});

export const create = mutation({
  args: {
    organizationId: v.string(),
    slug: v.string(),
    label: v.string(),
    type: v.string(),
    securityLevel: v.string(),
    subjectType: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation(b.api.card.create, args);
  },
});
```

## API Reference

### Cards

Field definitions with types and security metadata.

| Method | Description |
|--------|-------------|
| `card.get` | Get a card by ID |
| `card.find` | Find a card by organization and slug |
| `card.list` | List cards for an organization |
| `card.create` | Create a new card |

### Procedures

Data collection definitions (forms, imports, APIs).

| Method | Description |
|--------|-------------|
| `procedure.get` | Get a procedure by ID |
| `procedure.list` | List procedures for an organization |
| `procedure.create` | Create a new procedure |
| `procedure.update` | Update an existing procedure |
| `procedure.remove` | Delete a procedure |
| `procedure.submit` | Validate card values against procedure schema |

### Deliverables

Reactive triggers with conditions.

| Method | Description |
|--------|-------------|
| `deliverable.get` | Get a deliverable by ID |
| `deliverable.list` | List deliverables for an organization |
| `deliverable.create` | Create a new deliverable |
| `deliverable.update` | Update an existing deliverable |
| `deliverable.evaluate` | Check and trigger ready deliverables |

### Evaluations

Execution records for triggered deliverables.

| Method | Description |
|--------|-------------|
| `evaluation.get` | Get an evaluation by ID |
| `evaluation.list` | List evaluations for a deliverable |
| `evaluation.start` | Start a scheduled evaluation |
| `evaluation.cancel` | Cancel a pending evaluation |
| `evaluation.complete` | Mark an evaluation as complete |

## Data Model

### Card

```typescript
interface Card {
  id: string;
  organizationId: string;
  slug: string;
  label: string;
  type: CardType;           // 'text' | 'number' | 'boolean' | 'date' | 'json'
  securityLevel: SecurityLevel; // 'public' | 'internal' | 'confidential' | 'restricted'
  subjectType: SubjectType; // 'person' | 'organization' | 'transaction'
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
  type: ProcedureType;      // 'form' | 'import' | 'api'
  subject?: {
    type: SubjectType;
    operation: Operation;   // 'create' | 'update' | 'upsert'
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
  subjectType: SubjectType;
  requiredCards: string[];  // Card slugs that must be present
  callbackUrl?: string;     // HTTP callback when triggered
  callbackAction?: string;  // Convex action reference
  prerequisites?: Prerequisite[];
  conditions?: Conditions;
  status: DeliverableStatus; // 'active' | 'paused' | 'archived'
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
  context: {
    subjectType: SubjectType;
    subjectId: string;
    changedFields?: string[];
  };
  variables: Record<string, unknown>;
  status: EvaluationStatus; // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  scheduledFor?: number;
  result?: {
    success: boolean;
    duration?: number;
    error?: string;
  };
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
  subjectType: 'beneficiary',
  subjectId: 'ben_789',
  values: { firstName: 'John', lastName: 'Doe' },
});

if (result.success) {
  // Write validated values to your tables
  await ctx.runMutation(internal.subjects.update, {
    id: 'ben_789',
    ...result.validated,
  });
}
```

### evaluate

Trigger deliverable evaluation for a subject. If subjects are bound, variables are auto-resolved from the host table:

```typescript
// With auto-resolution (subjects bound) - no variables needed!
const readiness = await b.evaluate(ctx, {
  organizationId: 'org_456',
  subjectType: 'beneficiary',
  subjectId: 'ben_789',
});

// Or with explicit variables (overrides auto-resolution):
const readiness = await b.evaluate(ctx, {
  organizationId: 'org_456',
  subjectType: 'beneficiary',
  subjectId: 'ben_789',
  variables: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  changedFields: ['email'],
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

b.register('webhook', async (deliverable, context) => {
  // Send HTTP webhook
  const response = await fetch(deliverable.callbackUrl!, {
    method: 'POST',
    body: JSON.stringify(context),
  });
  return { success: response.ok };
});

// Execute in an action
const result = await b.execute(deliverable, {
  subjectType: 'beneficiary',
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
  subjects: {
    beneficiary: 'beneficiaries',
    event: 'events',
    eventInstance: 'eventInstances',
  },
  hooks: {
    // Authorization
    read: async (ctx, organizationId) => {
      // Verify user can read this organization's data
    },
    write: async (ctx, organizationId) => {
      // Verify user can write to this organization
    },

    // Side effects - namespaced by entity type
    card: {
      insert: async (ctx, card) => {
        // React to card creation
      },
    },
    procedure: {
      insert: async (ctx, procedure) => {
        // React to procedure creation
      },
    },
    deliverable: {
      trigger: async (ctx, evaluation) => {
        // React when a deliverable is triggered
      },
    },
    evaluation: {
      complete: async (ctx, evaluation) => {
        // React when an evaluation completes
      },
    },
  },
});
```

## License

Apache-2.0
