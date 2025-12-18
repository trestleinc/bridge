/**
 * Shared types for @trestleinc/bridge
 *
 * These types are used across client, server, and component code.
 * They are safe to import in any environment (browser, Node.js, Convex).
 */

import type {
  Variant,
  Security,
  Source,
  Subject,
  Operation,
  Schedule,
  Required,
  EvaluationStatus,
  DeliverableStatus,
} from './validators.js';

// Re-export validator types for convenience
export type {
  Variant,
  Security,
  Source,
  Subject,
  Operation,
  Schedule,
  Required,
  EvaluationStatus,
  DeliverableStatus,
};

// ============================================================================
// Card (Field Definition)
// ============================================================================

/**
 * A Card represents a single data field definition with variant and security metadata.
 * Cards are the atomic building blocks of the Bridge data model.
 */
export interface Card {
  id: string;
  organizationId: string;
  slug: string;
  label: string;
  variant: Variant;
  security: Security;
  subject: Subject;
  createdBy: string;
  createdAt: number;
}

export interface CardInput {
  organizationId: string;
  slug: string;
  label: string;
  variant: Variant;
  security: Security;
  subject: Subject;
  createdBy: string;
}

// ============================================================================
// Procedure (Data Collection Definition)
// ============================================================================

/**
 * A card reference within a procedure, with collection-specific config.
 */
export interface ProcedureCard {
  cardId: string;
  required: boolean;
  writeTo: { path: string };
}

/**
 * A Procedure defines how data is collected through forms, imports, or APIs.
 * It specifies which cards to collect and where to write the values.
 */
export interface Procedure {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  source: Source;
  subject?: {
    type: Subject;
    operation: Operation;
  };
  cards: ProcedureCard[];
  createdAt: number;
  updatedAt: number;
}

export interface ProcedureInput {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  source: Source;
  subject?: {
    type: Subject;
    operation: Operation;
  };
  cards: ProcedureCard[];
}

export interface ProcedureUpdate {
  name?: string;
  description?: string;
  source?: Source;
  cards?: ProcedureCard[];
}

// ============================================================================
// Deliverable (Reactive Trigger)
// ============================================================================

/**
 * Operation-specific configuration for a deliverable.
 * Each operation (create/update/delete) can have its own prerequisites and callback.
 */
export interface DeliverableOperation {
  required: Required;
  callbackAction?: string;
  callbackUrl?: string;
}

/**
 * Map of operations to their configurations.
 * At least one operation should be defined.
 */
export interface DeliverableOperations {
  create?: DeliverableOperation;
  update?: DeliverableOperation;
  delete?: DeliverableOperation;
}

/**
 * A Deliverable defines when automated actions should be triggered.
 * Operations define per-operation prerequisites and callbacks.
 * Optional scheduling via UTC timestamp or cron.
 */
export interface Deliverable {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  subject: Subject;
  operations: DeliverableOperations;
  schedule?: Schedule;
  status: DeliverableStatus;
  createdAt: number;
  updatedAt: number;
}

export interface DeliverableInput {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  subject: Subject;
  operations: DeliverableOperations;
  schedule?: Schedule;
}

export interface DeliverableUpdate {
  name?: string;
  description?: string;
  operations?: DeliverableOperations;
  status?: DeliverableStatus;
  schedule?: Schedule;
}

// ============================================================================
// Evaluation (Execution Record)
// ============================================================================

/**
 * An Evaluation tracks when a deliverable was triggered and its execution state.
 */
export interface Evaluation {
  id: string;
  deliverableId: string;
  organizationId: string;
  operation: Operation;
  context: EvaluationContext;
  variables: Record<string, unknown>;
  status: EvaluationStatus;
  scheduledFor?: number;
  scheduled?: string;
  started?: number;
  result?: EvaluationResult;
  createdAt: number;
  completedAt?: number;
}

/**
 * Context about what triggered the evaluation.
 */
export interface EvaluationContext {
  subject: Subject;
  subjectId: string;
  mutated?: string[];
}

/**
 * Result of an evaluation execution.
 */
export interface EvaluationResult {
  success: boolean;
  duration?: number;
  error?: string;
  logs?: string[];
  artifacts?: string[];
}

// ============================================================================
// Evaluation Request/Response
// ============================================================================

/**
 * Input for evaluating deliverables.
 */
export interface EvaluateDeliverablesInput {
  organizationId: string;
  subject: Subject;
  subjectId: string;
  variables: Record<string, unknown>;
  mutated?: string[];
}

/**
 * Result of checking a deliverable's readiness.
 */
export interface DeliverableResult {
  deliverableId: string;
  ready: boolean;
  unmet: {
    cardIds: string[];
    deliverableIds: string[];
  };
  evaluationId?: string;
}

// ============================================================================
// List Options
// ============================================================================

export interface ListOptions {
  limit?: number;
  cursor?: string;
}

export interface CardListOptions extends ListOptions {
  subject?: Subject;
}

export interface ProcedureListOptions extends ListOptions {
  source?: Source;
}

export interface DeliverableListOptions extends ListOptions {
  subject?: Subject;
}

export interface EvaluationListOptions extends ListOptions {
  status?: EvaluationStatus;
}

// ============================================================================
// Submission (Procedure Card Values)
// ============================================================================

/**
 * Input for submitting card values through a procedure.
 */
export interface Submission {
  procedureId: string;
  organizationId: string;
  subject: Subject;
  subjectId: string;
  values: Record<string, unknown>;
}

/**
 * Validation error for a specific field.
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Result of validating and submitting card values.
 */
export interface SubmissionResult {
  success: boolean;
  errors?: FieldError[];
  validated: string[];
}

// ============================================================================
// Execution (Deliverable Callbacks)
// ============================================================================

/**
 * Context passed to callback handlers when executing a deliverable.
 */
export interface ExecutionContext {
  subject: Subject;
  subjectId: string;
  variables: Record<string, unknown>;
  mutated?: string[];
}

/**
 * Result from a callback handler execution.
 */
export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Callback handler function type.
 */
export type CallbackHandler = (
  deliverable: Deliverable,
  context: ExecutionContext
) => Promise<ExecutionResult>;

/**
 * Input for triggering deliverable evaluation.
 * If `variables` is omitted and subjects are bound, Bridge will auto-resolve from the bound table.
 */
export interface EvaluateTrigger {
  organizationId: string;
  subject: Subject;
  subjectId: string;
  operation: Operation;
  variables?: Record<string, unknown>;
  mutated?: string[];
}

// ============================================================================
// Context Aggregation
// ============================================================================

/**
 * Configuration for a subject's parent relationships.
 */
export interface ParentRelation {
  /** Field name on the document that contains the parent ID (e.g., 'eventId') */
  field: string;
  /** The subject type of the parent (e.g., 'event') */
  subject: Subject;
}

/**
 * Full configuration for a subject binding.
 * Includes table name and optional parent relationships for aggregation.
 */
export interface SubjectConfig {
  /** Host table name */
  table: string;
  /** Parent relationships for context aggregation */
  parents?: ParentRelation[];
}

/**
 * Aggregated context from multiple related subjects.
 * Used when evaluating deliverables to provide full context from the subject hierarchy.
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
export interface AggregatedContext {
  /** The primary subject type */
  subject: string;
  /** The primary subject ID */
  subjectId: string;
  /** Merged variables from all subjects (parents first, then current subject) */
  variables: Record<string, unknown>;
  /** Raw data for each resolved subject, keyed by subject type */
  subjects: Record<string, Record<string, unknown>>;
}
