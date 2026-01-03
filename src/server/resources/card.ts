import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { BridgeComponentApi } from "$/server/bridge";
import type {
  AnyMutationCtx,
  AnyQueryCtx,
  ResourceOptions,
} from "$/server/resource";
import type { Card, OrganizationId } from "$/shared/types";

const variantValidator = v.union(
  v.literal("STRING"),
  v.literal("TEXT"),
  v.literal("NUMBER"),
  v.literal("BOOLEAN"),
  v.literal("DATE"),
  v.literal("EMAIL"),
  v.literal("URL"),
  v.literal("PHONE"),
  v.literal("SSN"),
  v.literal("ADDRESS"),
  v.literal("SUBJECT"),
  v.literal("ARRAY"),
);

const securityValidator = v.union(
  v.literal("PUBLIC"),
  v.literal("CONFIDENTIAL"),
  v.literal("RESTRICTED"),
);

const cardValidator = v.object({
  id: v.string(),
  organizationId: v.string(),
  slug: v.string(),
  label: v.string(),
  variant: variantValidator,
  security: securityValidator,
  subject: v.string(),
  createdBy: v.string(),
  createdAt: v.number(),
});

export function createCardResource(
  component: BridgeComponentApi,
  options?: ResourceOptions<Card>,
) {
  const hooks = options?.hooks;

  return {
    __resource: "card" as const,

    get: queryGeneric({
      args: { id: v.string() },
      returns: v.union(cardValidator, v.null()),
      handler: async (ctx: AnyQueryCtx, { id }) => {
        const doc = await ctx.runQuery(component.public.cardGet, { id });
        if (doc && hooks?.evalRead) {
          await hooks.evalRead(ctx, doc.organizationId as OrganizationId);
        }
        return doc;
      },
    }),

    find: queryGeneric({
      args: { organizationId: v.string(), slug: v.string() },
      returns: v.union(cardValidator, v.null()),
      handler: async (ctx: AnyQueryCtx, args) => {
        if (hooks?.evalRead) {
          await hooks.evalRead(ctx, args.organizationId as OrganizationId);
        }
        return ctx.runQuery(component.public.cardFind, args);
      },
    }),

    list: queryGeneric({
      args: {
        organizationId: v.string(),
        subject: v.optional(v.string()),
        limit: v.optional(v.number()),
      },
      returns: v.array(cardValidator),
      handler: async (ctx: AnyQueryCtx, args) => {
        if (hooks?.evalRead) {
          await hooks.evalRead(ctx, args.organizationId as OrganizationId);
        }
        let docs = await ctx.runQuery(component.public.cardList, args);
        if (hooks?.transform) {
          docs = await hooks.transform(docs);
        }
        return docs;
      },
    }),

    create: mutationGeneric({
      args: {
        organizationId: v.string(),
        slug: v.string(),
        label: v.string(),
        variant: variantValidator,
        security: securityValidator,
        subject: v.string(),
        createdBy: v.string(),
      },
      returns: cardValidator,
      handler: async (ctx: AnyMutationCtx, args) => {
        if (hooks?.evalWrite) {
          await hooks.evalWrite(ctx, args as Partial<Card>);
        }
        const result = await ctx.runMutation(component.public.cardCreate, args);
        if (hooks?.onInsert) {
          await hooks.onInsert(ctx, result as Card);
        }
        return result;
      },
    }),
  };
}

export type CardResource = ReturnType<typeof createCardResource>;
