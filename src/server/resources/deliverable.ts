import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { BridgeComponentApi } from "$/server/bridge";
import type {
  AnyMutationCtx,
  AnyQueryCtx,
  ResourceOptions,
} from "$/server/resource";
import type {
  Deliverable,
  DeliverableResult,
  OrganizationId,
} from "$/shared/types";

const scheduleValidator = v.object({
  at: v.optional(v.number()),
  delay: v.optional(v.string()),
  cron: v.optional(v.string()),
});

const requiredValidator = v.object({
  cardIds: v.array(v.string()),
  deliverableIds: v.array(v.string()),
});

const deliverableOperationValidator = v.object({
  required: requiredValidator,
  callbackAction: v.optional(v.string()),
  callbackUrl: v.optional(v.string()),
});

const operationsValidator = v.object({
  create: v.optional(deliverableOperationValidator),
  update: v.optional(deliverableOperationValidator),
  delete: v.optional(deliverableOperationValidator),
});

const deliverableStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
);

const deliverableValidator = v.object({
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

const operationValidator = v.union(
  v.literal("create"),
  v.literal("update"),
  v.literal("delete"),
);

const deliverableResultValidator = v.object({
  deliverableId: v.string(),
  ready: v.boolean(),
  unmet: v.object({
    cardIds: v.array(v.string()),
    deliverableIds: v.array(v.string()),
  }),
  evaluationId: v.optional(v.string()),
});

export function createDeliverableResource(
  component: BridgeComponentApi,
  options?: ResourceOptions<Deliverable>,
) {
  const hooks = options?.hooks;

  return {
    __resource: "deliverable" as const,

    get: queryGeneric({
      args: { id: v.string() },
      returns: v.union(deliverableValidator, v.null()),
      handler: async (ctx: AnyQueryCtx, { id }) => {
        const doc = await ctx.runQuery(component.public.deliverableGet, { id });
        if (doc && hooks?.evalRead) {
          await hooks.evalRead(ctx, doc.organizationId as OrganizationId);
        }
        return doc;
      },
    }),

    list: queryGeneric({
      args: {
        organizationId: v.string(),
        subject: v.optional(v.string()),
        status: v.optional(deliverableStatusValidator),
        limit: v.optional(v.number()),
      },
      returns: v.array(deliverableValidator),
      handler: async (ctx: AnyQueryCtx, args) => {
        if (hooks?.evalRead) {
          await hooks.evalRead(ctx, args.organizationId as OrganizationId);
        }
        let docs = await ctx.runQuery(component.public.deliverableList, args);
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
        subject: v.string(),
        operations: operationsValidator,
        schedule: v.optional(scheduleValidator),
      },
      returns: v.object({ id: v.string() }),
      handler: async (ctx: AnyMutationCtx, args) => {
        if (hooks?.evalWrite) {
          await hooks.evalWrite(ctx, args as Partial<Deliverable>);
        }
        const result = await ctx.runMutation(
          component.public.deliverableCreate,
          args,
        );
        if (hooks?.onInsert) {
          const doc = await ctx.runQuery(component.public.deliverableGet, {
            id: result.id,
          });
          if (doc) await hooks.onInsert(ctx, doc as Deliverable);
        }
        return result;
      },
    }),

    update: mutationGeneric({
      args: {
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        operations: v.optional(operationsValidator),
        status: v.optional(deliverableStatusValidator),
        schedule: v.optional(scheduleValidator),
      },
      returns: v.object({ id: v.string() }),
      handler: async (ctx: AnyMutationCtx, { id, ...updates }) => {
        const prev = await ctx.runQuery(component.public.deliverableGet, {
          id,
        });
        if (!prev) throw new Error(`Deliverable not found: ${id}`);

        if (hooks?.evalWrite) {
          await hooks.evalWrite(ctx, {
            ...prev,
            ...updates,
          } as Partial<Deliverable>);
        }

        const result = await ctx.runMutation(
          component.public.deliverableUpdate,
          { id, ...updates },
        );

        if (hooks?.onUpdate && prev) {
          const doc = await ctx.runQuery(component.public.deliverableGet, {
            id,
          });
          if (doc)
            await hooks.onUpdate(ctx, doc as Deliverable, prev as Deliverable);
        }
        return result;
      },
    }),

    evaluate: mutationGeneric({
      args: {
        organizationId: v.string(),
        subject: v.string(),
        subjectId: v.string(),
        operation: operationValidator,
        variables: v.any(),
        mutated: v.optional(v.array(v.string())),
      },
      returns: v.array(deliverableResultValidator),
      handler: async (ctx: AnyMutationCtx, args) => {
        if (hooks?.evalWrite) {
          await hooks.evalWrite(ctx, {
            organizationId: args.organizationId,
          } as Partial<Deliverable>);
        }
        return ctx.runMutation(
          component.public.deliverableEvaluate,
          args,
        ) as Promise<DeliverableResult[]>;
      },
    }),
  };
}

export type DeliverableResource = ReturnType<typeof createDeliverableResource>;
