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
  DeliverableResult,
  ExecutionContext,
  ExecutionResult,
  CallbackHandler,
  Subject,
  SubjectConfig,
  AggregatedContext,
} from '$/shared/types.js';

// ============================================================================
// Configuration Interface
// ============================================================================

/**
 * Configuration for the bridge instance.
 * Hooks use verb-based naming with entity namespacing.
 */
export interface Config {
  /**
   * Map subjects to host tables for automatic context resolution.
   * Can be a simple table name string or a full SubjectConfig with parent relationships.
   *
   * @example
   * ```typescript
   * // Simple: just table names
   * subjects: { beneficiary: 'beneficiaries' }
   *
   * // Full: with parent relationships for aggregation
   * subjects: {
   *   beneficiary: 'beneficiaries',
   *   event: {
   *     table: 'events',
   *     parents: [{ field: 'beneficiaryId', subject: 'beneficiary' }],
   *   },
   *   eventInstance: {
   *     table: 'eventInstances',
   *     parents: [
   *       { field: 'eventId', subject: 'event' },
   *       { field: 'beneficiaryId', subject: 'beneficiary' },
   *     ],
   *   },
   * }
   * ```
   */
  subjects?: Partial<Record<Subject, string | SubjectConfig>>;
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
 * Get table name from subject config (handles string or SubjectConfig).
 */
function getTableName(subjectConfig: string | SubjectConfig | undefined): string | undefined {
  if (!subjectConfig) return undefined;
  return typeof subjectConfig === 'string' ? subjectConfig : subjectConfig.table;
}

/**
 * Get parent relationships from subject config.
 */
function getParents(subjectConfig: string | SubjectConfig | undefined) {
  if (!subjectConfig || typeof subjectConfig === 'string') return [];
  return subjectConfig.parents ?? [];
}

/**
 * Internal implementation for bridge.
 */
function bridgeInternal(component: any, config?: Config) {
  const callbacks = new Map<string, CallbackHandler>();
  const hooks = config?.hooks;
  const subjects = config?.subjects;

  /**
   * Fetch a subject document from the host table.
   * Returns the raw document (not just attributes).
   */
  async function fetchSubjectDoc(
    ctx: GenericQueryCtx<GenericDataModel>,
    subject: Subject,
    subjectId: string
  ): Promise<Record<string, unknown> | null> {
    const subjectConfig = subjects?.[subject];
    const tableName = getTableName(subjectConfig);
    if (!tableName) {
      return null;
    }

    const doc = await (ctx.db as any)
      .query(tableName)
      .withIndex('by_uuid', (q: any) => q.eq('id', subjectId))
      .unique();

    return doc ?? null;
  }

  /**
   * Extract variables from a document's attributes array.
   */
  function extractVariables(doc: Record<string, unknown>): Record<string, unknown> {
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

  /**
   * Resolve subject data from bound host table.
   * Converts attributes array to key-value variables object.
   */
  async function resolveSubject(
    ctx: GenericQueryCtx<GenericDataModel>,
    subject: Subject,
    subjectId: string
  ): Promise<Record<string, unknown>> {
    const doc = await fetchSubjectDoc(ctx, subject, subjectId);
    if (!doc) return {};
    return extractVariables(doc);
  }

  /**
   * Recursively aggregate context from a subject and all its parents.
   * Parents are processed in config order, then current subject is applied last (highest priority).
   */
  async function aggregateSubject(
    ctx: GenericQueryCtx<GenericDataModel>,
    subject: string,
    subjectId: string,
    visited: Set<string> = new Set()
  ): Promise<{
    variables: Record<string, unknown>;
    subjects: Record<string, Record<string, unknown>>;
  }> {
    // Prevent infinite loops
    const key = `${subject}:${subjectId}`;
    if (visited.has(key)) {
      return { variables: {}, subjects: {} };
    }
    visited.add(key);

    // Fetch the current subject document
    const doc = await fetchSubjectDoc(ctx, subject, subjectId);
    if (!doc) {
      return { variables: {}, subjects: {} };
    }

    // Get current subject's variables
    const currentVariables = extractVariables(doc);
    const subjectsData: Record<string, Record<string, unknown>> = {
      [subject]: doc,
    };

    // Get parent relationships
    const subjectConfig = subjects?.[subject];
    const parents = getParents(subjectConfig);

    // Merge parent data first (in config order), then current subject last
    let mergedVariables: Record<string, unknown> = {};

    for (const parent of parents) {
      const parentId = doc[parent.field] as string | undefined;
      if (parentId) {
        const parentResult = await aggregateSubject(ctx, parent.subject, parentId, visited);
        // Parents merge in order - later parents override earlier ones
        mergedVariables = { ...mergedVariables, ...parentResult.variables };
        Object.assign(subjectsData, parentResult.subjects);
      }
    }

    // Current subject variables override all parent variables
    mergedVariables = { ...mergedVariables, ...currentVariables };

    return {
      variables: mergedVariables,
      subjects: subjectsData,
    };
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
      subject: Subject,
      subjectId: string
    ): Promise<Record<string, unknown>> => {
      return resolveSubject(ctx, subject, subjectId);
    },

    /**
     * Aggregate context from a subject and all its parent subjects.
     * Fetches and merges data from the full subject hierarchy based on configured parent relationships.
     *
     * Priority rules for merging:
     * - Parents are processed in config order (earlier parents get overwritten by later ones)
     * - Current subject has highest priority (overwrites all parent values)
     *
     * @example
     * ```typescript
     * const context = await b.aggregate(ctx, {
     *   subject: 'eventInstance',
     *   subjectId: 'inst_123',
     * });
     * // Returns:
     * // {
     * //   subject: 'eventInstance',
     * //   subjectId: 'inst_123',
     * //   variables: { firstName: 'John', eventName: 'Workshop', ... },
     * //   subjects: {
     * //     beneficiary: { id: 'ben_123', ... },
     * //     event: { id: 'evt_456', ... },
     * //     eventInstance: { id: 'inst_123', ... },
     * //   }
     * // }
     * ```
     */
    aggregate: async (
      ctx: GenericQueryCtx<GenericDataModel>,
      input: { subject: string; subjectId: string }
    ): Promise<AggregatedContext> => {
      const result = await aggregateSubject(ctx, input.subject, input.subjectId);
      return {
        subject: input.subject,
        subjectId: input.subjectId,
        variables: result.variables,
        subjects: result.subjects,
      };
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
     *   subject: 'beneficiary',
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
     * If `variables` is omitted and subjects are bound, auto-aggregates from host tables.
     *
     * @example
     * ```typescript
     * // With auto-aggregation (subjects bound with parent relationships):
     * const readiness = await b.evaluate(ctx, {
     *   organizationId: 'org_456',
     *   subject: 'eventInstance',
     *   subjectId: 'inst_789',
     * });
     * // Variables are automatically aggregated from beneficiary → event → eventInstance
     *
     * // With explicit variables:
     * const readiness = await b.evaluate(ctx, {
     *   organizationId: 'org_456',
     *   subject: 'beneficiary',
     *   subjectId: 'ben_789',
     *   variables: { firstName: 'John', lastName: 'Doe' },
     *   mutated: ['email'],
     * });
     * ```
     */
    evaluate: async (
      ctx: GenericMutationCtx<GenericDataModel>,
      trigger: EvaluateTrigger
    ): Promise<DeliverableResult[]> => {
      let { variables } = trigger;

      // Auto-aggregate if no variables provided and subjects are bound
      if (!variables && subjects?.[trigger.subject]) {
        const aggregated = await aggregateSubject(ctx, trigger.subject, trigger.subjectId);
        variables = aggregated.variables;
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
     *   subject: 'beneficiary',
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
