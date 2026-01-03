import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from 'convex/server';

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
