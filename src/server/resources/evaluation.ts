import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { BridgeComponentApi } from "$/server/bridge";
import type {
  AnyMutationCtx,
  AnyQueryCtx,
  EvaluationOptions,
} from "$/server/resource";
import type { Evaluation, OrganizationId } from "$/shared/types";

const evaluationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);

const operationValidator = v.union(
  v.literal("create"),
  v.literal("update"),
  v.literal("delete"),
);

const evaluationContextValidator = v.object({
  subject: v.string(),
  subjectId: v.string(),
  mutated: v.optional(v.array(v.string())),
});

const evaluationResultValidator = v.object({
  success: v.boolean(),
  duration: v.optional(v.number()),
  error: v.optional(v.string()),
  logs: v.optional(v.array(v.string())),
  artifacts: v.optional(v.array(v.string())),
});

const evaluationValidator = v.object({
  id: v.string(),
  deliverableId: v.string(),
  organizationId: v.string(),
  operation: operationValidator,
  context: evaluationContextValidator,
  variables: v.any(),
  status: evaluationStatusValidator,
  scheduledFor: v.optional(v.number()),
  scheduled: v.optional(v.string()),
  started: v.optional(v.number()),
  result: v.optional(evaluationResultValidator),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

export function createEvaluationResource(
  component: BridgeComponentApi,
  options?: EvaluationOptions<Evaluation>,
) {
  const hooks = options?.hooks;

  return {
    __resource: "evaluation" as const,

    get: queryGeneric({
      args: { id: v.string() },
      returns: v.union(evaluationValidator, v.null()),
      handler: async (ctx: AnyQueryCtx, { id }) => {
        const doc = await ctx.runQuery(component.public.evaluationGet, { id });
        if (doc && hooks?.evalRead) {
          await hooks.evalRead(ctx, doc.organizationId as OrganizationId);
        }
        return doc;
      },
    }),

    list: queryGeneric({
      args: {
        organizationId: v.string(),
        limit: v.optional(v.number()),
      },
      returns: v.array(evaluationValidator),
      handler: async (ctx: AnyQueryCtx, args) => {
        if (hooks?.evalRead) {
          await hooks.evalRead(ctx, args.organizationId as OrganizationId);
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
        if (hooks?.evalWrite && doc) {
          await hooks.evalWrite(ctx, doc as Partial<Evaluation>);
        }
        return ctx.runMutation(component.public.evaluationStart, { id });
      },
    }),

    cancel: mutationGeneric({
      args: { id: v.string() },
      returns: v.object({ cancelled: v.boolean() }),
      handler: async (ctx: AnyMutationCtx, { id }) => {
        const doc = await ctx.runQuery(component.public.evaluationGet, { id });
        if (hooks?.evalWrite && doc) {
          await hooks.evalWrite(ctx, doc as Partial<Evaluation>);
        }
        return ctx.runMutation(component.public.evaluationCancel, { id });
      },
    }),

    complete: mutationGeneric({
      args: {
        id: v.string(),
        result: evaluationResultValidator,
      },
      returns: v.object({ completed: v.boolean() }),
      handler: async (ctx: AnyMutationCtx, args) => {
        const prev = await ctx.runQuery(component.public.evaluationGet, {
          id: args.id,
        });

        if (hooks?.evalWrite && prev) {
          await hooks.evalWrite(ctx, prev as Partial<Evaluation>);
        }

        const result = await ctx.runMutation(
          component.public.evaluationComplete,
          args,
        );

        if (hooks?.onComplete && prev) {
          const doc = await ctx.runQuery(component.public.evaluationGet, {
            id: args.id,
          });
          if (doc) await hooks.onComplete(ctx, doc as Evaluation);
        }

        return result;
      },
    }),
  };
}

export type EvaluationResource = ReturnType<typeof createEvaluationResource>;
