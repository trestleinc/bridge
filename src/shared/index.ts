/**
 * @trestleinc/bridge - Shared Module
 *
 * Single source of truth for all validators, types, utilities, and hooks.
 */

import type { GenericDataModel, GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { type Infer, v } from "convex/values";
import { literals } from "convex-helpers/validators";

// ============================================================================
// Enum Validators (using literals helper)
// ============================================================================

export const cardTypeValidator = literals(
	"STRING",
	"TEXT",
	"NUMBER",
	"BOOLEAN",
	"DATE",
	"EMAIL",
	"URL",
	"PHONE",
	"SSN",
	"ADDRESS",
	"SUBJECT",
	"ARRAY",
);
export type CardTypeValue = Infer<typeof cardTypeValidator>;

export const securityLevelValidator = literals("PUBLIC", "CONFIDENTIAL", "RESTRICTED");
export type SecurityLevelValue = Infer<typeof securityLevelValidator>;

export const procedureTypeValidator = literals("form", "import", "api");
export type ProcedureTypeValue = Infer<typeof procedureTypeValidator>;

export const operationValidator = literals("create", "update", "delete");
export type OperationValue = Infer<typeof operationValidator>;

export const evaluationStatusValidator = literals("pending", "running", "completed", "failed");
export type EvaluationStatusValue = Infer<typeof evaluationStatusValidator>;

export const deliverableStatusValidator = literals("active", "paused");
export type DeliverableStatusValue = Infer<typeof deliverableStatusValidator>;

// ============================================================================
// Nested Object Validators
// ============================================================================

export const procedureCardValidator = v.object({
	cardId: v.string(),
	required: v.boolean(),
	writeTo: v.object({ path: v.string() }),
});
export type ProcedureCardValue = Infer<typeof procedureCardValidator>;

export const scheduleValidator = v.object({
	at: v.optional(v.number()),
	cron: v.optional(v.string()),
});
export type ScheduleValue = Infer<typeof scheduleValidator>;

export const requiredValidator = v.object({
	cardIds: v.array(v.string()),
	deliverableIds: v.array(v.string()),
});
export type RequiredValue = Infer<typeof requiredValidator>;

export const deliverableOperationValidator = v.object({
	required: requiredValidator,
	callbackAction: v.optional(v.string()),
	callbackUrl: v.optional(v.string()),
});
export type DeliverableOperationValue = Infer<typeof deliverableOperationValidator>;

export const operationsValidator = v.object({
	create: v.optional(deliverableOperationValidator),
	update: v.optional(deliverableOperationValidator),
	delete: v.optional(deliverableOperationValidator),
});
export type OperationsValue = Infer<typeof operationsValidator>;

export const resultValidator = v.object({
	success: v.boolean(),
	duration: v.optional(v.number()),
	error: v.optional(v.string()),
	logs: v.optional(v.array(v.string())),
	artifacts: v.optional(v.array(v.string())),
});
export type ResultValue = Infer<typeof resultValidator>;

export const fieldErrorValidator = v.object({
	field: v.string(),
	message: v.string(),
});
export type FieldErrorValue = Infer<typeof fieldErrorValidator>;

export const evaluationContextValidator = v.object({
	subject: v.string(),
	subjectId: v.string(),
	mutated: v.optional(v.array(v.string())),
});
export type EvaluationContextValue = Infer<typeof evaluationContextValidator>;

export const procedureSubjectValidator = v.object({
	type: v.string(),
	operation: operationValidator,
});
export type ProcedureSubjectValue = Infer<typeof procedureSubjectValidator>;

// ============================================================================
// Document Validators (API layer - no Convex internals)
// ============================================================================

export const cardDocValidator = v.object({
	id: v.string(),
	organizationId: v.string(),
	slug: v.string(),
	label: v.string(),
	cardType: cardTypeValidator,
	securityLevel: securityLevelValidator,
	subject: v.string(),
	createdBy: v.string(),
	createdAt: v.number(),
});
export type CardDoc = Infer<typeof cardDocValidator>;

export const procedureDocValidator = v.object({
	id: v.string(),
	organizationId: v.string(),
	name: v.string(),
	description: v.optional(v.string()),
	procedureType: procedureTypeValidator,
	subject: v.optional(procedureSubjectValidator),
	cards: v.array(procedureCardValidator),
	createdAt: v.number(),
	updatedAt: v.number(),
});
export type ProcedureDoc = Infer<typeof procedureDocValidator>;

export const deliverableDocValidator = v.object({
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
});
export type DeliverableDoc = Infer<typeof deliverableDocValidator>;

export const evaluationDocValidator = v.object({
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
});
export type EvaluationDoc = Infer<typeof evaluationDocValidator>;

// ============================================================================
// Response Validators
// ============================================================================

export const submitResultValidator = v.object({
	success: v.boolean(),
	errors: v.optional(v.array(fieldErrorValidator)),
	validated: v.array(v.string()),
});
export type SubmitResult = Infer<typeof submitResultValidator>;

export const evaluateResultValidator = v.object({
	deliverableId: v.string(),
	ready: v.boolean(),
	unmet: v.object({
		cardIds: v.array(v.string()),
		deliverableIds: v.array(v.string()),
	}),
	evaluationId: v.optional(v.string()),
});
export type EvaluateResult = Infer<typeof evaluateResultValidator>;

export const idResultValidator = v.object({ id: v.string() });
export type IdResult = Infer<typeof idResultValidator>;

export const startedResultValidator = v.object({ started: v.boolean() });
export const cancelledResultValidator = v.object({ cancelled: v.boolean() });
export const completedResultValidator = v.object({ completed: v.boolean() });
export const removedResultValidator = v.object({ removed: v.boolean() });

// ============================================================================
// Runtime Enums with Utility Methods
// ============================================================================

const cardTypeValues = {
	STRING: "STRING",
	TEXT: "TEXT",
	NUMBER: "NUMBER",
	BOOLEAN: "BOOLEAN",
	DATE: "DATE",
	EMAIL: "EMAIL",
	URL: "URL",
	PHONE: "PHONE",
	SSN: "SSN",
	ADDRESS: "ADDRESS",
	SUBJECT: "SUBJECT",
	ARRAY: "ARRAY",
} as const;

export type CardType = (typeof cardTypeValues)[keyof typeof cardTypeValues];

const cardTypeDisplayNames: Record<CardType, string> = {
	STRING: "Text",
	TEXT: "Long Text",
	NUMBER: "Number",
	BOOLEAN: "Yes/No",
	DATE: "Date",
	EMAIL: "Email",
	URL: "URL",
	PHONE: "Phone",
	SSN: "SSN",
	ADDRESS: "Address",
	SUBJECT: "Subject Reference",
	ARRAY: "List",
};

export const CardType = {
	...cardTypeValues,
	valid: (value: string): value is CardType =>
		Object.values(cardTypeValues).includes(value as CardType),
	display: (v: CardType): string => cardTypeDisplayNames[v],
} as const;

const securityLevelValues = {
	PUBLIC: "PUBLIC",
	CONFIDENTIAL: "CONFIDENTIAL",
	RESTRICTED: "RESTRICTED",
} as const;

export type SecurityLevel = (typeof securityLevelValues)[keyof typeof securityLevelValues];

const securityLevelOrder: Record<SecurityLevel, number> = {
	PUBLIC: 1,
	CONFIDENTIAL: 2,
	RESTRICTED: 3,
};

export const SecurityLevel = {
	...securityLevelValues,
	valid: (value: string): value is SecurityLevel =>
		Object.values(securityLevelValues).includes(value as SecurityLevel),
	order: (s: SecurityLevel): number => securityLevelOrder[s],
} as const;

const procedureTypeValues = {
	FORM: "form",
	IMPORT: "import",
	API: "api",
} as const;

export type ProcedureType = (typeof procedureTypeValues)[keyof typeof procedureTypeValues];

const procedureTypeDisplayNames: Record<ProcedureType, string> = {
	form: "Form",
	import: "Import",
	api: "API",
};

export const ProcedureType = {
	...procedureTypeValues,
	valid: (value: string): value is ProcedureType =>
		Object.values(procedureTypeValues).includes(value as ProcedureType),
	display: (s: ProcedureType): string => procedureTypeDisplayNames[s],
} as const;

export type Subject = string;

const operationValues = {
	CREATE: "create",
	UPDATE: "update",
	DELETE: "delete",
} as const;

export type Operation = (typeof operationValues)[keyof typeof operationValues];

const operationDisplayNames: Record<Operation, string> = {
	create: "Create",
	update: "Update",
	delete: "Delete",
};

export const Operation = {
	...operationValues,
	valid: (value: string): value is Operation =>
		Object.values(operationValues).includes(value as Operation),
	display: (o: Operation): string => operationDisplayNames[o],
} as const;

const evaluationStatusValues = {
	PENDING: "pending",
	RUNNING: "running",
	COMPLETED: "completed",
	FAILED: "failed",
} as const;

export type EvaluationStatus = (typeof evaluationStatusValues)[keyof typeof evaluationStatusValues];

export const EvaluationStatus = { ...evaluationStatusValues } as const;

const deliverableStatusValues = {
	ACTIVE: "active",
	PAUSED: "paused",
} as const;

export type DeliverableStatus =
	(typeof deliverableStatusValues)[keyof typeof deliverableStatusValues];

export const DeliverableStatus = { ...deliverableStatusValues } as const;

// ============================================================================
// Duration Utilities
// ============================================================================

type TimeUnit = "s" | "m" | "h" | "d";

export type Duration = `${number}${TimeUnit}`;

const DURATION_MS: Record<TimeUnit, number> = {
	s: 1_000,
	m: 60_000,
	h: 3_600_000,
	d: 86_400_000,
};

const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

export function parseDuration(duration: Duration): number {
	const match = /^(\d+)(s|m|h|d)$/i.exec(duration);
	if (!match) throw new Error(`Invalid duration: ${duration}`);
	const value = parseInt(match[1], 10);
	const unit = match[2].toLowerCase() as TimeUnit;
	const result = value * DURATION_MS[unit];
	if (result > MAX_DURATION_MS) {
		throw new Error(`Duration exceeds maximum (1 year): ${duration}`);
	}
	return result;
}

export function formatDuration(ms: number): Duration {
	if (ms >= DURATION_MS.d && ms % DURATION_MS.d === 0) {
		return `${ms / DURATION_MS.d}d` as Duration;
	}
	if (ms >= DURATION_MS.h && ms % DURATION_MS.h === 0) {
		return `${ms / DURATION_MS.h}h` as Duration;
	}
	if (ms >= DURATION_MS.m && ms % DURATION_MS.m === 0) {
		return `${ms / DURATION_MS.m}m` as Duration;
	}
	return `${Math.ceil(ms / DURATION_MS.s)}s` as Duration;
}

// ============================================================================
// Branded ID Types
// ============================================================================

declare const CARD_ID: unique symbol;
declare const PROCEDURE_ID: unique symbol;
declare const DELIVERABLE_ID: unique symbol;
declare const EVALUATION_ID: unique symbol;
declare const ORGANIZATION_ID: unique symbol;

export type CardId = string & { readonly [CARD_ID]: typeof CARD_ID };
export type ProcedureId = string & { readonly [PROCEDURE_ID]: typeof PROCEDURE_ID };
export type DeliverableId = string & { readonly [DELIVERABLE_ID]: typeof DELIVERABLE_ID };
export type EvaluationId = string & { readonly [EVALUATION_ID]: typeof EVALUATION_ID };
export type OrganizationId = string & { readonly [ORGANIZATION_ID]: typeof ORGANIZATION_ID };

export const createId = {
	card: (id: string) => id as CardId,
	procedure: (id: string) => id as ProcedureId,
	deliverable: (id: string) => id as DeliverableId,
	evaluation: (id: string) => id as EvaluationId,
	organization: (id: string) => id as OrganizationId,
} as const;

// ============================================================================
// Entity Types (inferred from validators - single source of truth)
// ============================================================================

export type Card = CardDoc;
export type Procedure = ProcedureDoc;
export type Deliverable = DeliverableDoc;
export type Evaluation = EvaluationDoc;

export type Schedule = ScheduleValue;
export type Required = RequiredValue;
export type ProcedureCard = ProcedureCardValue;
export type DeliverableOperation = DeliverableOperationValue;
export type DeliverableOperations = OperationsValue;
export type EvaluationContext = EvaluationContextValue;
export type EvaluationResult = ResultValue;
export type FieldError = FieldErrorValue;

// ============================================================================
// Input Types (for create/update operations)
// ============================================================================

export interface CardInput {
	organizationId: string;
	slug: string;
	label: string;
	cardType: CardType;
	securityLevel: SecurityLevel;
	subject: Subject;
	createdBy: string;
}

export interface ProcedureInput {
	id: string;
	organizationId: string;
	name: string;
	description?: string;
	procedureType: ProcedureType;
	subject?: { type: Subject; operation: Operation };
	cards: ProcedureCard[];
}

export interface ProcedureUpdate {
	name?: string;
	description?: string;
	procedureType?: ProcedureType;
	cards?: ProcedureCard[];
}

export interface DeliverableInput {
	id: string;
	organizationId: string;
	name: string;
	description?: string;
	subject: Subject;
	operations: DeliverableOperations;
	schedule?: Schedule;
}

export interface DeliverableUpdate {
	name?: string;
	description?: string;
	operations?: DeliverableOperations;
	status?: DeliverableStatus;
	schedule?: Schedule;
}

// ============================================================================
// List Options
// ============================================================================

export interface ListOptions {
	limit?: number;
	cursor?: string;
}

export interface CardListOptions extends ListOptions {
	subject?: Subject;
}

export interface ProcedureListOptions extends ListOptions {
	procedureType?: ProcedureType;
}

export interface DeliverableListOptions extends ListOptions {
	subject?: Subject;
}

export interface EvaluationListOptions extends ListOptions {
	status?: EvaluationStatus;
}

// ============================================================================
// Operation Types
// ============================================================================

export interface Submission {
	procedureId: string;
	organizationId: string;
	subject: Subject;
	subjectId: string;
	values: Record<string, unknown>;
}

export interface SubmissionResult {
	success: boolean;
	errors?: FieldError[];
	validated: string[];
}

export interface ExecutionContext {
	subject: Subject;
	subjectId: string;
	variables: Record<string, unknown>;
	mutated?: string[];
}

export interface ExecutionResult {
	success: boolean;
	data?: unknown;
	error?: string;
}

export type CallbackHandler = (
	deliverable: Deliverable,
	context: ExecutionContext,
) => Promise<ExecutionResult>;

export interface EvaluateTrigger {
	organizationId: string;
	subject: Subject;
	subjectId: string;
	operation: Operation;
	variables?: Record<string, unknown>;
	mutated?: string[];
}

export interface DeliverableResult {
	deliverableId: string;
	ready: boolean;
	unmet: { cardIds: string[]; deliverableIds: string[] };
	evaluationId?: string;
}

// ============================================================================
// Subject Configuration
// ============================================================================

export interface ParentRelation {
	field: string;
	subject: Subject;
}

export interface SubjectConfig {
	table: string;
	parents?: ParentRelation[];
	trackedFields?: string[];
}

export interface AggregatedContext {
	subject: string;
	subjectId: string;
	variables: Record<string, unknown>;
	subjects: Record<string, Record<string, unknown>>;
}

// ============================================================================
// Lazy Value Utilities
// ============================================================================

export type LazyValue<T> = T | (() => T);
export type LazyAsync<T> = T | (() => T | Promise<T>);

export function resolveLazy<T>(value: LazyValue<T>): T {
	return typeof value === "function" ? (value as () => T)() : value;
}

export async function resolveLazyAsync<T>(value: LazyAsync<T>): Promise<T> {
	if (typeof value === "function") {
		return (value as () => T | Promise<T>)();
	}
	return value;
}

// ============================================================================
// Hook Types
// ============================================================================

export type AnyQueryCtx = GenericQueryCtx<GenericDataModel>;
export type AnyMutationCtx = GenericMutationCtx<GenericDataModel>;

export type ResourceHooks<T extends object> = {
	evalRead?: (ctx: AnyQueryCtx, organizationId: string) => void | Promise<void>;
	evalWrite?: (ctx: AnyMutationCtx, doc: Partial<T>) => void | Promise<void>;
	evalRemove?: (ctx: AnyMutationCtx, doc: T) => void | Promise<void>;
	onInsert?: (ctx: AnyMutationCtx, doc: T) => void | Promise<void>;
	onUpdate?: (ctx: AnyMutationCtx, doc: T, prev: T) => void | Promise<void>;
	onRemove?: (ctx: AnyMutationCtx, doc: T) => void | Promise<void>;
	transform?: (docs: T[]) => T[] | Promise<T[]>;
};

export type ResourceOptions<T extends object> = {
	hooks?: ResourceHooks<T>;
};

export type EvaluationHooks<T extends object> = ResourceHooks<T> & {
	onComplete?: (ctx: AnyMutationCtx, evaluation: T) => void | Promise<void>;
};

export type EvaluationOptions<T extends object> = {
	hooks?: EvaluationHooks<T>;
};
