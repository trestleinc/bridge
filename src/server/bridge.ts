import type {
  FunctionReference,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { EvaluationOptions, ResourceOptions } from "$/server/resource";
import {
  createCardResource,
  createDeliverableResource,
  createEvaluationResource,
  createProcedureResource,
} from "$/server/resources";
import type {
  AggregatedContext,
  CallbackHandler,
  Card,
  Deliverable,
  DeliverableResult,
  EvaluateTrigger,
  Evaluation,
  ExecutionContext,
  ExecutionResult,
  Operation,
  Procedure,
  Subject,
  SubjectConfig,
  Submission,
  SubmissionResult,
} from "$/shared/types";

// ============================================================================
// Component API Type
// ============================================================================

/**
 * The shape of a Bridge component's public API.
 * This matches the generated ComponentApi type from src/component/_generated/component.ts
 *
 * Using this type provides better type safety than `any` while still allowing
 * flexibility for the generated component structure.
 */
export interface BridgeComponentApi {
  public: {
    cardGet: FunctionReference<"query", "internal">;
    cardFind: FunctionReference<"query", "internal">;
    cardList: FunctionReference<"query", "internal">;
    cardCreate: FunctionReference<"mutation", "internal">;
    procedureGet: FunctionReference<"query", "internal">;
    procedureList: FunctionReference<"query", "internal">;
    procedureCreate: FunctionReference<"mutation", "internal">;
    procedureUpdate: FunctionReference<"mutation", "internal">;
    procedureRemove: FunctionReference<"mutation", "internal">;
    procedureSubmit: FunctionReference<"mutation", "internal">;
    deliverableGet: FunctionReference<"query", "internal">;
    deliverableList: FunctionReference<"query", "internal">;
    deliverableCreate: FunctionReference<"mutation", "internal">;
    deliverableUpdate: FunctionReference<"mutation", "internal">;
    deliverableEvaluate: FunctionReference<"mutation", "internal">;
    evaluationGet: FunctionReference<"query", "internal">;
    evaluationList: FunctionReference<"query", "internal">;
    evaluationStart: FunctionReference<"mutation", "internal">;
    evaluationCancel: FunctionReference<"mutation", "internal">;
    evaluationComplete: FunctionReference<"mutation", "internal">;
  };
}

export interface BridgeOptions<S extends string = string> {
  subjects?: Partial<Record<S, string | SubjectConfig>>;
  cards?: ResourceOptions<Card>;
  procedures?: ResourceOptions<Procedure>;
  deliverables?: ResourceOptions<Deliverable>;
  evaluations?: EvaluationOptions<Evaluation>;
}

function getTableName(
  subjectConfig: string | SubjectConfig | undefined,
): string | undefined {
  if (!subjectConfig) return undefined;
  return typeof subjectConfig === "string"
    ? subjectConfig
    : subjectConfig.table;
}

function getParents(subjectConfig: string | SubjectConfig | undefined) {
  if (!subjectConfig || typeof subjectConfig === "string") return [];
  return subjectConfig.parents ?? [];
}

export function bridge(component: BridgeComponentApi) {
  return function boundBridge<S extends string = string>(
    options?: BridgeOptions<S>,
  ) {
    const callbacks = new Map<string, CallbackHandler>();
    const subjects = options?.subjects;

    const cards = createCardResource(component, options?.cards);
    const procedures = createProcedureResource(component, options?.procedures);
    const deliverables = createDeliverableResource(
      component,
      options?.deliverables,
    );
    const evaluations = createEvaluationResource(
      component,
      options?.evaluations,
    );

    async function fetchSubjectDoc(
      ctx: GenericQueryCtx<GenericDataModel>,
      subject: Subject,
      subjectId: string,
    ): Promise<Record<string, unknown> | null> {
      const subjectConfig = subjects?.[subject as S];
      const tableName = getTableName(subjectConfig);
      if (!tableName) return null;

      const doc = await (ctx.db as any)
        .query(tableName)
        .withIndex("by_uuid", (q: any) => q.eq("id", subjectId))
        .unique();

      return doc ?? null;
    }

    function extractVariables(
      doc: Record<string, unknown>,
    ): Record<string, unknown> {
      const variables: Record<string, unknown> = {};
      if (Array.isArray(doc.attributes)) {
        for (const attr of doc.attributes) {
          if (
            attr
            && typeof attr === "object"
            && "slug" in attr
            && "value" in attr
          ) {
            variables[attr.slug as string] = attr.value;
          }
        }
      }
      return variables;
    }

    async function aggregateSubject(
      ctx: GenericQueryCtx<GenericDataModel>,
      subject: string,
      subjectId: string,
      visited = new Set<string>(),
    ): Promise<{
      variables: Record<string, unknown>;
      subjects: Record<string, Record<string, unknown>>;
    }> {
      const key = `${subject}:${subjectId}`;
      if (visited.has(key)) {
        return { variables: {}, subjects: {} };
      }
      visited.add(key);

      const doc = await fetchSubjectDoc(ctx, subject, subjectId);
      if (!doc) {
        return { variables: {}, subjects: {} };
      }

      const currentVariables = extractVariables(doc);
      const subjectsData: Record<string, Record<string, unknown>> = {
        [subject]: doc,
      };

      const subjectConfig = subjects?.[subject as S];
      const parents = getParents(subjectConfig);

      let mergedVariables: Record<string, unknown> = {};

      for (const parent of parents) {
        const parentId = doc[parent.field] as string | undefined;
        if (parentId) {
          const parentResult = await aggregateSubject(
            ctx,
            parent.subject,
            parentId,
            visited,
          );
          mergedVariables = { ...mergedVariables, ...parentResult.variables };
          Object.assign(subjectsData, parentResult.subjects);
        }
      }

      mergedVariables = { ...mergedVariables, ...currentVariables };

      return {
        variables: mergedVariables,
        subjects: subjectsData,
      };
    }

    return {
      cards,
      procedures,
      deliverables,
      evaluations,

      resolve: async (
        ctx: GenericQueryCtx<GenericDataModel>,
        subject: S,
        subjectId: string,
      ): Promise<Record<string, unknown>> => {
        const doc = await fetchSubjectDoc(ctx, subject, subjectId);
        if (!doc) return {};
        return extractVariables(doc);
      },

      aggregate: async (
        ctx: GenericQueryCtx<GenericDataModel>,
        input: { subject: S; subjectId: string },
      ): Promise<AggregatedContext> => {
        const result = await aggregateSubject(
          ctx,
          input.subject,
          input.subjectId,
        );
        return {
          subject: input.subject,
          subjectId: input.subjectId,
          variables: result.variables,
          subjects: result.subjects,
        };
      },

      register: (type: string, handler: CallbackHandler): void => {
        callbacks.set(type, handler);
      },

      handler: (type: string): CallbackHandler | undefined => {
        return callbacks.get(type);
      },

      submit: async (
        ctx: GenericMutationCtx<GenericDataModel>,
        submission: Submission,
      ): Promise<SubmissionResult> => {
        return ctx.runMutation(
          component.public.procedureSubmit,
          submission,
        ) as Promise<SubmissionResult>;
      },

      evaluate: async (
        ctx: GenericMutationCtx<GenericDataModel>,
        trigger: EvaluateTrigger,
      ): Promise<DeliverableResult[]> => {
        let { variables } = trigger;

        if (!variables && subjects?.[trigger.subject as S]) {
          const aggregated = await aggregateSubject(
            ctx,
            trigger.subject,
            trigger.subjectId,
          );
          variables = aggregated.variables;
        }

        return ctx.runMutation(component.public.deliverableEvaluate, {
          ...trigger,
          variables: variables ?? {},
        }) as Promise<DeliverableResult[]>;
      },

      execute: async (
        deliverable: Deliverable,
        operation: Operation,
        context: ExecutionContext,
      ): Promise<ExecutionResult> => {
        const opConfig = deliverable.operations[operation];
        if (!opConfig) {
          return {
            success: false,
            error: `Deliverable has no config for operation: ${operation}`,
          };
        }

        const callbackAction = opConfig.callbackAction;
        if (!callbackAction) {
          return {
            success: false,
            error: `No callbackAction defined for operation: ${operation}`,
          };
        }

        const callbackType = callbackAction.split(":")[0] || "default";
        const handler = callbacks.get(callbackType);

        if (!handler) {
          return {
            success: false,
            error: `No handler registered for callback type: ${callbackType}`,
          };
        }

        try {
          return await handler(deliverable, context);
        }
        catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      },
    };
  };
}
