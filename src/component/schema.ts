/**
 * @trestleinc/bridge - Component Schema
 *
 * Defines the database tables for the Bridge component:
 * - cards: Field definitions with types and security levels
 * - procedures: Forms/imports that collect card data
 * - deliverables: Reactive triggers with conditions
 * - evaluations: Execution records when deliverables trigger
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// ============================================================================
// Inline Validators (to avoid circular dependencies with shared/)
// ============================================================================

const cardTypeValidator = v.union(
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

const securityLevelValidator = v.union(
  v.literal('PUBLIC'),
  v.literal('CONFIDENTIAL'),
  v.literal('RESTRICTED')
);

const procedureTypeValidator = v.union(v.literal('form'), v.literal('import'), v.literal('api'));

const subjectTypeValidator = v.union(
  v.literal('beneficiary'),
  v.literal('event'),
  v.literal('eventInstance')
);

const operationValidator = v.union(v.literal('create'), v.literal('update'));

const procedureCardValidator = v.object({
  slug: v.string(),
  label: v.string(),
  type: cardTypeValidator,
  securityLevel: securityLevelValidator,
  required: v.boolean(),
  writeTo: v.object({
    path: v.string(),
  }),
  targetSubjectType: v.optional(subjectTypeValidator),
  requiredCards: v.optional(v.array(v.string())),
});

const conditionsValidator = v.object({
  time: v.optional(
    v.object({
      after: v.string(),
      before: v.optional(v.string()),
    })
  ),
  date: v.optional(
    v.object({
      daysBeforeEvent: v.optional(v.number()),
      hoursBeforeEvent: v.optional(v.number()),
    })
  ),
  dayOfWeek: v.optional(v.array(v.number())),
});

const prerequisiteValidator = v.object({
  deliverableId: v.string(),
  scope: subjectTypeValidator,
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
   * Cards - Field definitions with types and security levels
   *
   * Cards are the atomic building blocks of the Bridge data model.
   * Each card represents a single data field that can be collected.
   */
  cards: defineTable({
    id: v.string(),
    organizationId: v.string(),
    slug: v.string(),
    label: v.string(),
    type: cardTypeValidator,
    securityLevel: securityLevelValidator,
    subjectType: subjectTypeValidator,
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_slug', ['organizationId', 'slug'])
    .index('by_subject', ['organizationId', 'subjectType']),

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
    type: procedureTypeValidator,
    subject: v.optional(
      v.object({
        type: subjectTypeValidator,
        operation: operationValidator,
      })
    ),
    cards: v.array(procedureCardValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_type', ['organizationId', 'type']),

  /**
   * Deliverables - Reactive triggers with conditions
   *
   * A deliverable defines when automated actions should be triggered.
   * When all required cards are present and conditions are met,
   * the deliverable becomes "ready" and can invoke callbacks.
   */
  deliverables: defineTable({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    subjectType: subjectTypeValidator,
    requiredCards: v.array(v.string()),
    callbackUrl: v.optional(v.string()),
    callbackAction: v.optional(v.string()),
    prerequisites: v.optional(v.array(prerequisiteValidator)),
    conditions: v.optional(conditionsValidator),
    status: deliverableStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_subject_type', ['organizationId', 'subjectType']),

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
      subjectType: v.string(),
      subjectId: v.string(),
      changedFields: v.optional(v.array(v.string())),
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
