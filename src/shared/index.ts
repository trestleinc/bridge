/**
 * @trestleinc/bridge - Shared exports
 *
 * Types and utilities that can be used in any environment.
 */

// Enums with attached methods
export {
  // Card field types
  Variant,
  // Security levels
  Security,
  // Procedure data sources
  Source,
  // CRUD operations
  Operation,
  // Evaluation status
  EvaluationStatus,
  // Deliverable status
  DeliverableStatus,
} from "./validators.js";

// Composite types
export type { Schedule, Required, Subject } from "./validators.js";

// Re-export types from validators
export type {
  Variant as VariantType,
  Security as SecurityType,
  Source as SourceType,
  Subject as SubjectType,
  Operation as OperationType,
  EvaluationStatus as EvaluationStatusType,
  DeliverableStatus as DeliverableStatusType,
} from "./validators.js";

// Entity types
export type {
  Card,
  CardInput,
  ProcedureCard,
  Procedure,
  ProcedureInput,
  ProcedureUpdate,
  // Deliverable operation types
  DeliverableOperation,
  DeliverableOperations,
  Deliverable,
  DeliverableInput,
  DeliverableUpdate,
  Evaluation,
  EvaluationContext,
  EvaluationResult,
  EvaluateDeliverablesInput,
  DeliverableResult,
  ListOptions,
  CardListOptions,
  ProcedureListOptions,
  DeliverableListOptions,
  EvaluationListOptions,
  // Submission types
  Submission,
  FieldError,
  SubmissionResult,
  // Execution types
  ExecutionContext,
  ExecutionResult,
  CallbackHandler,
  EvaluateTrigger,
  // Context aggregation types
  ParentRelation,
  SubjectConfig,
  AggregatedContext,
} from "./types.js";
