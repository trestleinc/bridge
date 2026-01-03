import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { OrganizationId } from "$/shared/types";

export type AnyQueryCtx = GenericQueryCtx<GenericDataModel>;
export type AnyMutationCtx = GenericMutationCtx<GenericDataModel>;

export interface ResourceHooks<T> {
  evalRead?: (
    ctx: AnyQueryCtx,
    organizationId: OrganizationId,
  ) => void | Promise<void>;
  evalWrite?: (ctx: AnyMutationCtx, doc: Partial<T>) => void | Promise<void>;
  evalRemove?: (ctx: AnyMutationCtx, id: string) => void | Promise<void>;
  onInsert?: (ctx: AnyMutationCtx, doc: T) => void | Promise<void>;
  onUpdate?: (ctx: AnyMutationCtx, doc: T, prev: T) => void | Promise<void>;
  onRemove?: (ctx: AnyMutationCtx, id: string) => void | Promise<void>;
  transform?: (docs: T[]) => T[] | Promise<T[]>;
}

export interface ResourceOptions<T> {
  hooks?: ResourceHooks<T>;
}

export interface EvaluationHooks<T> extends ResourceHooks<T> {
  onTrigger?: (ctx: AnyMutationCtx, evaluation: T) => void | Promise<void>;
  onComplete?: (ctx: AnyMutationCtx, evaluation: T) => void | Promise<void>;
}

export interface EvaluationOptions<T> {
  hooks?: EvaluationHooks<T>;
}
