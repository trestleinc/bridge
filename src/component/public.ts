import { v } from 'convex/values';
import { nullable } from 'convex-helpers/validators';
import { mutation, query } from '$/component/_generated/server';
import { getLogger } from '$/component/logger';
import {
  cancelledResultValidator,
  cardDocValidator,
  completedResultValidator,
  deliverableDocValidator,
  deliverableStatusValidator,
  evaluateResultValidator,
  evaluationDocValidator,
  idResultValidator,
  operationValidator,
  operationsValidator,
  procedureCardValidator,
  procedureDocValidator,
  procedureSubjectValidator,
  removedResultValidator,
  resultValidator,
  scheduleValidator,
  securityValidator,
  sourceValidator,
  startedResultValidator,
  submitResultValidator,
  variantValidator,
  type VariantValue,
} from '$/shared/validators';

const _cardGet = query({
  args: { id: v.string() },
  returns: nullable(cardDocValidator),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('cards')
      .withIndex('by_uuid', q => q.eq('id', id))
      .unique();
  },
});

const _cardFind = query({
  args: { organizationId: v.string(), slug: v.string() },
  returns: nullable(cardDocValidator),
  handler: async (ctx, { organizationId, slug }) => {
    return ctx.db
      .query('cards')
      .withIndex('by_slug', q =>
        q.eq('organizationId', organizationId).eq('slug', slug),
      )
      .first();
  },
});

const _cardList = query({
  args: {
    organizationId: v.string(),
    subject: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(cardDocValidator),
  handler: async (ctx, { organizationId, subject, limit = 100 }) => {
    if (subject) {
      return ctx.db
        .query('cards')
        .withIndex('by_subject', q =>
          q.eq('organizationId', organizationId).eq('subject', subject),
        )
        .take(limit);
    }
    return ctx.db
      .query('cards')
      .withIndex('by_organization', q => q.eq('organizationId', organizationId))
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
    subject: v.string(),
    createdBy: v.string(),
  },
  returns: cardDocValidator,
  handler: async (ctx, args) => {
    const logger = getLogger(['card']);

    const existing = await ctx.db
      .query('cards')
      .withIndex('by_slug', q =>
        q.eq('organizationId', args.organizationId).eq('slug', args.slug),
      )
      .first();

    if (existing) {
      if (existing.variant !== args.variant) {
        throw new Error(
          `Card "${args.slug}" exists with variant "${existing.variant}", cannot change to "${args.variant}"`,
        );
      }
      logger.info('Card exists, returning', { slug: args.slug });
      return existing;
    }

    const id = crypto.randomUUID();
    const card = { id, ...args, createdAt: Date.now() };
    const _id = await ctx.db.insert('cards', card);
    const created = await ctx.db.get(_id);
    if (!created) throw new Error('Failed to create card');
    logger.info('Card created', { id, slug: args.slug });
    return created;
  },
});

export const cardGet = _cardGet;
export const cardFind = _cardFind;
export const cardList = _cardList;
export const cardCreate = _cardCreate;

const _procedureGet = query({
  args: { id: v.string() },
  returns: nullable(procedureDocValidator),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('procedures')
      .withIndex('by_uuid', q => q.eq('id', id))
      .unique();
  },
});

