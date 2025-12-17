/**
 * @trestleinc/bridge - Server Builder
 *
 * Factory function to create a BridgeClient bound to a Convex component.
 */

import type { GenericMutationCtx, GenericQueryCtx, GenericDataModel } from 'convex/server';
import type { Card, Procedure, Evaluation } from '$/shared/types.js';

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
 * - scheduling: Evaluation management
 */
export class BridgeClient {
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
