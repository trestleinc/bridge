import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';
import type { BridgeComponentApi } from '$/server';
import { NotFoundError } from '$/server/errors';
import type { AnyMutationCtx, AnyQueryCtx, ResourceOptions } from '$/shared';
import {
	deliverableDocValidator,
	deliverableStatusValidator,
	evaluateResultValidator,
	operationsValidator,
	operationValidator,
	scheduleValidator,
	type Deliverable,
	type DeliverableResult,
} from '$/shared';

export function createDeliverableResource(
	component: BridgeComponentApi,
	options?: ResourceOptions<Deliverable>
) {
	const hooks = options?.hooks;

	return {
		__resource: 'deliverable' as const,

		get: queryGeneric({
			args: { id: v.string() },
			returns: v.union(deliverableDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.deliverableGet, { id });
				if (doc && hooks?.evalRead) {
					await hooks.evalRead(ctx, doc.organizationId);
				}
				return doc;
			},
		}),

		list: queryGeneric({
			args: {
				organizationId: v.string(),
				subject: v.optional(v.string()),
				status: v.optional(deliverableStatusValidator),
				limit: v.optional(v.number()),
			},
			returns: v.array(deliverableDocValidator),
			handler: async (ctx: AnyQueryCtx, args) => {
				if (hooks?.evalRead) {
					await hooks.evalRead(ctx, args.organizationId);
				}
				let docs = await ctx.runQuery(component.public.deliverableList, args);
				if (hooks?.transform) {
					docs = await hooks.transform(docs);
				}
				return docs;
			},
		}),

		create: mutationGeneric({
			args: {
				id: v.string(),
				organizationId: v.string(),
				name: v.string(),
				description: v.optional(v.string()),
				subject: v.string(),
				operations: operationsValidator,
				schedule: v.optional(scheduleValidator),
			},
			returns: v.object({ id: v.string() }),
			handler: async (ctx: AnyMutationCtx, args) => {
				if (hooks?.evalWrite) {
					await hooks.evalWrite(ctx, args as Deliverable);
				}
				const result = await ctx.runMutation(component.public.deliverableCreate, args);
				if (hooks?.onInsert) {
					const doc = await ctx.runQuery(component.public.deliverableGet, {
						id: result.id,
					});
					if (doc) await hooks.onInsert(ctx, doc);
				}
				return result;
			},
		}),

		update: mutationGeneric({
			args: {
				id: v.string(),
				name: v.optional(v.string()),
				description: v.optional(v.string()),
				operations: v.optional(operationsValidator),
				status: v.optional(deliverableStatusValidator),
				schedule: v.optional(scheduleValidator),
			},
			returns: v.object({ id: v.string() }),
			handler: async (ctx: AnyMutationCtx, { id, ...updates }) => {
				const prev = await ctx.runQuery(component.public.deliverableGet, { id });
				if (!prev) throw new NotFoundError('Deliverable', id);

				if (hooks?.evalWrite) {
					await hooks.evalWrite(ctx, { ...prev, ...updates });
				}

				const result = await ctx.runMutation(component.public.deliverableUpdate, {
					id,
					...updates,
				});

				if (hooks?.onUpdate) {
					const doc = await ctx.runQuery(component.public.deliverableGet, { id });
					if (doc) await hooks.onUpdate(ctx, doc, prev);
				}
				return result;
			},
		}),

		evaluate: mutationGeneric({
			args: {
				organizationId: v.string(),
				subject: v.string(),
				subjectId: v.string(),
				operation: operationValidator,
				variables: v.record(v.string(), v.any()),
				mutated: v.optional(v.array(v.string())),
			},
			returns: v.array(evaluateResultValidator),
			handler: async (ctx: AnyMutationCtx, args) => {
				if (hooks?.evalWrite) {
					await hooks.evalWrite(ctx, { organizationId: args.organizationId } as Deliverable);
				}
				return ctx.runMutation(component.public.deliverableEvaluate, args) as Promise<
					DeliverableResult[]
				>;
			},
		}),
	};
}

export type DeliverableResource = ReturnType<typeof createDeliverableResource>;