const _procedureList = query({
  args: {
    organizationId: v.string(),
    source: v.optional(sourceValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(procedureDocValidator),
  handler: async (ctx, { organizationId, source, limit = 50 }) => {
    if (source) {
      return ctx.db
        .query('procedures')
        .withIndex('by_source', q =>
          q.eq('organizationId', organizationId).eq('source', source),
        )
        .order('desc')
        .take(limit);
    }
    return ctx.db
      .query('procedures')
      .withIndex('by_organization', q => q.eq('organizationId', organizationId))
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
    subject: v.optional(procedureSubjectValidator),
    cards: v.array(procedureCardValidator),
  },
  returns: idResultValidator,
  handler: async (ctx, args) => {
    const logger = getLogger(['procedure']);
    const now = Date.now();

    for (const c of args.cards) {
      const card = await ctx.db
        .query('cards')
        .withIndex('by_uuid', q => q.eq('id', c.cardId))
        .unique();

      if (!card) {
        throw new Error(`Card not found: ${c.cardId}`);
      }
    }

    await ctx.db.insert('procedures', {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
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
  returns: idResultValidator,
  handler: async (ctx, { id, ...updates }) => {
    const logger = getLogger(['procedure']);
    const existing = await ctx.db
      .query('procedures')
      .withIndex('by_uuid', q => q.eq('id', id))
      .unique();
    if (!existing) throw new Error(`Procedure not found: ${id}`);

    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) clean[k] = val;
    }

    await ctx.db.patch(existing._id, { ...clean, updatedAt: Date.now() });
    logger.info('Procedure updated', { id });
    return { id };
  },
});

const _procedureRemove = mutation({
  args: { id: v.string() },
  returns: removedResultValidator,
  handler: async (ctx, { id }) => {
    const logger = getLogger(['procedure']);
    const proc = await ctx.db
      .query('procedures')
      .withIndex('by_uuid', q => q.eq('id', id))
      .unique();
    if (proc) {
      await ctx.db.delete(proc._id);
      logger.info('Procedure removed', { id });
    }
    return { removed: true };
  },
});

const _procedureSubmit = mutation({
  args: {
    procedureId: v.string(),
    organizationId: v.string(),
    subject: v.string(),
    subjectId: v.string(),
    values: v.record(v.string(), v.any()),
  },
  returns: submitResultValidator,
  handler: async (ctx, args) => {
    const logger = getLogger(['procedure', 'submit']);

    const proc = await ctx.db
      .query('procedures')
      .withIndex('by_uuid', q => q.eq('id', args.procedureId))
      .unique();

    if (!proc) {
      return {
        success: false,
        errors: [
          {
            field: 'procedureId',
            message: `Procedure not found: ${args.procedureId}`,
          },
        ],
        validated: [],
      };
    }

    const errors: { field: string; message: string }[] = [];
    const validated: string[] = [];

    for (const ref of proc.cards) {
      const card = await ctx.db
        .query('cards')
        .withIndex('by_uuid', q => q.eq('id', ref.cardId))
        .unique();

      if (!card) {
        errors.push({
          field: ref.cardId,
          message: `Card not found: ${ref.cardId}`,
        });
        continue;
      }

      const value = args.values?.[card.slug];

      if (
        ref.required &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push({ field: card.slug, message: `Required field is missing` });
        continue;
      }

      if (value === undefined || value === null || value === '') {
        continue;
      }

      const variantError = validateVariant(card.variant, value);
      if (variantError) {
        errors.push({ field: card.slug, message: variantError });
        continue;
      }

      validated.push(card.slug);
    }

    if (errors.length > 0) {
      logger.warn('Validation failed', {
        procedureId: args.procedureId,
        errors,
      });
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

function validateVariant(variant: VariantValue, value: unknown): string | null {
  switch (variant) {
    case 'STRING':
    case 'TEXT':
      if (typeof value !== 'string')
        return `Expected string, got ${typeof value}`;
      break;
    case 'NUMBER':
      if (typeof value !== 'number')
        return `Expected number, got ${typeof value}`;
      break;
    case 'BOOLEAN':
      if (typeof value !== 'boolean')
        return `Expected boolean, got ${typeof value}`;
      break;
    case 'DATE':
      if (typeof value !== 'string' && typeof value !== 'number')
        return `Expected date string or timestamp, got ${typeof value}`;
      break;
    case 'EMAIL':
      if (typeof value !== 'string' || !value.includes('@'))
        return `Expected valid email address`;
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
      if (typeof value !== 'object' || value === null)
        return `Expected address object`;
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

export const procedureGet = _procedureGet;
export const procedureList = _procedureList;
export const procedureCreate = _procedureCreate;
export const procedureUpdate = _procedureUpdate;
export const procedureRemove = _procedureRemove;
export const procedureSubmit = _procedureSubmit;

const _deliverableGet = query({
  args: { id: v.string() },
  returns: nullable(deliverableDocValidator),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('deliverables')
      .withIndex('by_uuid', q => q.eq('id', id))
      .unique();
  },
});

const _deliverableList = query({
  args: {
    organizationId: v.string(),
    subject: v.optional(v.string()),
    status: v.optional(deliverableStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(deliverableDocValidator),
  handler: async (ctx, { organizationId, subject, status, limit = 50 }) => {
    const results = subject
      ? await ctx.db
          .query('deliverables')
          .withIndex('by_subject', q =>
            q.eq('organizationId', organizationId).eq('subject', subject),
          )
          .order('desc')
          .take(limit)
      : await ctx.db
          .query('deliverables')
          .withIndex('by_organization', q =>
            q.eq('organizationId', organizationId),
          )
          .order('desc')
          .take(limit);
    return status ? results.filter(d => d.status === status) : results;
  },
});

const _deliverableCreate = mutation({
  args: {
    id: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    subject: v.string(),
    operations: operationsValidator,
    schedule: v.optional(scheduleValidator),
  },
  returns: idResultValidator,
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
    operations: v.optional(operationsValidator),
    status: v.optional(deliverableStatusValidator),
    schedule: v.optional(scheduleValidator),
  },
  returns: idResultValidator,
  handler: async (ctx, { id, ...updates }) => {
    const logger = getLogger(['deliverable']);
    const existing = await ctx.db
      .query('deliverables')
      .withIndex('by_uuid', q => q.eq('id', id))
      .unique();
    if (!existing) throw new Error(`Deliverable not found: ${id}`);

    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) clean[k] = val;
    }

    await ctx.db.patch(existing._id, { ...clean, updatedAt: Date.now() });
    logger.info('Deliverable updated', { id });
    return { id };
  },
});

const _deliverableEvaluate = mutation({
  args: {
    organizationId: v.string(),
    subject: v.string(),
    subjectId: v.string(),
    operation: operationValidator,
    variables: v.record(v.string(), v.any()),
    mutated: v.optional(v.array(v.string())),
  },
  returns: v.array(evaluateResultValidator),
  handler: async (ctx, args) => {
    const logger = getLogger(['deliverable']);
    const results: {
      deliverableId: string;
      ready: boolean;
      unmet: {
        cardIds: string[];
        deliverableIds: string[];
      };
      evaluationId?: string;
    }[] = [];

    const deliverables = await ctx.db
      .query('deliverables')
      .withIndex('by_subject', q =>
        q.eq('organizationId', args.organizationId).eq('subject', args.subject),
      )
      .filter(q => q.eq(q.field('status'), 'active'))
      .collect();

    logger.info('Evaluating', {
      count: deliverables.length,
      operation: args.operation,
    });

    for (const d of deliverables) {
      const opConfig = d.operations[args.operation as keyof typeof d.operations];
      if (!opConfig) {
        continue;
      }

      if (args.mutated?.length) {
        const relevant = opConfig.required.cardIds.some((c: string) =>
          args.mutated?.includes(c),
        );
        if (!relevant) continue;
      }

      const unmetCardIds: string[] = [];
      for (const cardId of opConfig.required.cardIds) {
        const val = args.variables?.[cardId];
        if (val === undefined || val === null || val === '')
          unmetCardIds.push(cardId);
      }

      const unmetDeliverableIds: string[] = [];
      for (const deliverableId of opConfig.required.deliverableIds) {
        const completedEval = await ctx.db
          .query('evaluations')
          .withIndex('by_deliverable', q => q.eq('deliverableId', deliverableId))
          .filter(q =>
            q.and(
              q.eq(q.field('context.subjectId'), args.subjectId),
              q.eq(q.field('status'), 'completed'),
            ),
          )
          .first();

        if (!completedEval) {
          unmetDeliverableIds.push(deliverableId);
        }
      }

      const ready =
        unmetCardIds.length === 0 && unmetDeliverableIds.length === 0;

      if (ready) {
        const evalId = crypto.randomUUID();
        await ctx.db.insert('evaluations', {
          id: evalId,
          deliverableId: d.id,
          organizationId: args.organizationId,
          operation: args.operation,
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
        logger.info('Evaluation created', {
          evalId,
          deliverableId: d.id,
          operation: args.operation,
        });
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

export const deliverableGet = _deliverableGet;
export const deliverableList = _deliverableList;
export const deliverableCreate = _deliverableCreate;
export const deliverableUpdate = _deliverableUpdate;
export const deliverableEvaluate = _deliverableEvaluate;

const _evaluationGet = query({
  args: { id: v.string() },
  returns: nullable(evaluationDocValidator),
  handler: async (ctx, { id }) => {
    return ctx.db
      .query('evaluations')
      .withIndex('by_uuid', q => q.eq('id', id))
      .unique();
  },
});

const _evaluationList = query({
  args: { organizationId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(evaluationDocValidator),
  handler: async (ctx, { organizationId, limit = 50 }) => {
    return ctx.db
      .query('evaluations')
      .withIndex('by_organization', q => q.eq('organizationId', organizationId))
      .filter(q => q.eq(q.field('status'), 'pending'))
      .order('asc')
      .take(limit);
  },
});

const _evaluationStart = mutation({
  args: { id: v.string() },
  returns: startedResultValidator,
  handler: async (ctx, { id }) => {
    const logger = getLogger(['evaluation']);
    const e = await ctx.db
      .query('evaluations')
      .withIndex('by_uuid', q => q.eq('id', id))
      .unique();
    if (!e) throw new Error(`Evaluation not found: ${id}`);
    if (e.status !== 'pending') throw new Error(`Evaluation not pending: ${id}`);
    await ctx.db.patch(e._id, { status: 'running', started: Date.now() });
    logger.info('Evaluation started', { id });
    return { started: true };
  },
});

const _evaluationCancel = mutation({
  args: { id: v.string() },
  returns: cancelledResultValidator,
  handler: async (ctx, { id }) => {
    const logger = getLogger(['evaluation']);
    const e = await ctx.db
      .query('evaluations')
      .withIndex('by_uuid', q => q.eq('id', id))
      .unique();
    if (e?.status === 'pending') {
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
  returns: completedResultValidator,
  handler: async (ctx, { id, result }) => {
    const logger = getLogger(['evaluation']);
    const e = await ctx.db
      .query('evaluations')
      .withIndex('by_uuid', q => q.eq('id', id))
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

export const evaluationGet = _evaluationGet;
export const evaluationList = _evaluationList;
export const evaluationStart = _evaluationStart;
export const evaluationCancel = _evaluationCancel;
export const evaluationComplete = _evaluationComplete;
