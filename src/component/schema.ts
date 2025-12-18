/**
 * @trestleinc/bridge - Component Schema
 *
 * Defines the database tables for the Bridge component:
 * - cards: Field definitions with variants and security levels
 * - procedures: Forms/imports that collect card data
 * - deliverables: Reactive triggers with conditions
 * - evaluations: Execution records when deliverables trigger
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// ============================================================================
// Inline Validators (to avoid circular dependencies with shared/)
// ============================================================================

const variantValidator = v.union(
  v.literal('STRING'),
  v.literal('TEXT'),
  v.literal('NUMBER'),
  v.literal('BOOLEAN'),
  v.literal('DATE'),
  v.literal('EMAIL'),
  v.literal('URL'),
  v.literal('PHONE'),
  v.literal('SSN'),
  v.literal('ADDRESS'),
  v.literal('SUBJECT'),
  v.literal('ARRAY')
);

const securityValidator = v.union(
  v.literal('PUBLIC'),
  v.literal('CONFIDENTIAL'),
  v.literal('RESTRICTED')
);

const sourceValidator = v.union(v.literal('form'), v.literal('import'), v.literal('api'));

// Subject is a generic string - host defines their own subject types
const subjectValidator = v.string();

const operationValidator = v.union(v.literal('create'), v.literal('update'));

const procedureCardValidator = v.object({
  cardId: v.string(),
  required: v.boolean(),
  writeTo: v.object({
    path: v.string(),
  }),
});

const scheduleValidator = v.object({
  at: v.optional(v.number()),
  cron: v.optional(v.string()),
});

const requiredValidator = v.object({
  cardIds: v.array(v.string()),
  deliverableIds: v.array(v.string()),
});

const evaluationStatusValidator = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed')
);

const deliverableStatusValidator = v.union(v.literal('active'), v.literal('paused'));

// ============================================================================
// Schema Definition
// ============================================================================

export default defineSchema({
  /**
   * Cards - Field definitions with variants and security levels
   *
   * Cards are the atomic building blocks of the Bridge data model.
   * Each card represents a single data field that can be collected.
   */
  cards: defineTable({
    id: v.string(),
    organizationId: v.string(),
    slug: v.string(),
    label: v.string(),
    variant: variantValidator,
    security: securityValidator,
    subject: subjectValidator,
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_slug', ['organizationId', 'slug'])
    .index('by_subject', ['organizationId', 'subject']),

  /**
   * Procedures - Forms/imports that collect card data
   *
   * A procedure defines how data is collected (form, import, or API)
   * and which cards it collects with their write paths.
   */
  procedures: defineTable({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    source: sourceValidator,
    subject: v.optional(
      v.object({
        type: subjectValidator,
        operation: operationValidator,
      })
    ),
    cards: v.array(procedureCardValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_source', ['organizationId', 'source']),

  /**
   * Deliverables - Reactive triggers with optional scheduling
   *
   * A deliverable defines when automated actions should be triggered.
   * When all required cards are present, the deliverable becomes "ready"
   * and can invoke callbacks. Optional scheduling via UTC timestamp or cron.
   */
  deliverables: defineTable({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    subject: subjectValidator,
    required: requiredValidator,
    callbackUrl: v.optional(v.string()),
    callbackAction: v.optional(v.string()),
    schedule: v.optional(scheduleValidator),
    status: deliverableStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_subject', ['organizationId', 'subject']),

  /**
   * Evaluations - Execution records when deliverables trigger
   *
   * Each evaluation tracks a triggered deliverable and its execution state.
   * This enables scheduling, retry logic, and audit trails.
   */
  evaluations: defineTable({
    id: v.string(),
    deliverableId: v.string(),
    organizationId: v.string(),
    context: v.object({
      subject: v.string(),
      subjectId: v.string(),
      mutated: v.optional(v.array(v.string())),
    }),
    variables: v.any(),
    status: evaluationStatusValidator,
    scheduledFor: v.optional(v.number()),
    result: v.optional(
      v.object({
        success: v.boolean(),
        duration: v.optional(v.number()),
        error: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_uuid', ['id'])
    .index('by_deliverable', ['deliverableId'])
    .index('by_organization', ['organizationId'])
    .index('by_status', ['status', 'scheduledFor']),
});
