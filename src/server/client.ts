/**
 * Bridge Client API Factory
 *
 * Provides a clean, type-safe API for host applications to expose Bridge functionality.
 * Follows standard Convex component patterns (like @convex-dev/workflow, @convex-dev/r2).
 *
 * @example
 * ```typescript
 * // ledger/convex/bridge.ts
 * import { clientApi } from "@trestleinc/bridge/server";
 * import { components } from "./_generated/api";
 *
 * export const {
 *   cardGet,
 *   cardFind,
 *   cardList,
 *   cardCreate,
 *   procedureGet,
 *   procedureList,
 *   procedureCreate,
 *   procedureUpdate,
 *   procedureRemove,
 *   procedureSubmit,
 *   deliverableGet,
 *   deliverableList,
 *   deliverableCreate,
 *   deliverableUpdate,
 *   deliverableEvaluate,
 *   evaluationGet,
 *   evaluationList,
 *   evaluationStart,
 *   evaluationCancel,
 *   evaluationComplete,
 *   evaluate,
 * } = clientApi(components.bridge, {
 *   verifyAccess: verifyOrgAccess,
 *   subjects: {
 *     client: "clients",
 *     account: { table: "accounts", parents: [{ field: "clientId", subject: "client" }] },
 *   },
 * });
 * ```
 */

import {
	type GenericDataModel,
	type GenericMutationCtx,
	type GenericQueryCtx,
	queryGeneric,
	mutationGeneric,
} from "convex/server";
import { v } from "convex/values";
import {
	cardDocValidator,
	procedureDocValidator,
	deliverableDocValidator,
	evaluationDocValidator,
	cardTypeValidator,
	securityLevelValidator,
	procedureTypeValidator,
	operationValidator,
	procedureCardValidator,
	operationsValidator,
	scheduleValidator,
	deliverableStatusValidator,
	submitResultValidator,
	evaluateResultValidator,
	idResultValidator,
	removedResultValidator,
	startedResultValidator,
	cancelledResultValidator,
	completedResultValidator,
	resultValidator,
	procedureSubjectValidator,
} from "$/shared/validators";
import type { BridgeComponentApi } from "./bridge";
import type { SubjectConfig } from "$/shared/validators";

type AnyQueryCtx = GenericQueryCtx<GenericDataModel>;
type AnyMutationCtx = GenericMutationCtx<GenericDataModel>;
type AnyCtx = AnyQueryCtx | AnyMutationCtx;

// ============================================================================
// Types
// ============================================================================

