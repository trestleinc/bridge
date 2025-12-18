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

const subjectValidator = v.union(
  v.literal('beneficiary'),
  v.literal('event'),
  v.literal('eventInstance')
);

const operationValidator = v.union(v.literal('create'), v.literal('update'));

const procedureCardValidator = v.object({
  cardId: v.string(),
  required: v.boolean(),
  writeTo: v.object({ path: v.string() }),
});

const scheduleValidator = v.object({
  at: v.optional(v.number()),
  cron: v.optional(v.string()),
});

const requiredValidator = v.object({
  cardIds: v.array(v.string()),
  deliverableIds: v.array(v.string()),
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
    subject: v.optional(subjectValidator),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { organizationId, subject, limit = 100 }) => {
    if (subject) {
      return ctx.db
        .query('cards')
        .withIndex('by_subject', (q) =>
          q.eq('organizationId', organizationId).eq('subject', subject)
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
    variant: variantValidator,
    security: securityValidator,
    subject: subjectValidator,
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
      if (existing.variant !== args.variant) {
        throw new Error(
          `Card "${args.slug}" exists with variant "${existing.variant}", cannot change to "${args.variant}"`
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
    source: v.optional(sourceValidator),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { organizationId, source, limit = 50 }) => {
    if (source) {
      return ctx.db
        .query('procedures')
        .withIndex('by_source', (q) => q.eq('organizationId', organizationId).eq('source', source))
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
    source: sourceValidator,
    subject: v.optional(v.object({ type: subjectValidator, operation: operationValidator })),
    cards: v.array(procedureCardValidator),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['procedure']);
    const now = Date.now();

    // Validate that all referenced cards exist
    for (const c of args.cards) {
      const card = await ctx.db
        .query('cards')
        .withIndex('by_uuid', (q) => q.eq('id', c.cardId))
        .unique();

      if (!card) {
        throw new Error(`Card not found: ${c.cardId}`);
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
    source: v.optional(sourceValidator),
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

const fieldErrorValidator = v.object({
  field: v.string(),
  message: v.string(),
});

const _procedureSubmit = mutation({
  args: {
    procedureId: v.string(),
    organizationId: v.string(),
    subject: subjectValidator,
    subjectId: v.string(),
    values: v.any(),
  },
  returns: v.object({
    success: v.boolean(),
    errors: v.optional(v.array(fieldErrorValidator)),
    validated: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const logger = getLogger(['procedure', 'submit']);

    // Get the procedure
    const proc = await ctx.db
      .query('procedures')
      .withIndex('by_uuid', (q) => q.eq('id', args.procedureId))
      .unique();

    if (!proc) {
      return {
        success: false,
        errors: [{ field: 'procedureId', message: `Procedure not found: ${args.procedureId}` }],
        validated: [],
      };
    }

    // Validate card values against procedure schema
    const errors: Array<{ field: string; message: string }> = [];
    const validated: string[] = [];

    for (const ref of proc.cards) {
      // Look up the card definition
      const card = await ctx.db
        .query('cards')
        .withIndex('by_uuid', (q) => q.eq('id', ref.cardId))
        .unique();

      if (!card) {
        errors.push({ field: ref.cardId, message: `Card not found: ${ref.cardId}` });
        continue;
      }

      const value = args.values?.[card.slug];

      // Check required fields
      if (ref.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: card.slug, message: `Required field is missing` });
        continue;
      }

      // Skip validation for optional empty fields
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Variant validation
      const variantError = validateVariant(card.variant, value);
      if (variantError) {
        errors.push({ field: card.slug, message: variantError });
        continue;
      }

      validated.push(card.slug);
    }

    if (errors.length > 0) {
      logger.warn('Validation failed', { procedureId: args.procedureId, errors });
      return { success: false, errors, validated };
    }

    logger.info('Submission validated', {
      procedureId: args.procedureId,
      subjectId: args.subjectId,
      validated,
    });

    return { success: true, validated };
  },
});

/**
 * Validate a value against a card variant.
 */
function validateVariant(
  variant:
    | 'STRING'
    | 'TEXT'
    | 'NUMBER'
    | 'BOOLEAN'
    | 'DATE'
    | 'EMAIL'
    | 'URL'
    | 'PHONE'
    | 'SSN'
    | 'ADDRESS'
    | 'SUBJECT'
    | 'ARRAY',
  value: unknown
): string | null {
  switch (variant) {
    case 'STRING':
    case 'TEXT':
      if (typeof value !== 'string') return `Expected string, got ${typeof value}`;
      break;
    case 'NUMBER':
      if (typeof value !== 'number') return `Expected number, got ${typeof value}`;
      break;
    case 'BOOLEAN':
      if (typeof value !== 'boolean') return `Expected boolean, got ${typeof value}`;
      break;
    case 'DATE':
      if (typeof value !== 'string' && typeof value !== 'number')
        return `Expected date string or timestamp, got ${typeof value}`;
      break;
    case 'EMAIL':
      if (typeof value !== 'string' || !value.includes('@')) return `Expected valid email address`;
      break;
    case 'URL':
      if (typeof value !== 'string') return `Expected URL string`;
      try {
        new URL(value);
      } catch {
        return `Invalid URL format`;
      }
      break;
    case 'PHONE':
      if (typeof value !== 'string') return `Expected phone string`;
      break;
    case 'SSN':
      if (typeof value !== 'string') return `Expected SSN string`;
      break;
    case 'ADDRESS':
      if (typeof value !== 'object' || value === null) return `Expected address object`;
      break;
    case 'SUBJECT':
      if (typeof value !== 'string') return `Expected subject ID string`;
      break;
    case 'ARRAY':
      if (!Array.isArray(value)) return `Expected array, got ${typeof value}`;
      break;
  }
  return null;
}

export const procedure = {
  get: _procedureGet,
  list: _procedureList,
  create: _procedureCreate,
  update: _procedureUpdate,
  remove: _procedureRemove,
  submit: _procedureSubmit,
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
    subject: v.optional(subjectValidator),
    status: v.optional(deliverableStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { organizationId, subject, status, limit = 50 }) => {
    const results = subject
      ? await ctx.db
          .query('deliverables')
          .withIndex('by_subject', (q) =>
            q.eq('organizationId', organizationId).eq('subject', subject)
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
    subject: subjectValidator,
    required: requiredValidator,
    callbackUrl: v.optional(v.string()),
    callbackAction: v.optional(v.string()),
    schedule: v.optional(scheduleValidator),
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
    required: v.optional(requiredValidator),
    status: v.optional(deliverableStatusValidator),
    schedule: v.optional(scheduleValidator),
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
    subject: subjectValidator,
    subjectId: v.string(),
    variables: v.any(),
    mutated: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logger = getLogger(['deliverable']);
    const results: Array<{
      deliverableId: string;
      ready: boolean;
      unmet: {
        cardIds: string[];
        deliverableIds: string[];
      };
      evaluationId?: string;
    }> = [];

    const deliverables = await ctx.db
      .query('deliverables')
      .withIndex('by_subject', (q) =>
        q.eq('organizationId', args.organizationId).eq('subject', args.subject)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    logger.info('Evaluating', { count: deliverables.length });

    for (const d of deliverables) {
      if (args.mutated?.length) {
        const relevant = d.required.cardIds.some((c) => args.mutated?.includes(c));
        if (!relevant) continue;
      }

      // Check required cards
      const unmetCardIds: string[] = [];
      for (const cardId of d.required.cardIds) {
        const val = args.variables?.[cardId];
        if (val === undefined || val === null || val === '') unmetCardIds.push(cardId);
      }

      // Check required deliverables - look for completed evaluations for this subject
      const unmetDeliverableIds: string[] = [];
      for (const deliverableId of d.required.deliverableIds) {
        const completedEval = await ctx.db
          .query('evaluations')
          .withIndex('by_deliverable', (q) => q.eq('deliverableId', deliverableId))
          .filter((q) =>
            q.and(
              q.eq(q.field('context.subjectId'), args.subjectId),
              q.eq(q.field('status'), 'completed')
            )
          )
          .first();

        if (!completedEval) {
          unmetDeliverableIds.push(deliverableId);
        }
      }

      const ready = unmetCardIds.length === 0 && unmetDeliverableIds.length === 0;

      if (ready) {
        const evalId = crypto.randomUUID();
        await ctx.db.insert('evaluations', {
          id: evalId,
          deliverableId: d.id,
          organizationId: args.organizationId,
          context: {
            subject: args.subject,
            subjectId: args.subjectId,
            mutated: args.mutated,
          },
          variables: args.variables,
          status: 'pending',
          scheduledFor: d.schedule?.at,
          createdAt: Date.now(),
        });
        logger.info('Evaluation created', { evalId, deliverableId: d.id });
        results.push({
          deliverableId: d.id,
          ready: true,
          unmet: { cardIds: [], deliverableIds: [] },
          evaluationId: evalId,
        });
      } else {
        results.push({
          deliverableId: d.id,
          ready: false,
          unmet: { cardIds: unmetCardIds, deliverableIds: unmetDeliverableIds },
        });
      }
    }
    return results;
  },
});

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
