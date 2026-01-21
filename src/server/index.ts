/**
 * @trestleinc/bridge - Server exports
 *
 * Import from '@trestleinc/bridge/server' to use in Convex functions.
 */

import type {
	FunctionReference,
	GenericDataModel,
	GenericMutationCtx,
	GenericQueryCtx,
} from 'convex/server';
import type {
	AggregatedContext,
	CallbackHandler,
	Card,
	Deliverable,
	DeliverableResult,
	EvaluateTrigger,
	Evaluation,
	EvaluationOptions,
	ExecutionContext,
	ExecutionResult,
	Operation,
	Procedure,
	ResourceOptions,
	Subject,
	SubjectConfig,
	Submission,
	SubmissionResult,
} from '$/shared';
import {
	createCardResource,
	createDeliverableResource,
	createEvaluationResource,
	createProcedureResource,
} from '$/server/resources';

// ============================================================================
// Re-exports from shared
// ============================================================================

export type {
	AnyMutationCtx,
	AnyQueryCtx,
	EvaluationHooks,
	EvaluationOptions,
	ResourceHooks,
	ResourceOptions,
	LazyValue,
	LazyAsync,
} from '$/shared';

export { resolveLazy, resolveLazyAsync } from '$/shared';

// ============================================================================
// Re-exports from resources
// ============================================================================

export type {
	CardResource,
	DeliverableResource,
	EvaluationResource,
	ProcedureResource,
} from '$/server/resources';

// ============================================================================
// Re-exports from errors
// ============================================================================

export {
	AuthorizationError,
	BridgeError,
	ConflictError,
	NotFoundError,
	ValidationError,
} from '$/server/errors';

// ============================================================================
// Re-exports from triggers
// ============================================================================

export {
	createSubjectTrigger,
	createTriggers,
	type TriggerHandler,
	type SubjectsConfig,
} from '$/server/triggers';

// ============================================================================
// Resource Factory Exports
// ============================================================================

/**
 * Resource factories for advanced usage.
 *
 * @example
 * ```typescript
 * const cardResource = resource.card.create(component, { hooks: {...} });
 * ```
 */
export const resource = {
	card: {
		create: (component: BridgeComponentApi, options?: ResourceOptions<Card>) =>
			createCardResource(component, options),
	},
	procedure: {
		create: (component: BridgeComponentApi, options?: ResourceOptions<Procedure>) =>
			createProcedureResource(component, options),
	},
	deliverable: {
		create: (component: BridgeComponentApi, options?: ResourceOptions<Deliverable>) =>
			createDeliverableResource(component, options),
	},
	evaluation: {
		create: (component: BridgeComponentApi, options?: EvaluationOptions<Evaluation>) =>
			createEvaluationResource(component, options),
	},
} as const;

// ============================================================================
// Bridge Component API Type
// ============================================================================

export type BridgeComponentApi = {
	public: {
		cardGet: FunctionReference<'query', 'internal'>;
		cardFind: FunctionReference<'query', 'internal'>;
		cardList: FunctionReference<'query', 'internal'>;
		cardCreate: FunctionReference<'mutation', 'internal'>;
		procedureGet: FunctionReference<'query', 'internal'>;
		procedureList: FunctionReference<'query', 'internal'>;
		procedureCreate: FunctionReference<'mutation', 'internal'>;
		procedureUpdate: FunctionReference<'mutation', 'internal'>;
		procedureRemove: FunctionReference<'mutation', 'internal'>;
		procedureSubmit: FunctionReference<'mutation', 'internal'>;
		deliverableGet: FunctionReference<'query', 'internal'>;
		deliverableList: FunctionReference<'query', 'internal'>;
		deliverableCreate: FunctionReference<'mutation', 'internal'>;
		deliverableUpdate: FunctionReference<'mutation', 'internal'>;
		deliverableEvaluate: FunctionReference<'mutation', 'internal'>;
		evaluationGet: FunctionReference<'query', 'internal'>;
		evaluationList: FunctionReference<'query', 'internal'>;
		evaluationStart: FunctionReference<'mutation', 'internal'>;
		evaluationCancel: FunctionReference<'mutation', 'internal'>;
		evaluationComplete: FunctionReference<'mutation', 'internal'>;
	};
};