export type BridgeClientOptions = {
	/**
	 * Verify user has access to the organization.
	 * Called before any operation with the organizationId from args or document.
	 * Throw an error to deny access.
	 */
	verifyAccess?: (ctx: AnyCtx, organizationId: string) => Promise<void>;

	/**
	 * Subject table mappings for variable resolution.
	 * Maps subject names to table names or full config with parent relations.
	 *
	 * @example
	 * ```typescript
	 * {
	 *   client: "clients",
	 *   account: { table: "accounts", parents: [{ field: "clientId", subject: "client" }] },
	 * }
	 * ```
	 */
	subjects?: Record<string, string | SubjectConfig>;

	/**
	 * Optional action to execute when evaluations become ready.
	 * Called after deliverableEvaluate creates new evaluations.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	executor?: any;
};

// ============================================================================
// Factory
// ============================================================================

export function clientApi(component: BridgeComponentApi, options?: BridgeClientOptions) {
	const verify = options?.verifyAccess ?? (() => Promise.resolve());
	const executor = options?.executor;

	return {
		// ========================================================================
		// Card Queries
		// ========================================================================

		cardGet: queryGeneric({
			args: { id: v.string() },
			returns: v.union(cardDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.cardGet, { id });
				if (doc) await verify(ctx, doc.organizationId);
				return doc;
			},
		}),

		cardFind: queryGeneric({
			args: {
				organizationId: v.string(),
				slug: v.string(),
			},
			returns: v.union(cardDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, args) => {
				await verify(ctx, args.organizationId);
				return ctx.runQuery(component.public.cardFind, args);
			},
		}),

		cardList: queryGeneric({
			args: {
				organizationId: v.string(),
				subject: v.optional(v.string()),
				limit: v.optional(v.number()),
			},
			returns: v.array(cardDocValidator),
			handler: async (ctx: AnyQueryCtx, args) => {
				await verify(ctx, args.organizationId);
				return ctx.runQuery(component.public.cardList, args);
			},
		}),

		// ========================================================================
		// Card Mutations
		// ========================================================================

		cardCreate: mutationGeneric({
			args: {
				organizationId: v.string(),
				slug: v.string(),
				label: v.string(),
				cardType: cardTypeValidator,
				securityLevel: securityLevelValidator,
				subject: v.string(),
				createdBy: v.string(),
			},
			returns: idResultValidator,
			handler: async (ctx: AnyMutationCtx, args) => {
				await verify(ctx, args.organizationId);
				const doc = await ctx.runMutation(component.public.cardCreate, args);
				return { id: doc.id };
			},
		}),

		// ========================================================================
		// Procedure Queries
		// ========================================================================

		procedureGet: queryGeneric({
			args: { id: v.string() },
			returns: v.union(procedureDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.procedureGet, { id });
				if (doc) await verify(ctx, doc.organizationId);
				return doc;
			},
		}),

		procedureList: queryGeneric({
			args: {
				organizationId: v.string(),
				procedureType: v.optional(procedureTypeValidator),
				limit: v.optional(v.number()),
			},
			returns: v.array(procedureDocValidator),
			handler: async (ctx: AnyQueryCtx, args) => {
				await verify(ctx, args.organizationId);
				return ctx.runQuery(component.public.procedureList, args);
			},
		}),

		// ========================================================================
		// Procedure Mutations
		// ========================================================================

		procedureCreate: mutationGeneric({
			args: {
				id: v.string(),
				organizationId: v.string(),
				name: v.string(),
				description: v.optional(v.string()),
				procedureType: procedureTypeValidator,
				subject: v.optional(procedureSubjectValidator),
				cards: v.array(procedureCardValidator),
			},
			returns: idResultValidator,
			handler: async (ctx: AnyMutationCtx, args) => {
				await verify(ctx, args.organizationId);
				const doc = await ctx.runMutation(component.public.procedureCreate, args);
				return { id: doc.id };
			},
		}),

		procedureUpdate: mutationGeneric({
			args: {
				id: v.string(),
				name: v.optional(v.string()),
				description: v.optional(v.string()),
				procedureType: v.optional(procedureTypeValidator),
				cards: v.optional(v.array(procedureCardValidator)),
			},
			returns: idResultValidator,
			handler: async (ctx: AnyMutationCtx, { id, ...updates }) => {
				const doc = await ctx.runQuery(component.public.procedureGet, { id });
				if (!doc) throw new Error(`Procedure not found: ${id}`);
				await verify(ctx, doc.organizationId);
				await ctx.runMutation(component.public.procedureUpdate, { id, ...updates });
				return { id };
			},
		}),

		procedureRemove: mutationGeneric({
			args: { id: v.string() },
			returns: removedResultValidator,
			handler: async (ctx: AnyMutationCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.procedureGet, { id });
				if (!doc) throw new Error(`Procedure not found: ${id}`);
				await verify(ctx, doc.organizationId);
				await ctx.runMutation(component.public.procedureRemove, { id });
				return { removed: true };
			},
		}),

		procedureSubmit: mutationGeneric({
			args: {
				procedureId: v.string(),
				organizationId: v.string(),
				subject: v.string(),
				subjectId: v.string(),
				values: v.record(v.string(), v.any()),
			},
			returns: submitResultValidator,
			handler: async (ctx: AnyMutationCtx, args) => {
				await verify(ctx, args.organizationId);
				return ctx.runMutation(component.public.procedureSubmit, args);
			},
		}),

		// ========================================================================
		// Deliverable Queries
		// ========================================================================

		deliverableGet: queryGeneric({
			args: { id: v.string() },
			returns: v.union(deliverableDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.deliverableGet, { id });
				if (doc) await verify(ctx, doc.organizationId);
				return doc;
			},
		}),

		deliverableList: queryGeneric({
			args: {
				organizationId: v.string(),
				subject: v.optional(v.string()),
				limit: v.optional(v.number()),
			},
			returns: v.array(deliverableDocValidator),
			handler: async (ctx: AnyQueryCtx, args) => {
				await verify(ctx, args.organizationId);
				return ctx.runQuery(component.public.deliverableList, args);
			},
		}),

		// ========================================================================
		// Deliverable Mutations
		// ========================================================================

		deliverableCreate: mutationGeneric({
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
			handler: async (ctx: AnyMutationCtx, args) => {
				await verify(ctx, args.organizationId);
				const doc = await ctx.runMutation(component.public.deliverableCreate, args);
				return { id: doc.id };
			},
		}),

		deliverableUpdate: mutationGeneric({
			args: {
				id: v.string(),
				name: v.optional(v.string()),
				description: v.optional(v.string()),
				operations: v.optional(operationsValidator),
				status: v.optional(deliverableStatusValidator),
				schedule: v.optional(scheduleValidator),
			},
			returns: idResultValidator,
			handler: async (ctx: AnyMutationCtx, { id, ...updates }) => {
				const doc = await ctx.runQuery(component.public.deliverableGet, { id });
				if (!doc) throw new Error(`Deliverable not found: ${id}`);
				await verify(ctx, doc.organizationId);
				await ctx.runMutation(component.public.deliverableUpdate, { id, ...updates });
				return { id };
			},
		}),

		deliverableEvaluate: mutationGeneric({
			args: {
				organizationId: v.string(),
				subject: v.string(),
				subjectId: v.string(),
				operation: operationValidator,
				variables: v.optional(v.record(v.string(), v.any())),
				mutated: v.optional(v.array(v.string())),
			},
			returns: v.array(evaluateResultValidator),
			handler: async (ctx: AnyMutationCtx, args) => {
				await verify(ctx, args.organizationId);
				const results = await ctx.runMutation(component.public.deliverableEvaluate, {
					...args,
					variables: args.variables ?? {},
				});

				// Schedule executor for each ready evaluation
				if (executor) {
					for (const result of results) {
						if (result.status === "ready") {
							await ctx.scheduler.runAfter(0, executor, { evaluationId: result.id });
						}
					}
				}

				return results;
			},
		}),

		// ========================================================================
		// Evaluation Queries
		// ========================================================================

		evaluationGet: queryGeneric({
			args: { id: v.string() },
			returns: v.union(evaluationDocValidator, v.null()),
			handler: async (ctx: AnyQueryCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.evaluationGet, { id });
				if (doc) await verify(ctx, doc.organizationId);
				return doc;
			},
		}),

		evaluationList: queryGeneric({
			args: {
				organizationId: v.string(),
				deliverableId: v.optional(v.string()),
				status: v.optional(v.string()),
				limit: v.optional(v.number()),
			},
			returns: v.array(evaluationDocValidator),
			handler: async (ctx: AnyQueryCtx, args) => {
				await verify(ctx, args.organizationId);
				return ctx.runQuery(component.public.evaluationList, args);
			},
		}),

		// ========================================================================
		// Evaluation Mutations
		// ========================================================================

		evaluationStart: mutationGeneric({
			args: { id: v.string() },
			returns: startedResultValidator,
			handler: async (ctx: AnyMutationCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.evaluationGet, { id });
				if (!doc) throw new Error(`Evaluation not found: ${id}`);
				await verify(ctx, doc.organizationId);
				await ctx.runMutation(component.public.evaluationStart, { id });
				return { started: true };
			},
		}),

		evaluationCancel: mutationGeneric({
			args: { id: v.string() },
			returns: cancelledResultValidator,
			handler: async (ctx: AnyMutationCtx, { id }) => {
				const doc = await ctx.runQuery(component.public.evaluationGet, { id });
				if (!doc) throw new Error(`Evaluation not found: ${id}`);
				await verify(ctx, doc.organizationId);
				await ctx.runMutation(component.public.evaluationCancel, { id });
				return { cancelled: true };
			},
		}),

		evaluationComplete: mutationGeneric({
			args: {
				id: v.string(),
				result: resultValidator,
			},
			returns: completedResultValidator,
			handler: async (ctx: AnyMutationCtx, { id, result }) => {
				const doc = await ctx.runQuery(component.public.evaluationGet, { id });
				if (!doc) throw new Error(`Evaluation not found: ${id}`);
				await verify(ctx, doc.organizationId);
				await ctx.runMutation(component.public.evaluationComplete, { id, result });
				return { completed: true };
			},
		}),

		// ========================================================================
		// Utilities
		// ========================================================================

		/**
		 * Triggers evaluation for a subject based on operation type.
		 * Finds all deliverables matching the subject/operation and checks readiness.
		 */
		evaluate: mutationGeneric({
			args: {
				organizationId: v.string(),
				subject: v.string(),
				subjectId: v.string(),
				operation: operationValidator,
				variables: v.optional(v.record(v.string(), v.any())),
				mutated: v.optional(v.array(v.string())),
			},
			returns: v.array(evaluateResultValidator),
			handler: async (ctx: AnyMutationCtx, args) => {
				await verify(ctx, args.organizationId);
				const results = await ctx.runMutation(component.public.deliverableEvaluate, {
					...args,
					variables: args.variables ?? {},
				});

				// Schedule executor for each ready evaluation
				if (executor) {
					for (const result of results) {
						if (result.status === "ready") {
							await ctx.scheduler.runAfter(0, executor, { evaluationId: result.id });
						}
					}
				}

				return results;
			},
		}),
	};
}
