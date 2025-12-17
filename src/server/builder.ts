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
} from '$/shared/types.js';

// ============================================================================
// Hooks Interface
// ============================================================================

/**
 * Hooks for authorization and side effects.
 */
export interface BridgeHooks {
  /** Called before read operations for authorization */
  evalRead?: (
    ctx: GenericQueryCtx<GenericDataModel>,
    organizationId: string
  ) => void | Promise<void>;

  /** Called before write operations for authorization */
  evalWrite?: (
    ctx: GenericMutationCtx<GenericDataModel>,
    organizationId: string
  ) => void | Promise<void>;

  /** Called after a card is created */
  onCardCreated?: (ctx: GenericMutationCtx<GenericDataModel>, card: Card) => void | Promise<void>;

  /** Called after a procedure is created */
  onProcedureCreated?: (
    ctx: GenericMutationCtx<GenericDataModel>,
    procedure: Procedure
  ) => void | Promise<void>;

  /** Called when a deliverable becomes ready and creates an evaluation */
  onDeliverableTriggered?: (
    ctx: GenericMutationCtx<GenericDataModel>,
    evaluation: Evaluation
  ) => void | Promise<void>;

  /** Called when an evaluation completes */
  onEvaluationCompleted?: (
    ctx: GenericMutationCtx<GenericDataModel>,
    evaluation: Evaluation
  ) => void | Promise<void>;
}

/**
 * Configuration for the bridge instance.
 */
export interface BridgeConfig {
  hooks?: BridgeHooks;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a bridge instance bound to your component.
 *
 * @example
 * ```typescript
 * // convex/bridge.ts
 * import { bridge } from '@trestleinc/bridge/server';
 * import { components } from './_generated/api';
 *
 * export const b = bridge(components.bridge)({
 *   hooks: { evalRead: ..., evalWrite: ... }
 * });
 *
 * // Register callbacks
 * b.register('automation', async (deliverable, ctx) => { ... });
 *
 * // Use in mutations
 * await b.submit(ctx, { procedureId, subjectId, values });
 * ```
 */
export function bridge(component: any) {
  return function boundBridge(config?: BridgeConfig) {
    return bridgeInternal(component, config);
  };
}

/**
 * Internal implementation for bridge.
 */
function bridgeInternal(component: any, config?: BridgeConfig) {
  const callbacks = new Map<string, CallbackHandler>();
  const hooks = config?.hooks;

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
     *
     * @example
     * ```typescript
     * const readiness = await b.evaluate(ctx, {
     *   organizationId: 'org_456',
     *   subjectType: 'beneficiary',
     *   subjectId: 'ben_789',
     *   variables: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
     *   changedFields: ['email'],
     * });
     * ```
     */
    evaluate: async (
      ctx: GenericMutationCtx<GenericDataModel>,
      trigger: EvaluateTrigger
    ): Promise<DeliverableReadiness[]> => {
      return ctx.runMutation(component.public.deliverable.evaluate, trigger);
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
