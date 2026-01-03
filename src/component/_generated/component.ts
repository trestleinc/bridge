/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    public: {
      cardCreate: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy: string;
          label: string;
          organizationId: string;
          security: "PUBLIC" | "CONFIDENTIAL" | "RESTRICTED";
          slug: string;
          subject: string;
          variant:
            | "STRING"
            | "TEXT"
            | "NUMBER"
            | "BOOLEAN"
            | "DATE"
            | "EMAIL"
            | "URL"
            | "PHONE"
            | "SSN"
            | "ADDRESS"
            | "SUBJECT"
            | "ARRAY";
        },
        {
          createdAt: number;
          createdBy: string;
          id: string;
          label: string;
          organizationId: string;
          security: "PUBLIC" | "CONFIDENTIAL" | "RESTRICTED";
          slug: string;
          subject: string;
          variant:
            | "STRING"
            | "TEXT"
            | "NUMBER"
            | "BOOLEAN"
            | "DATE"
            | "EMAIL"
            | "URL"
            | "PHONE"
            | "SSN"
            | "ADDRESS"
            | "SUBJECT"
            | "ARRAY";
        },
        Name
      >;
      cardFind: FunctionReference<
        "query",
        "internal",
        { organizationId: string; slug: string },
        null | {
          createdAt: number;
          createdBy: string;
          id: string;
          label: string;
          organizationId: string;
          security: "PUBLIC" | "CONFIDENTIAL" | "RESTRICTED";
          slug: string;
          subject: string;
          variant:
            | "STRING"
            | "TEXT"
            | "NUMBER"
            | "BOOLEAN"
            | "DATE"
            | "EMAIL"
            | "URL"
            | "PHONE"
            | "SSN"
            | "ADDRESS"
            | "SUBJECT"
            | "ARRAY";
        },
        Name
      >;
      cardGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        null | {
          createdAt: number;
          createdBy: string;
          id: string;
          label: string;
          organizationId: string;
          security: "PUBLIC" | "CONFIDENTIAL" | "RESTRICTED";
          slug: string;
          subject: string;
          variant:
            | "STRING"
            | "TEXT"
            | "NUMBER"
            | "BOOLEAN"
            | "DATE"
            | "EMAIL"
            | "URL"
            | "PHONE"
            | "SSN"
            | "ADDRESS"
            | "SUBJECT"
            | "ARRAY";
        },
        Name
      >;
      cardList: FunctionReference<
        "query",
        "internal",
        { limit?: number; organizationId: string; subject?: string },
        Array<{
          createdAt: number;
          createdBy: string;
          id: string;
          label: string;
          organizationId: string;
          security: "PUBLIC" | "CONFIDENTIAL" | "RESTRICTED";
          slug: string;
          subject: string;
          variant:
            | "STRING"
            | "TEXT"
            | "NUMBER"
            | "BOOLEAN"
            | "DATE"
            | "EMAIL"
            | "URL"
            | "PHONE"
            | "SSN"
            | "ADDRESS"
            | "SUBJECT"
            | "ARRAY";
        }>,
        Name
      >;
      deliverableCreate: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          id: string;
          name: string;
          operations: {
            create?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
            delete?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
            update?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
          };
          organizationId: string;
          schedule?: { at?: number; cron?: string };
          subject: string;
        },
        { id: string },
        Name
      >;
      deliverableEvaluate: FunctionReference<
        "mutation",
        "internal",
        {
          mutated?: Array<string>;
          operation: "create" | "update" | "delete";
          organizationId: string;
          subject: string;
          subjectId: string;
          variables: Record<string, any>;
        },
        Array<{
          deliverableId: string;
          evaluationId?: string;
          ready: boolean;
          unmet: { cardIds: Array<string>; deliverableIds: Array<string> };
        }>,
        Name
      >;
      deliverableGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        null | {
          createdAt: number;
          description?: string;
          id: string;
          name: string;
          operations: {
            create?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
            delete?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
            update?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
          };
          organizationId: string;
          schedule?: { at?: number; cron?: string };
          status: "active" | "paused";
          subject: string;
          updatedAt: number;
        },
        Name
      >;
      deliverableList: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          organizationId: string;
          status?: "active" | "paused";
          subject?: string;
        },
        Array<{
          createdAt: number;
          description?: string;
          id: string;
          name: string;
          operations: {
            create?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
            delete?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
            update?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
          };
          organizationId: string;
          schedule?: { at?: number; cron?: string };
          status: "active" | "paused";
          subject: string;
          updatedAt: number;
        }>,
        Name
      >;
      deliverableUpdate: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          id: string;
          name?: string;
          operations?: {
            create?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
            delete?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
            update?: {
              callbackAction?: string;
              callbackUrl?: string;
              required: {
                cardIds: Array<string>;
                deliverableIds: Array<string>;
              };
            };
          };
          schedule?: { at?: number; cron?: string };
          status?: "active" | "paused";
        },
        { id: string },
        Name
      >;
      evaluationCancel: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { cancelled: boolean },
        Name
      >;
      evaluationComplete: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          result: {
            artifacts?: Array<string>;
            duration?: number;
            error?: string;
            logs?: Array<string>;
            success: boolean;
          };
        },
        { completed: boolean },
        Name
      >;
      evaluationGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        null | {
          completedAt?: number;
          context: {
            mutated?: Array<string>;
            subject: string;
            subjectId: string;
          };
          createdAt: number;
          deliverableId: string;
          id: string;
          operation: "create" | "update" | "delete";
          organizationId: string;
          result?: {
            artifacts?: Array<string>;
            duration?: number;
            error?: string;
            logs?: Array<string>;
            success: boolean;
          };
          scheduled?: string;
          scheduledFor?: number;
          started?: number;
          status: "pending" | "running" | "completed" | "failed";
          variables: Record<string, any>;
        },
        Name
      >;
      evaluationList: FunctionReference<
        "query",
        "internal",
        { limit?: number; organizationId: string },
        Array<{
          completedAt?: number;
          context: {
            mutated?: Array<string>;
            subject: string;
            subjectId: string;
          };
          createdAt: number;
          deliverableId: string;
          id: string;
          operation: "create" | "update" | "delete";
          organizationId: string;
          result?: {
            artifacts?: Array<string>;
            duration?: number;
            error?: string;
            logs?: Array<string>;
            success: boolean;
          };
          scheduled?: string;
          scheduledFor?: number;
          started?: number;
          status: "pending" | "running" | "completed" | "failed";
          variables: Record<string, any>;
        }>,
        Name
      >;
      evaluationStart: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { started: boolean },
        Name
      >;
      procedureCreate: FunctionReference<
        "mutation",
        "internal",
        {
          cards: Array<{
            cardId: string;
            required: boolean;
            writeTo: { path: string };
          }>;
          description?: string;
          id: string;
          name: string;
          organizationId: string;
          source: "form" | "import" | "api";
          subject?: { operation: "create" | "update" | "delete"; type: string };
        },
        { id: string },
        Name
      >;
      procedureGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        null | {
          cards: Array<{
            cardId: string;
            required: boolean;
            writeTo: { path: string };
          }>;
          createdAt: number;
          description?: string;
          id: string;
          name: string;
          organizationId: string;
          source: "form" | "import" | "api";
          subject?: { operation: "create" | "update" | "delete"; type: string };
          updatedAt: number;
        },
        Name
      >;
      procedureList: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          organizationId: string;
          source?: "form" | "import" | "api";
        },
        Array<{
          cards: Array<{
            cardId: string;
            required: boolean;
            writeTo: { path: string };
          }>;
          createdAt: number;
          description?: string;
          id: string;
          name: string;
          organizationId: string;
          source: "form" | "import" | "api";
          subject?: { operation: "create" | "update" | "delete"; type: string };
          updatedAt: number;
        }>,
        Name
      >;
      procedureRemove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { removed: boolean },
        Name
      >;
      procedureSubmit: FunctionReference<
        "mutation",
        "internal",
        {
          organizationId: string;
          procedureId: string;
          subject: string;
          subjectId: string;
          values: Record<string, any>;
        },
        {
          errors?: Array<{ field: string; message: string }>;
          success: boolean;
          validated: Array<string>;
        },
        Name
      >;
      procedureUpdate: FunctionReference<
        "mutation",
        "internal",
        {
          cards?: Array<{
            cardId: string;
            required: boolean;
            writeTo: { path: string };
          }>;
          description?: string;
          id: string;
          name?: string;
          source?: "form" | "import" | "api";
        },
        { id: string },
        Name
      >;
    };
  };
