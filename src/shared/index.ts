/**
 * @trestleinc/bridge - Shared exports
 *
 * Types and validators that can be used in any environment.
 */

// Validators (includes Convex validators and runtime type guards)
export {
  // Card types
  CardType,
  cardTypeValidator,
  isCardType,
  getCardTypeDisplayName,
  // Security levels
  SecurityLevel,
  securityLevelValidator,
  isSecurityLevel,
  getSecurityLevelOrder,
  // Procedure types
  ProcedureType,
  procedureTypeValidator,
  isProcedureType,
  getProcedureTypeDisplayName,
  // Subject types
  SubjectType,
  subjectTypeValidator,
  isSubjectType,
  getSubjectTypeDisplayName,
  // Operations
  Operation,
  operationValidator,
  isOperation,
  getOperationDisplayName,
  // Procedure card
  procedureCardValidator,
  // Evaluation status
  EvaluationStatus,
  evaluationStatusValidator,
  // Deliverable status
  DeliverableStatus,
  deliverableStatusValidator,
  // Conditions
  timeConditionValidator,
  dateConditionValidator,
  conditionsValidator,
  // Prerequisites
  prerequisiteValidator,
} from './validators.js';

// Type exports
export type {
  ProcedureCard,
  Conditions,
  Prerequisite,
} from './validators.js';

// Entity types
export type {
  Card,
  CardInput,
  Procedure,
  ProcedureInput,
  ProcedureUpdate,
  Deliverable,
  DeliverableInput,
  DeliverableUpdate,
  Evaluation,
  EvaluationContext,
  EvaluationResult,
  EvaluateDeliverablesInput,
  DeliverableReadiness,
  ListOptions,
  CardListOptions,
  ProcedureListOptions,
  DeliverableListOptions,
  EvaluationListOptions,
} from './types.js';
