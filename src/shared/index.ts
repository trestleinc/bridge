/**
 * @trestleinc/bridge - Shared exports
 *
 * Types and utilities that can be used in any environment.
 */

// Entity types
export type {
  AggregatedContext,
  CallbackHandler,
  Card,
  CardInput,
  CardListOptions,
  Deliverable,
  DeliverableInput,
  DeliverableListOptions,
  // Deliverable operation types
  DeliverableOperation,
  DeliverableOperations,
  DeliverableResult,
  DeliverableUpdate,
  EvaluateDeliverablesInput,
  EvaluateTrigger,
  Evaluation,
  EvaluationContext,
  EvaluationListOptions,
  EvaluationResult,
  // Execution types
  ExecutionContext,
  ExecutionResult,
  FieldError,
  ListOptions,
  // Context aggregation types
  ParentRelation,
  Procedure,
  ProcedureCard,
  ProcedureInput,
  ProcedureListOptions,
  ProcedureUpdate,
  SubjectConfig,
  // Submission types
  Submission,
  SubmissionResult,
} from "./types";
// Composite types
// Re-export types from validators
export type {
  CardId,
  DeliverableId,
  DeliverableStatus as DeliverableStatusType,
  Duration,
  EvaluationId,
  EvaluationStatus as EvaluationStatusType,
  Operation as OperationType,
  OrganizationId,
  ProcedureId,
  Required,
  Schedule,
  Security as SecurityType,
  Source as SourceType,
  Subject,
  Subject as SubjectType,
  Variant as VariantType,
} from "./validators";
// Enums with attached methods
// Utility functions
export {
  createId,
  // Deliverable status
  DeliverableStatus,
  // Evaluation status
  EvaluationStatus,
  formatDuration,
  // CRUD operations
  Operation,
  parseDuration,
  // Security levels
  Security,
  // Procedure data sources
  Source,
  // Card field types
  Variant,
} from "./validators";
