/**
 * @trestleinc/bridge - Server Builder
 *
 * Factory function to create a bridge instance bound to a Convex component.
 */

import type { GenericMutationCtx, GenericQueryCtx, GenericDataModel } from 'convex/server';
import type {
  Card,
  Procedure,
  Evaluation,
  Deliverable,
  Submission,
  SubmissionResult,
  EvaluateTrigger,
  DeliverableReadiness,
  ExecutionContext,
  ExecutionResult,
  CallbackHandler,
  SubjectType,
} from '$/shared/types.js';

// ============================================================================
// Configuration Interface
// ============================================================================

/**
 * Configuration for the bridge instance.
 * Hooks use verb-based naming with entity namespacing.
 */
export interface Config {
  /** Map subject types to host table names for automatic context resolution */
  subjects?: Partial<Record<SubjectType, string>>;
  hooks?: {
    /** Called before read operations for authorization */
    read?: (ctx: GenericQueryCtx<GenericDataModel>, organizationId: string) => void | Promise<void>;
    /** Called before write operations for authorization */
    write?: (
      ctx: GenericMutationCtx<GenericDataModel>,
      organizationId: string
    ) => void | Promise<void>;
    /** Card lifecycle hooks */
    card?: {
      /** Called after a card is created */
      insert?: (ctx: GenericMutationCtx<GenericDataModel>, card: Card) => void | Promise<void>;
    };
    /** Procedure lifecycle hooks */
    procedure?: {
      /** Called after a procedure is created */
      insert?: (
        ctx: GenericMutationCtx<GenericDataModel>,
        procedure: Procedure
      ) => void | Promise<void>;
    };
    /** Deliverable lifecycle hooks */
    deliverable?: {
      /** Called when a deliverable becomes ready and creates an evaluation */
      trigger?: (
        ctx: GenericMutationCtx<GenericDataModel>,
        evaluation: Evaluation
      ) => void | Promise<void>;
    };
    /** Evaluation lifecycle hooks */
    evaluation?: {
      /** Called when an evaluation completes */
      complete?: (
        ctx: GenericMutationCtx<GenericDataModel>,
        evaluation: Evaluation
      ) => void | Promise<void>;
    };
  };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a bridge instance bound to your component.
 *
 * @example
 * // convex/bridge.ts
 * const b = bridge(components.bridge)({
 *   subjects: { beneficiary: 'beneficiaries' },
 *   hooks: { read: authCheck, card: { insert: onInsert } },
 * });
 */
export function bridge(component: any) {
  return function boundBridge(config?: Config) {
    return bridgeInternal(component, config);
  };
}

/**
 * Internal implementation for bridge.
 */
function bridgeInternal(component: any, config?: Config) {
  const callbacks = new Map<string, CallbackHandler>();
  const hooks = config?.hooks;
  const subjects = config?.subjects;

  /**
   * Resolve subject data from bound host table.
   * Converts attributes array to key-value variables object.
   */
  async function resolveSubject(
    ctx: GenericQueryCtx<GenericDataModel>,
    subjectType: SubjectType,
    subjectId: string
  ): Promise<Record<string, unknown>> {
    const tableName = subjects?.[subjectType];
    if (!tableName) {
      throw new Error(`No table bound for subject type: ${subjectType}`);
    }

    // Query the host's table by UUID
    const doc = await (ctx.db as any)
      .query(tableName)
      .withIndex('by_uuid', (q: any) => q.eq('id', subjectId))
      .unique();

    if (!doc) return {};

    // Convert attributes array to key-value object
    const variables: Record<string, unknown> = {};
    if (Array.isArray(doc.attributes)) {
      for (const attr of doc.attributes) {
        if (attr && typeof attr === 'object' && 'slug' in attr && 'value' in attr) {
          variables[attr.slug as string] = attr.value;
        }
      }
    }
    return variables;
  }

  return {
    /**
     * Access the underlying component public API.
     */
    api: component.public,

    /**
     * Get configured hooks.
     */
    hooks: () => hooks,

    /**
     * Resolve subject data from bound host table.
     * Returns card values as key-value object for the given subject.
     *
     * @example
     * ```typescript
     * const vars = await b.resolve(ctx, 'beneficiary', 'ben_123');
     * // { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
     * ```
     */
    resolve: async (
      ctx: GenericQueryCtx<GenericDataModel>,
      subjectType: SubjectType,
      subjectId: string
    ): Promise<Record<string, unknown>> => {
      return resolveSubject(ctx, subjectType, subjectId);
    },

    /**
     * Register a callback handler for deliverable execution.
     *
     * @example
     * ```typescript
     * b.register('automation', async (deliverable, context) => {
     *   // Execute automation logic
     *   return { success: true };
     * });
     * ```
     */
    register: (type: string, handler: CallbackHandler): void => {
      callbacks.set(type, handler);
    },

    /**
     * Get a registered callback handler.
     */
    handler: (type: string): CallbackHandler | undefined => {
      return callbacks.get(type);
    },

    /**
     * Submit card values through a procedure.
     * Validates values against procedure schema and returns validation result.
     * Host app is responsible for writing validated values to its own tables.
     *
     * @example
     * ```typescript
     * const result = await b.submit(ctx, {
     *   procedureId: 'proc_123',
     *   organizationId: 'org_456',
     *   subjectType: 'beneficiary',
     *   subjectId: 'ben_789',
     *   values: { firstName: 'John', lastName: 'Doe' },
     * });
     * if (result.success) {
     *   // Write values to your tables
     * }
     * ```
     */
    submit: async (
      ctx: GenericMutationCtx<GenericDataModel>,
      submission: Submission
    ): Promise<SubmissionResult> => {
      return ctx.runMutation(component.public.procedure.submit, submission);
    },

    /**
     * Evaluate deliverables for a subject.
     * Checks which deliverables are ready and creates evaluations for them.
     * If `variables` is omitted and subjects are bound, auto-resolves from host table.
     *
     * @example
     * ```typescript
     * // With auto-resolution (subjects bound):
     * const readiness = await b.evaluate(ctx, {
     *   organizationId: 'org_456',
     *   subjectType: 'beneficiary',
     *   subjectId: 'ben_789',
     * });
     *
     * // With explicit variables:
     * const readiness = await b.evaluate(ctx, {
     *   organizationId: 'org_456',
     *   subjectType: 'beneficiary',
     *   subjectId: 'ben_789',
     *   variables: { firstName: 'John', lastName: 'Doe' },
     *   changedFields: ['email'],
     * });
     * ```
     */
    evaluate: async (
      ctx: GenericMutationCtx<GenericDataModel>,
      trigger: EvaluateTrigger
    ): Promise<DeliverableReadiness[]> => {
      let { variables } = trigger;

      // Auto-resolve if no variables provided and subjects are bound
      if (!variables && subjects?.[trigger.subjectType]) {
        variables = await resolveSubject(ctx, trigger.subjectType, trigger.subjectId);
      }

      return ctx.runMutation(component.public.deliverable.evaluate, {
        ...trigger,
        variables: variables ?? {},
      });
    },

    /**
     * Execute a callback for a triggered deliverable.
     * Looks up the registered handler and invokes it with the deliverable context.
     *
     * @example
     * ```typescript
     * const result = await b.execute(deliverable, {
     *   subjectType: 'beneficiary',
     *   subjectId: 'ben_789',
     *   variables: { firstName: 'John' },
     * });
     * ```
     */
    execute: async (
      deliverable: Deliverable,
      context: ExecutionContext
    ): Promise<ExecutionResult> => {
      const callbackType = deliverable.callbackAction?.split(':')[0] || 'default';
      const handler = callbacks.get(callbackType);

      if (!handler) {
        return {
          success: false,
          error: `No handler registered for callback type: ${callbackType}`,
        };
      }

      try {
        return await handler(deliverable, context);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  };
}
