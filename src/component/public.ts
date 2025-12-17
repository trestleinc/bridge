/**
 * @trestleinc/bridge - Component Public API
 *
 * Namespaced queries and mutations for Cards, Procedures, Deliverables, and Evaluations.
 */

import { v } from 'convex/values';
import { mutation, query } from '$/component/_generated/server';
import { getLogger } from '$/component/logger';

// ============================================================================
// Validators
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
  writeTo: v.object({ path: v.string() }),
  targetSubjectType: v.optional(subjectTypeValidator),
  requiredCards: v.optional(v.array(v.string())),
});

const conditionsValidator = v.object({
  time: v.optional(v.object({ after: v.string(), before: v.optional(v.string()) })),
  date: v.optional(
    v.object({ daysBeforeEvent: v.optional(v.number()), hoursBeforeEvent: v.optional(v.number()) })
  ),
  dayOfWeek: v.optional(v.array(v.number())),
});

const prerequisiteValidator = v.object({
  deliverableId: v.string(),
  scope: subjectTypeValidator,
});

const deliverableStatusValidator = v.union(v.literal('active'), v.literal('paused'));

const resultValidator = v.object({
  success: v.boolean(),
  duration: v.optional(v.number()),
  error: v.optional(v.string()),
});

// ============================================================================
// CARD
// ============================================================================

const _cardGet = query({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('cards')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
  },
});

const _cardFind = query({
  args: { organizationId: v.string(), slug: v.string() },
  returns: v.any(),
  handler: async (ctx, { organizationId, slug }) => {
    return ctx.db
      .query('cards')
      .withIndex('by_slug', (q) => q.eq('organizationId', organizationId).eq('slug', slug))
      .first();
  },
});

const _cardList = query({
  args: {
    organizationId: v.string(),
    subjectType: v.optional(subjectTypeValidator),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { organizationId, subjectType, limit = 100 }) => {
    if (subjectType) {
      return ctx.db
        .query('cards')
        .withIndex('by_subject', (q) =>
          q.eq('organizationId', organizationId).eq('subjectType', subjectType)
        )
        .take(limit);
    }
    return ctx.db
      .query('cards')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .take(limit);
  },
});

const _cardCreate = mutation({
  args: {
    organizationId: v.string(),
    slug: v.string(),
    label: v.string(),
    type: cardTypeValidator,
    securityLevel: securityLevelValidator,
    subjectType: subjectTypeValidator,
    createdBy: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['card']);

    const existing = await ctx.db
      .query('cards')
      .withIndex('by_slug', (q) =>
        q.eq('organizationId', args.organizationId).eq('slug', args.slug)
      )
      .first();

    if (existing) {
      if (existing.type !== args.type) {
        throw new Error(
          `Card "${args.slug}" exists with type "${existing.type}", cannot change to "${args.type}"`
        );
      }
      logger.info('Card exists, returning', { slug: args.slug });
      return existing;
    }

    const id = crypto.randomUUID();
    const card = { id, ...args, createdAt: Date.now() };
    await ctx.db.insert('cards', card);
    logger.info('Card created', { id, slug: args.slug });
    return card;
  },
});

export const card = {
  get: _cardGet,
  find: _cardFind,
  list: _cardList,
  create: _cardCreate,
};

// ============================================================================
// PROCEDURE
// ============================================================================

const _procedureGet = query({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('procedures')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
  },
});

const _procedureList = query({
  args: {
    organizationId: v.string(),
    type: v.optional(procedureTypeValidator),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { organizationId, type, limit = 50 }) => {
    if (type) {
      return ctx.db
        .query('procedures')
        .withIndex('by_type', (q) => q.eq('organizationId', organizationId).eq('type', type))
        .order('desc')
        .take(limit);
    }
    return ctx.db
      .query('procedures')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .order('desc')
      .take(limit);
  },
});

