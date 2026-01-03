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
          subject: "beneficiary" | "event" | "eventInstance";
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
        any,
        Name
      >;
      cardFind: FunctionReference<
        "query",
        "internal",
        { organizationId: string; slug: string },
        any,
        Name
      >;
      cardGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      cardList: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          organizationId: string;
          subject?: "beneficiary" | "event" | "eventInstance";
        },
        any,
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
        any,
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
          variables: any;
        },
        any,
        Name
      >;
      deliverableGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
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
        any,
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
        any,
        Name
      >;
      evaluationCancel: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        any,
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
        any,
        Name
      >;
      evaluationGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      evaluationList: FunctionReference<
        "query",
        "internal",
        { limit?: number; organizationId: string },
        any,
        Name
      >;
      evaluationStart: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        any,
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
          subject?: {
            operation: "create" | "update" | "delete";
            type: "beneficiary" | "event" | "eventInstance";
          };
        },
        any,
        Name
      >;
      procedureGet: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
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
        any,
        Name
      >;
      procedureRemove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        any,
        Name
      >;
      procedureSubmit: FunctionReference<
        "mutation",
        "internal",
        {
          organizationId: string;
          procedureId: string;
          subject: "beneficiary" | "event" | "eventInstance";
          subjectId: string;
          values: any;
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
        any,
        Name
      >;
    };
  };
