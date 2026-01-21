import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';
import type { BridgeComponentApi } from '$/server';
import { NotFoundError } from '$/server/errors';
import type { AnyMutationCtx, AnyQueryCtx, EvaluationOptions } from '$/shared';
import { evaluationDocValidator, resultValidator, type Evaluation } from '$/shared';

export function createEvaluationResource(
	component: BridgeComponentApi,
	options?: EvaluationOptions<Evaluation>
) {
	const hooks = options?.hooks;

	return {
		__resource: 'evaluation' as const,

		get: queryGeneric({
			args: { id: v.string() },
			returns: v.union(evaluationDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.evaluationGet, { id });
				if (doc && hooks?.evalRead) {
					await hooks.evalRead(ctx, doc.organizationId);
				}
				return doc;
			},
		}),

		list: queryGeneric({
			args: {
				organizationId: v.string(),
				limit: v.optional(v.number()),
			},
			returns: v.array(evaluationDocValidator),
			handler: async (ctx: AnyQueryCtx, args) => {
				if (hooks?.evalRead) {
					await hooks.evalRead(ctx, args.organizationId);
				}
				let docs = await ctx.runQuery(component.public.evaluationList, args);
				if (hooks?.transform) {
					docs = await hooks.transform(docs);
				}
				return docs;
			},
		}),

		start: mutationGeneric({
			args: { id: v.string() },
			returns: v.object({ started: v.boolean() }),
			handler: async (ctx: AnyMutationCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.evaluationGet, { id });
				if (!doc) throw new NotFoundError('Evaluation', id);
				if (hooks?.evalWrite) {
					await hooks.evalWrite(ctx, doc);
				}
				return ctx.runMutation(component.public.evaluationStart, { id });
			},
		}),

		cancel: mutationGeneric({
			args: { id: v.string() },
			returns: v.object({ cancelled: v.boolean() }),
			handler: async (ctx: AnyMutationCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.evaluationGet, { id });
				if (!doc) throw new NotFoundError('Evaluation', id);
				if (hooks?.evalWrite) {
					await hooks.evalWrite(ctx, doc);
				}
				return ctx.runMutation(component.public.evaluationCancel, { id });
			},
		}),

		complete: mutationGeneric({
			args: {
				id: v.string(),
				result: resultValidator,
			},
			returns: v.object({ completed: v.boolean() }),
			handler: async (ctx: AnyMutationCtx, args) => {
				const prev = await ctx.runQuery(component.public.evaluationGet, {
					id: args.id,
				});
				if (!prev) throw new NotFoundError('Evaluation', args.id);

				if (hooks?.evalWrite) {
					await hooks.evalWrite(ctx, prev);
				}

				const result = await ctx.runMutation(component.public.evaluationComplete, args);

				if (hooks?.onComplete) {
					const doc = await ctx.runQuery(component.public.evaluationGet, {
						id: args.id,
					});
					if (doc) await hooks.onComplete(ctx, doc);
				}

				return result;
			},
		}),
	};
}

export type EvaluationResource = ReturnType<typeof createEvaluationResource>;