const _procedureCreate = mutation({
  args: {
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    type: procedureTypeValidator,
    subject: v.optional(v.object({ type: subjectTypeValidator, operation: operationValidator })),
    cards: v.array(procedureCardValidator),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['procedure']);
    const now = Date.now();

    // Auto-create cards
    for (const c of args.cards) {
      const existing = await ctx.db
        .query('cards')
        .withIndex('by_slug', (q) => q.eq('organizationId', args.organizationId).eq('slug', c.slug))
        .first();

      if (!existing && args.subject) {
        await ctx.db.insert('cards', {
          id: crypto.randomUUID(),
          organizationId: args.organizationId,
          slug: c.slug,
          label: c.label,
          type: c.type,
          securityLevel: c.securityLevel,
          subjectType: args.subject.type,
          createdBy: `procedure:${args.id}`,
          createdAt: now,
        });
        logger.info('Auto-created card', { slug: c.slug, procedureId: args.id });
      }
    }

    await ctx.db.insert('procedures', { ...args, createdAt: now, updatedAt: now });
    logger.info('Procedure created', { id: args.id, name: args.name });
    return { id: args.id };
  },
});

const _procedureUpdate = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(procedureTypeValidator),
    cards: v.optional(v.array(procedureCardValidator)),
  },
  returns: v.any(),
  handler: async (ctx, { id, ...updates }) => {
    const logger = getLogger(['procedure']);
    const existing = await ctx.db
      .query('procedures')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (!existing) throw new Error(`Procedure not found: ${id}`);

    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) clean[k] = v;
    }

    await ctx.db.patch(existing._id, { ...clean, updatedAt: Date.now() });
    logger.info('Procedure updated', { id });
    return { id };
  },
});

const _procedureRemove = mutation({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    const logger = getLogger(['procedure']);
    const proc = await ctx.db
      .query('procedures')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (proc) {
      await ctx.db.delete(proc._id);
      logger.info('Procedure removed', { id });
    }
    return { removed: true };
  },
});

export const procedure = {
  get: _procedureGet,
  list: _procedureList,
  create: _procedureCreate,
  update: _procedureUpdate,
  remove: _procedureRemove,
};

// ============================================================================
// DELIVERABLE
// ============================================================================

const _deliverableGet = query({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('deliverables')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
  },
});

const _deliverableList = query({
  args: {
    organizationId: v.string(),
    subjectType: v.optional(subjectTypeValidator),
    status: v.optional(deliverableStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { organizationId, subjectType, status, limit = 50 }) => {
    const results = subjectType
      ? await ctx.db
          .query('deliverables')
          .withIndex('by_subject_type', (q) =>
            q.eq('organizationId', organizationId).eq('subjectType', subjectType)
          )
          .order('desc')
          .take(limit)
      : await ctx.db
          .query('deliverables')
          .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
          .order('desc')
          .take(limit);
    return status ? results.filter((d) => d.status === status) : results;
  },
});

const _deliverableCreate = mutation({
  args: {
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
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['deliverable']);
    const now = Date.now();
    await ctx.db.insert('deliverables', {
      ...args,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    });
    logger.info('Deliverable created', { id: args.id, name: args.name });
    return { id: args.id };
  },
});

const _deliverableUpdate = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    requiredCards: v.optional(v.array(v.string())),
    status: v.optional(deliverableStatusValidator),
    conditions: v.optional(conditionsValidator),
  },
  returns: v.any(),
  handler: async (ctx, { id, ...updates }) => {
    const logger = getLogger(['deliverable']);
    const existing = await ctx.db
      .query('deliverables')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (!existing) throw new Error(`Deliverable not found: ${id}`);

    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) clean[k] = v;
    }

    await ctx.db.patch(existing._id, { ...clean, updatedAt: Date.now() });
    logger.info('Deliverable updated', { id });
    return { id };
  },
});