// ============================================================================
// Bridge Options Type
// ============================================================================

export type BridgeOptions<S extends string = string> = {
	subjects?: Partial<Record<S, string | SubjectConfig>>;
	card?: ResourceOptions<Card>;
	procedure?: ResourceOptions<Procedure>;
	deliverable?: ResourceOptions<Deliverable>;
	evaluation?: EvaluationOptions<Evaluation>;
};

// ============================================================================
// Internal Helpers
// ============================================================================

function getTableName(subjectConfig: string | SubjectConfig | undefined): string | undefined {
	if (!subjectConfig) return undefined;
	return typeof subjectConfig === 'string' ? subjectConfig : subjectConfig.table;
}

function getParents(subjectConfig: string | SubjectConfig | undefined) {
	if (!subjectConfig || typeof subjectConfig === 'string') return [];
	return subjectConfig.parents ?? [];
}

type SubjectDocument = {
	id: string;
	attributes?: Array<{ slug: string; value: unknown }>;
	[key: string]: unknown;
};

type DynamicTableQuery = {
	query(table: string): {
		withIndex(
			name: string,
			fn: (q: { eq(field: string, value: string): unknown }) => unknown
		): {
			unique(): Promise<SubjectDocument | null>;
		};
	};
};

function querySubjectTable(
	db: GenericQueryCtx<GenericDataModel>['db'],
	tableName: string,
	subjectId: string
): Promise<SubjectDocument | null> {
	return (db as unknown as DynamicTableQuery)
		.query(tableName)
		.withIndex('by_uuid', (q) => q.eq('id', subjectId))
		.unique();
}

// ============================================================================
// Bridge Instance Factory
// ============================================================================

