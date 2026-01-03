import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  deliverableStatusValidator,
  evaluationContextValidator,
  evaluationStatusValidator,
  operationValidator,
  operationsValidator,
  procedureCardValidator,
  resultValidator,
  scheduleValidator,
  securityValidator,
  sourceValidator,
  variantValidator,
} from '$/shared/validators';

export default defineSchema({
  cards: defineTable({
    id: v.string(),
    organizationId: v.string(),
    slug: v.string(),
    label: v.string(),
    variant: variantValidator,
    security: securityValidator,
    subject: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_slug', ['organizationId', 'slug'])
    .index('by_subject', ['organizationId', 'subject']),

  procedures: defineTable({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    source: sourceValidator,
    subject: v.optional(
      v.object({
        type: v.string(),
        operation: operationValidator,
      }),
    ),
    cards: v.array(procedureCardValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_source', ['organizationId', 'source']),

  deliverables: defineTable({
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    subject: v.string(),
    operations: operationsValidator,
    schedule: v.optional(scheduleValidator),
    status: deliverableStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_uuid', ['id'])
    .index('by_organization', ['organizationId'])
    .index('by_subject', ['organizationId', 'subject']),

  evaluations: defineTable({
    id: v.string(),
    deliverableId: v.string(),
    organizationId: v.string(),
    operation: operationValidator,
    context: evaluationContextValidator,
    variables: v.record(v.string(), v.any()),
    status: evaluationStatusValidator,
    scheduledFor: v.optional(v.number()),
    scheduled: v.optional(v.string()),
    started: v.optional(v.number()),
    result: v.optional(resultValidator),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_uuid', ['id'])
    .index('by_deliverable', ['deliverableId'])
    .index('by_organization', ['organizationId'])
    .index('by_status', ['status', 'scheduledFor']),
});