const _deliverableEvaluate = mutation({
  args: {
    organizationId: v.string(),
    subjectType: subjectTypeValidator,
    subjectId: v.string(),
    variables: v.any(),
    changedFields: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['deliverable']);
    const results: Array<{
      deliverableId: string;
      ready: boolean;
      missingCards: string[];
      evaluationId?: string;
    }> = [];

    const deliverables = await ctx.db
      .query('deliverables')
      .withIndex('by_subject_type', (q) =>
        q.eq('organizationId', args.organizationId).eq('subjectType', args.subjectType)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    logger.info('Evaluating', { count: deliverables.length });

    for (const d of deliverables) {
      if (args.changedFields?.length) {
        const relevant = d.requiredCards.some((c) => args.changedFields?.includes(c));
        if (!relevant) continue;
      }

      const missing: string[] = [];
      for (const slug of d.requiredCards) {
        const val = args.variables?.[slug];
        if (val === undefined || val === null || val === '') missing.push(slug);
      }

      if (missing.length === 0) {
        const evalId = crypto.randomUUID();
        const scheduled = scheduleTime(d.conditions);
        await ctx.db.insert('evaluations', {
          id: evalId,
          deliverableId: d.id,
          organizationId: args.organizationId,
          context: {
            subjectType: args.subjectType,
            subjectId: args.subjectId,
            changedFields: args.changedFields,
          },
          variables: args.variables,
          status: 'pending',
          scheduledFor: scheduled,
          createdAt: Date.now(),
        });
        logger.info('Evaluation created', { evalId, deliverableId: d.id });
        results.push({ deliverableId: d.id, ready: true, missingCards: [], evaluationId: evalId });
      } else {
        results.push({ deliverableId: d.id, ready: false, missingCards: missing });
      }
    }
    return results;
  },
});

function scheduleTime(conditions?: { time?: { after: string }; dayOfWeek?: number[] }): number {
  if (!conditions?.time?.after) return Date.now();
  const [h, m] = conditions.time.after.split(':').map(Number);
  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(h, m, 0, 0);
  if (scheduled.getTime() <= now.getTime()) scheduled.setDate(scheduled.getDate() + 1);
  if (conditions.dayOfWeek?.length) {
    while (!conditions.dayOfWeek.includes(scheduled.getDay()))
      scheduled.setDate(scheduled.getDate() + 1);
  }
  return scheduled.getTime();
}

export const deliverable = {
  get: _deliverableGet,
  list: _deliverableList,
  create: _deliverableCreate,
  update: _deliverableUpdate,
  evaluate: _deliverableEvaluate,
};

// ============================================================================
// EVALUATION
// ============================================================================

const _evaluationGet = query({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('evaluations')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
  },
});

const _evaluationList = query({
  args: { organizationId: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { organizationId, limit = 50 }) => {
    return ctx.db
      .query('evaluations')
      .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .order('asc')
      .take(limit);
  },
});

const _evaluationStart = mutation({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    const logger = getLogger(['evaluation']);
    const e = await ctx.db
      .query('evaluations')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (!e) throw new Error(`Evaluation not found: ${id}`);
    if (e.status !== 'pending') throw new Error(`Evaluation not pending: ${id}`);
    await ctx.db.patch(e._id, { status: 'running' });
    logger.info('Evaluation started', { id });
    return { started: true };
  },
});

const _evaluationCancel = mutation({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    const logger = getLogger(['evaluation']);
    const e = await ctx.db
      .query('evaluations')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (e && e.status === 'pending') {
      await ctx.db.patch(e._id, {
        status: 'failed',
        result: { success: false, error: 'Cancelled' },
        completedAt: Date.now(),
      });
      logger.info('Evaluation cancelled', { id });
    }
    return { cancelled: true };
  },
});

const _evaluationComplete = mutation({
  args: { id: v.string(), result: resultValidator },
  returns: v.any(),
  handler: async (ctx, { id, result }) => {
    const logger = getLogger(['evaluation']);
    const e = await ctx.db
      .query('evaluations')
      .withIndex('by_uuid', (q) => q.eq('id', id))
      .unique();
    if (!e) throw new Error(`Evaluation not found: ${id}`);
    await ctx.db.patch(e._id, {
      status: result.success ? 'completed' : 'failed',
      result,
      completedAt: Date.now(),
    });
    logger.info('Evaluation completed', { id, success: result.success });
    return { completed: true };
  },
});

export const evaluation = {
  get: _evaluationGet,
  list: _evaluationList,
  start: _evaluationStart,
  cancel: _evaluationCancel,
  complete: _evaluationComplete,
};
