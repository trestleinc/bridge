/**
 * Shared types for @trestleinc/bridge
 *
 * These types are used across client, server, and component code.
 * They are safe to import in any environment (browser, Node.js, Convex).
 */

import type {
  CardType,
  SecurityLevel,
  ProcedureType,
  SubjectType,
  Operation,
  ProcedureCard,
  Conditions,
  Prerequisite,
  EvaluationStatus,
  DeliverableStatus,
} from './validators.js';

// Re-export validator types for convenience
export type {
  CardType,
  SecurityLevel,
  ProcedureType,
  SubjectType,
  Operation,
  ProcedureCard,
  Conditions,
  Prerequisite,
  EvaluationStatus,
  DeliverableStatus,
};

// ============================================================================
// Card (Field Definition)
// ============================================================================

/**
 * A Card represents a single data field definition with type and security metadata.
 * Cards are the atomic building blocks of the Bridge data model.
 */
export interface Card {
  id: string;
  organizationId: string;
  slug: string;
  label: string;
  type: CardType;
  securityLevel: SecurityLevel;
  subjectType: SubjectType;
  createdBy: string;
  createdAt: number;
}

export interface CardInput {
  organizationId: string;
  slug: string;
  label: string;
  type: CardType;
  securityLevel: SecurityLevel;
  subjectType: SubjectType;
  createdBy: string;
}

// ============================================================================
// Procedure (Data Collection Definition)
// ============================================================================

/**
 * A Procedure defines how data is collected through forms, imports, or APIs.
 * It specifies which cards to collect and where to write the values.
 */
export interface Procedure {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: ProcedureType;
  subject?: {
    type: SubjectType;
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
  type: ProcedureType;
  subject?: {
    type: SubjectType;
    operation: Operation;
  };
  cards: ProcedureCard[];
}

export interface ProcedureUpdate {
  name?: string;
  description?: string;
  type?: ProcedureType;
  cards?: ProcedureCard[];
}

// ============================================================================
// Deliverable (Reactive Trigger)
// ============================================================================

/**
 * A Deliverable defines when automated actions should be triggered.
 * When all required cards are present and conditions are met,
 * the deliverable becomes "ready" and can invoke callbacks.
 */
export interface Deliverable {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  subjectType: SubjectType;
  requiredCards: string[]; // Card slugs that must be present
  callbackUrl?: string; // HTTP callback when triggered
  callbackAction?: string; // Convex action reference
  prerequisites?: Prerequisite[];
  conditions?: Conditions;
  status: DeliverableStatus;
  createdAt: number;
  updatedAt: number;
}

export interface DeliverableInput {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  subjectType: SubjectType;
  requiredCards: string[];
  callbackUrl?: string;
  callbackAction?: string;
  prerequisites?: Prerequisite[];
  conditions?: Conditions;
}

export interface DeliverableUpdate {
  name?: string;
  description?: string;
  requiredCards?: string[];
  status?: DeliverableStatus;
  conditions?: Conditions;
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
  context: EvaluationContext;
  variables: Record<string, unknown>;
  status: EvaluationStatus;
  scheduledFor?: number;
  result?: EvaluationResult;
  createdAt: number;
  completedAt?: number;
}

/**
 * Context about what triggered the evaluation.
 */
export interface EvaluationContext {
  subjectType: SubjectType;
  subjectId: string;
  changedFields?: string[];
}

/**
 * Result of an evaluation execution.
 */
export interface EvaluationResult {
  success: boolean;
  duration?: number;
  error?: string;
}

// ============================================================================
// Evaluation Request/Response
// ============================================================================

/**
 * Input for evaluating deliverables.
 */
export interface EvaluateDeliverablesInput {
  organizationId: string;
  subjectType: SubjectType;
  subjectId: string;
  variables: Record<string, unknown>;
  changedFields?: string[];
}

/**
 * Result of checking a deliverable's readiness.
 */
export interface DeliverableReadiness {
  deliverableId: string;
  ready: boolean;
  missingCards: string[];
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
  subjectType?: SubjectType;
}

export interface ProcedureListOptions extends ListOptions {
  type?: ProcedureType;
}

export interface DeliverableListOptions extends ListOptions {
  subjectType?: SubjectType;
}

export interface EvaluationListOptions extends ListOptions {
  status?: EvaluationStatus;
}
