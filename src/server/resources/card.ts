import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';
import type { BridgeComponentApi } from '$/server/bridge';
import type { AnyMutationCtx, AnyQueryCtx, ResourceOptions } from '$/server/resource';
import {
  cardDocValidator,
  securityValidator,
  variantValidator,
  type Card,
} from '$/shared/validators';

export function createCardResource(
  component: BridgeComponentApi,
  options?: ResourceOptions<Card>,
) {
  const hooks = options?.hooks;

  return {
    __resource: 'card' as const,

    get: queryGeneric({
      args: { id: v.string() },
      returns: v.union(cardDocValidator, v.null()),
      handler: async (ctx: AnyQueryCtx, { id }) => {
        const doc = await ctx.runQuery(component.public.cardGet, { id });
        if (doc && hooks?.evalRead) {
          await hooks.evalRead(ctx, doc.organizationId);
        }
        return doc;
      },
    }),

    find: queryGeneric({
      args: { organizationId: v.string(), slug: v.string() },
      returns: v.union(cardDocValidator, v.null()),
      handler: async (ctx: AnyQueryCtx, args) => {
        if (hooks?.evalRead) {
          await hooks.evalRead(ctx, args.organizationId);
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
      returns: v.array(cardDocValidator),
      handler: async (ctx: AnyQueryCtx, args) => {
        if (hooks?.evalRead) {
          await hooks.evalRead(ctx, args.organizationId);
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
      returns: cardDocValidator,
      handler: async (ctx: AnyMutationCtx, args) => {
        if (hooks?.evalWrite) {
          await hooks.evalWrite(ctx, args);
        }
        const result = await ctx.runMutation(component.public.cardCreate, args);
        if (hooks?.onInsert) {
          await hooks.onInsert(ctx, result);
        }
        return result;
      },
    }),
  };
}

export type CardResource = ReturnType<typeof createCardResource>;