function createBridgeInstance<S extends string = string>(
	component: BridgeComponentApi,
	options?: BridgeOptions<S>
) {
	const callbacks = new Map<string, CallbackHandler>();
	const subjects = options?.subjects;

	const cardResource = createCardResource(component, options?.card);
	const procedureResource = createProcedureResource(component, options?.procedure);
	const deliverableResource = createDeliverableResource(component, options?.deliverable);
	const evaluationResource = createEvaluationResource(component, options?.evaluation);

	async function fetchSubjectDoc(
		ctx: GenericQueryCtx<GenericDataModel>,
		subject: Subject,
		subjectId: string
	): Promise<SubjectDocument | null> {
		const subjectConfig = subjects?.[subject as S];
		const tableName = getTableName(subjectConfig);
		if (!tableName) return null;
		return querySubjectTable(ctx.db, tableName, subjectId);
	}

	function extractVariables(doc: SubjectDocument): Record<string, unknown> {
		const variables: Record<string, unknown> = {};
		if (Array.isArray(doc.attributes)) {
			for (const attr of doc.attributes) {
				if (attr && typeof attr === 'object' && 'slug' in attr && 'value' in attr) {
					variables[attr.slug] = attr.value;
				}
			}
		}
		return variables;
	}

	async function aggregateSubject(
		ctx: GenericQueryCtx<GenericDataModel>,
		subject: string,
		subjectId: string,
		visited = new Set<string>()
	): Promise<{
		variables: Record<string, unknown>;
		subjects: Record<string, Record<string, unknown>>;
	}> {
		const key = `${subject}:${subjectId}`;
		if (visited.has(key)) {
			return { variables: {}, subjects: {} };
		}
		visited.add(key);

		const doc = await fetchSubjectDoc(ctx, subject, subjectId);
		if (!doc) {
			return { variables: {}, subjects: {} };
		}

		const currentVariables = extractVariables(doc);
		const subjectsData: Record<string, Record<string, unknown>> = {
			[subject]: doc,
		};

		const subjectConfig = subjects?.[subject as S];
		const parents = getParents(subjectConfig);

		let mergedVariables: Record<string, unknown> = {};

		for (const parent of parents) {
			const parentId = doc[parent.field] as string | undefined;
			if (parentId) {
				const parentResult = await aggregateSubject(ctx, parent.subject, parentId, visited);
				mergedVariables = { ...mergedVariables, ...parentResult.variables };
				Object.assign(subjectsData, parentResult.subjects);
			}
		}

		mergedVariables = { ...mergedVariables, ...currentVariables };

		return {
			variables: mergedVariables,
			subjects: subjectsData,
		};
	}

	return {
		card: cardResource,
		procedure: procedureResource,
		deliverable: deliverableResource,
		evaluation: evaluationResource,

		resolve: async (
			ctx: GenericQueryCtx<GenericDataModel>,
			subject: S,
			subjectId: string
		): Promise<Record<string, unknown>> => {
			const doc = await fetchSubjectDoc(ctx, subject, subjectId);
			if (!doc) return {};
			return extractVariables(doc);
		},

		aggregate: async (
			ctx: GenericQueryCtx<GenericDataModel>,
			input: { subject: S; subjectId: string }
		): Promise<AggregatedContext> => {
			const result = await aggregateSubject(ctx, input.subject, input.subjectId);
			return {
				subject: input.subject,
				subjectId: input.subjectId,
				variables: result.variables,
				subjects: result.subjects,
			};
		},

		register: (type: string, handler: CallbackHandler): void => {
			callbacks.set(type, handler);
		},

		handler: (type: string): CallbackHandler | undefined => {
			return callbacks.get(type);
		},

		submit: async (
			ctx: GenericMutationCtx<GenericDataModel>,
			submission: Submission
		): Promise<SubmissionResult> => {
			return ctx.runMutation(
				component.public.procedureSubmit,
				submission
			) as Promise<SubmissionResult>;
		},

		evaluate: async (
			ctx: GenericMutationCtx<GenericDataModel>,
			trigger: EvaluateTrigger
		): Promise<DeliverableResult[]> => {
			let { variables } = trigger;

			if (!variables && subjects?.[trigger.subject as S]) {
				const aggregated = await aggregateSubject(ctx, trigger.subject, trigger.subjectId);
				variables = aggregated.variables;
			}

			return ctx.runMutation(component.public.deliverableEvaluate, {
				...trigger,
				variables: variables ?? {},
			}) as Promise<DeliverableResult[]>;
		},

		execute: async (
			deliverable: Deliverable,
			operation: Operation,
			context: ExecutionContext
		): Promise<ExecutionResult> => {
			const opConfig = deliverable.operations[operation];
			if (!opConfig) {
				return {
					success: false,
					error: `Deliverable has no config for operation: ${operation}`,
				};
			}

			const callbackAction = opConfig.callbackAction;
			if (!callbackAction) {
				return {
					success: false,
					error: `No callbackAction defined for operation: ${operation}`,
				};
			}

			const callbackType = callbackAction.split(':')[0] || 'default';
			const handler = callbacks.get(callbackType);

			if (!handler) {
				return {
					success: false,
					error: `No handler registered for callback type: ${callbackType}`,
				};
			}

			try {
				return await handler(deliverable, context);
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				};
			}
		},
	};
}

// ============================================================================
// Bridge Factory Export
// ============================================================================

/**
 * Bridge factory namespace.
 *
 * @example
 * ```typescript
 * import { bridge } from '@trestleinc/bridge/server';
 * import { components } from './_generated/api';
 *
 * const b = bridge.create(components.bridge, {
 *   subjects: { beneficiary: 'beneficiaries' },
 *   card: { hooks: { evalRead, evalWrite } },
 *   procedure: { hooks: { onComplete } },
 * });
 *
 * // Use the clean API
 * const cards = await b.card.list(ctx, { organizationId });
 * await b.procedure.submit(ctx, submission);
 * ```
 */
export const bridge = {
	/**
	 * Create a Bridge instance with the component API.
	 *
	 * @param component - The Bridge component API from components.bridge
	 * @param options - Configuration options with hooks for each resource
	 * @returns Bridge instance with card, procedure, deliverable, evaluation APIs
	 */
	create: createBridgeInstance,
} as const;
