/**
 * @trestleinc/bridge - Server exports
 *
 * Import from '@trestleinc/bridge/server' to use in Convex functions.
 */

export type { BridgeOptions } from "$/server/bridge";
export { bridge } from "$/server/bridge";

// Client API (recommended pattern - matches Crane)
export { clientApi, type BridgeClientOptions } from "$/server/client";

// Resource types for advanced usage
export type {
	AnyMutationCtx,
	AnyQueryCtx,
	EvaluationHooks,
	EvaluationOptions,
	ResourceHooks,
	ResourceOptions,
} from "$/server/resource";

export type {
	CardResource,
	DeliverableResource,
	EvaluationResource,
	ProcedureResource,
} from "$/server/resources";

export {
	AuthorizationError,
	BridgeError,
	ConflictError,
	NotFoundError,
	ValidationError,
} from "$/server/errors";

// Trigger generator factory for host applications
export {
	createSubjectTrigger,
	createTriggers,
	type TriggerHandler,
	type SubjectsConfig,
} from "$/server/triggers";
