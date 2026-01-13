import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { BridgeComponentApi } from "$/server/bridge";
import { NotFoundError } from "$/server/errors";
import type { AnyMutationCtx, AnyQueryCtx, ResourceOptions } from "$/server/resource";
import {
	operationValidator,
	procedureCardValidator,
	procedureDocValidator,
	procedureTypeValidator,
	submitResultValidator,
	type Procedure,
	type SubmissionResult,
} from "$/shared/validators";

export function createProcedureResource(
	component: BridgeComponentApi,
	options?: ResourceOptions<Procedure>,
) {
	const hooks = options?.hooks;

	return {
		__resource: "procedure" as const,

		get: queryGeneric({
			args: { id: v.string() },
			returns: v.union(procedureDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.procedureGet, { id });
				if (doc && hooks?.evalRead) {
					await hooks.evalRead(ctx, doc.organizationId);
				}
				return doc;
			},
		}),

		list: queryGeneric({
			args: {
				organizationId: v.string(),
				procedureType: v.optional(procedureTypeValidator),
				limit: v.optional(v.number()),
			},
			returns: v.array(procedureDocValidator),
			handler: async (ctx: AnyQueryCtx, args) => {
				if (hooks?.evalRead) {
					await hooks.evalRead(ctx, args.organizationId);
				}
				let docs = await ctx.runQuery(component.public.procedureList, args);
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
				procedureType: procedureTypeValidator,
				subject: v.optional(v.object({ type: v.string(), operation: operationValidator })),
				cards: v.array(procedureCardValidator),
			},
			returns: v.object({ id: v.string() }),
			handler: async (ctx: AnyMutationCtx, args) => {
				if (hooks?.evalWrite) {
					await hooks.evalWrite(ctx, args as Procedure);
				}
				const result = await ctx.runMutation(component.public.procedureCreate, args);
				if (hooks?.onInsert) {
					const doc = await ctx.runQuery(component.public.procedureGet, {
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
				procedureType: v.optional(procedureTypeValidator),
				cards: v.optional(v.array(procedureCardValidator)),
			},
			returns: v.object({ id: v.string() }),
			handler: async (ctx: AnyMutationCtx, { id, ...updates }) => {
				const prev = await ctx.runQuery(component.public.procedureGet, { id });
				if (!prev) throw new NotFoundError("Procedure", id);

				if (hooks?.evalWrite) {
					await hooks.evalWrite(ctx, { ...prev, ...updates });
				}

				const result = await ctx.runMutation(component.public.procedureUpdate, {
					id,
					...updates,
				});

				if (hooks?.onUpdate) {
					const doc = await ctx.runQuery(component.public.procedureGet, { id });
					if (doc) await hooks.onUpdate(ctx, doc, prev);
				}
				return result;
			},
		}),

		remove: mutationGeneric({
			args: { id: v.string() },
			returns: v.object({ removed: v.boolean() }),
			handler: async (ctx: AnyMutationCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.procedureGet, { id });
				if (!doc) throw new NotFoundError("Procedure", id);

				if (hooks?.evalRemove) {
					await hooks.evalRemove(ctx, doc);
				}
				const result = await ctx.runMutation(component.public.procedureRemove, {
					id,
				});
				if (hooks?.onRemove) {
					await hooks.onRemove(ctx, doc);
				}
				return result;
			},
		}),

		submit: mutationGeneric({
			args: {
				procedureId: v.string(),
				organizationId: v.string(),
				subject: v.string(),
				subjectId: v.string(),
				values: v.record(v.string(), v.any()),
			},
			returns: submitResultValidator,
			handler: async (ctx: AnyMutationCtx, args) => {
				if (hooks?.evalWrite) {
					const proc = await ctx.runQuery(component.public.procedureGet, {
						id: args.procedureId,
					});
					if (proc) await hooks.evalWrite(ctx, proc);
				}
				return ctx.runMutation(component.public.procedureSubmit, args) as Promise<SubmissionResult>;
			},
		}),
	};
}

export type ProcedureResource = ReturnType<typeof createProcedureResource>;
