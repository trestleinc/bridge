/**
 * @trestleinc/bridge - Server Builder
 *
 * Factory function to create a BridgeClient bound to a Convex component.
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
 * Configuration for the Bridge client.
 */
export interface BridgeConfig {
  hooks?: BridgeHooks;
}

// ============================================================================
// Bridge Client Class
// ============================================================================

/**
 * Client for interacting with the Bridge component.
 *
 * Provides namespaced APIs for:
 * - cards: Field definitions
 * - procedures: Data collection definitions
 * - deliverables: Reactive triggers
 * - evaluations: Execution management
 *
 * And convenience methods:
 * - submit: Validate and submit card values
 * - evaluate: Trigger deliverable evaluation
 * - execute: Run callback for a triggered deliverable
 * - register: Register callback handlers
 */
export class BridgeClient {
  private callbacks: Map<string, CallbackHandler> = new Map();

  constructor(
    private component: any,
    private hooks?: BridgeHooks
  ) {}

  /**
   * Get the underlying component for direct access to public API.
   */
  get api() {
    return this.component.public;
  }

  /**
   * Get configured hooks.
   */
  getHooks(): BridgeHooks | undefined {
    return this.hooks;
  }

  /**
   * Register a callback handler for deliverable execution.
   *
   * @example
   * ```typescript
   * client.register('automation', async (deliverable, context) => {
   *   // Execute automation logic
   *   return { success: true };
   * });
   * ```
   */
  register(type: string, handler: CallbackHandler): void {
    this.callbacks.set(type, handler);
  }

  /**
   * Get a registered callback handler.
   */
  handler(type: string): CallbackHandler | undefined {
    return this.callbacks.get(type);
  }

  /**
   * Submit card values through a procedure.
   * Validates values against procedure schema and returns validation result.
   * Host app is responsible for writing validated values to its own tables.
   *
   * @example
   * ```typescript
   * const result = await client.submit(ctx, {
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
  async submit(
    ctx: GenericMutationCtx<GenericDataModel>,
    submission: Submission
  ): Promise<SubmissionResult> {
    return ctx.runMutation(this.api.procedure.submit, submission);
  }

  /**
   * Evaluate deliverables for a subject.
   * Checks which deliverables are ready and creates evaluations for them.
   *
   * @example
   * ```typescript
   * const readiness = await client.evaluate(ctx, {
   *   organizationId: 'org_456',
   *   subjectType: 'beneficiary',
   *   subjectId: 'ben_789',
   *   variables: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
   *   changedFields: ['email'],
   * });
   * ```
   */
  async evaluate(
    ctx: GenericMutationCtx<GenericDataModel>,
    trigger: EvaluateTrigger
  ): Promise<DeliverableReadiness[]> {
    return ctx.runMutation(this.api.deliverable.evaluate, trigger);
  }

  /**
   * Execute a callback for a triggered deliverable.
   * Looks up the registered handler and invokes it with the deliverable context.
   *
   * @example
   * ```typescript
   * const result = await client.execute(deliverable, {
   *   subjectType: 'beneficiary',
   *   subjectId: 'ben_789',
   *   variables: { firstName: 'John' },
   * });
   * ```
   */
  async execute(deliverable: Deliverable, context: ExecutionContext): Promise<ExecutionResult> {
    // Determine callback type from deliverable
    const callbackType = deliverable.callbackAction?.split(':')[0] || 'default';
    const handler = this.callbacks.get(callbackType);

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
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Bridge client bound to your component.
 *
 * @example
 * ```typescript
 * // convex/bridge.ts
 * import { bridge } from '@trestleinc/bridge/server';
 * import { components } from './_generated/api';
 *
 * const client = bridge(components.bridge)();
 *
 * // Use in queries/mutations:
 * export const listCards = query({
 *   args: { organizationId: v.string() },
 *   handler: async (ctx, { organizationId }) => {
 *     return ctx.runQuery(client.api.listCards, { organizationId });
 *   },
 * });
 * ```
 */
export function bridge(component: any) {
  return function boundBridge(config?: BridgeConfig) {
    return new BridgeClient(component, config?.hooks);
  };
}
