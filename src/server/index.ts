/**
 * @trestleinc/bridge - Server exports
 *
 * Import from '@trestleinc/bridge/server' to use in Convex functions.
 */

export type { BridgeOptions } from "$/server/bridge";
export { bridge } from "$/server/bridge";

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
