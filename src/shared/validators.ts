/**
 * Convex validators for @trestleinc/bridge
 *
 * These validators are used in both component schema and public API definitions.
 */

import { v } from 'convex/values';

// ============================================================================
// Card Types (formerly Sigil Types)
// ============================================================================

export const CardType = {
  STRING: 'STRING',
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  EMAIL: 'EMAIL',
  URL: 'URL',
  PHONE: 'PHONE',
  SSN: 'SSN',
  ADDRESS: 'ADDRESS',
  SUBJECT: 'SUBJECT',
  ARRAY: 'ARRAY',
} as const;

export type CardType = (typeof CardType)[keyof typeof CardType];

export const cardTypeValidator = v.union(
  v.literal('STRING'),
  v.literal('TEXT'),
  v.literal('NUMBER'),
  v.literal('BOOLEAN'),
  v.literal('DATE'),
  v.literal('EMAIL'),
  v.literal('URL'),
  v.literal('PHONE'),
  v.literal('SSN'),
  v.literal('ADDRESS'),
  v.literal('SUBJECT'),
  v.literal('ARRAY')
);

export function isCardType(type: string): type is CardType {
  return Object.values(CardType).includes(type as CardType);
}

export function getCardTypeDisplayName(type: CardType): string {
  const displayNames: Record<CardType, string> = {
    [CardType.STRING]: 'Text',
    [CardType.TEXT]: 'Long Text',
    [CardType.NUMBER]: 'Number',
    [CardType.BOOLEAN]: 'Yes/No',
    [CardType.DATE]: 'Date',
    [CardType.EMAIL]: 'Email',
    [CardType.URL]: 'URL',
    [CardType.PHONE]: 'Phone',
    [CardType.SSN]: 'SSN',
    [CardType.ADDRESS]: 'Address',
    [CardType.SUBJECT]: 'Subject Reference',
    [CardType.ARRAY]: 'List',
  };
  return displayNames[type];
}

// ============================================================================
// Security Levels
// ============================================================================

export const SecurityLevel = {
  PUBLIC: 'PUBLIC',
  CONFIDENTIAL: 'CONFIDENTIAL',
  RESTRICTED: 'RESTRICTED',
} as const;

export type SecurityLevel = (typeof SecurityLevel)[keyof typeof SecurityLevel];

export const securityLevelValidator = v.union(
  v.literal('PUBLIC'),
  v.literal('CONFIDENTIAL'),
  v.literal('RESTRICTED')
);

export function isSecurityLevel(level: string): level is SecurityLevel {
  return Object.values(SecurityLevel).includes(level as SecurityLevel);
}

export function getSecurityLevelOrder(level: SecurityLevel): number {
  const order: Record<SecurityLevel, number> = {
    [SecurityLevel.PUBLIC]: 1,
    [SecurityLevel.CONFIDENTIAL]: 2,
    [SecurityLevel.RESTRICTED]: 3,
  };
  return order[level];
}

// ============================================================================
// Procedure Types
// ============================================================================

export const ProcedureType = {
  FORM: 'form',
  IMPORT: 'import',
  API: 'api',
} as const;

export type ProcedureType = (typeof ProcedureType)[keyof typeof ProcedureType];

export const procedureTypeValidator = v.union(
  v.literal('form'),
  v.literal('import'),
  v.literal('api')
);

export function isProcedureType(value: string): value is ProcedureType {
  return Object.values(ProcedureType).includes(value as ProcedureType);
}

export function getProcedureTypeDisplayName(type: ProcedureType): string {
  const displayNames: Record<ProcedureType, string> = {
    [ProcedureType.FORM]: 'Form',
    [ProcedureType.IMPORT]: 'Import',
    [ProcedureType.API]: 'API',
  };
  return displayNames[type];
}

// ============================================================================
// Subject Types
// ============================================================================

export const SubjectType = {
  BENEFICIARY: 'beneficiary',
  EVENT: 'event',
  EVENT_INSTANCE: 'eventInstance',
} as const;

export type SubjectType = (typeof SubjectType)[keyof typeof SubjectType];

export const subjectTypeValidator = v.union(
  v.literal('beneficiary'),
  v.literal('event'),
  v.literal('eventInstance')
);

export function isSubjectType(value: string): value is SubjectType {
  return Object.values(SubjectType).includes(value as SubjectType);
}

export function getSubjectTypeDisplayName(type: SubjectType): string {
  const displayNames: Record<SubjectType, string> = {
    [SubjectType.BENEFICIARY]: 'Beneficiary',
    [SubjectType.EVENT]: 'Event',
    [SubjectType.EVENT_INSTANCE]: 'Event Instance',
  };
  return displayNames[type];
}

// ============================================================================
// Operations
// ============================================================================

export const Operation = {
  CREATE: 'create',
  UPDATE: 'update',
} as const;

export type Operation = (typeof Operation)[keyof typeof Operation];

export const operationValidator = v.union(v.literal('create'), v.literal('update'));

export function isOperation(value: string): value is Operation {
  return Object.values(Operation).includes(value as Operation);
}

export function getOperationDisplayName(operation: Operation): string {
  const displayNames: Record<Operation, string> = {
    [Operation.CREATE]: 'Create',
    [Operation.UPDATE]: 'Update',
  };
  return displayNames[operation];
}

// ============================================================================
// Procedure Card (card reference within a procedure)
// ============================================================================

export const procedureCardValidator = v.object({
  slug: v.string(),
  label: v.string(),
  type: cardTypeValidator,
  securityLevel: securityLevelValidator,
  required: v.boolean(),
  writeTo: v.object({
    path: v.string(),
  }),
  targetSubjectType: v.optional(subjectTypeValidator),
  requiredCards: v.optional(v.array(v.string())),
});

export type ProcedureCard = {
  slug: string;
  label: string;
  type: CardType;
  securityLevel: SecurityLevel;
  required: boolean;
  writeTo: { path: string };
  targetSubjectType?: SubjectType;
  requiredCards?: string[];
};

// ============================================================================
// Evaluation Status
// ============================================================================

export const EvaluationStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type EvaluationStatus = (typeof EvaluationStatus)[keyof typeof EvaluationStatus];

export const evaluationStatusValidator = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed')
);

// ============================================================================
// Deliverable Status
// ============================================================================

export const DeliverableStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
} as const;

export type DeliverableStatus = (typeof DeliverableStatus)[keyof typeof DeliverableStatus];

export const deliverableStatusValidator = v.union(v.literal('active'), v.literal('paused'));

// ============================================================================
// Condition Validators
// ============================================================================

export const timeConditionValidator = v.object({
  after: v.string(), // HH:mm format
  before: v.optional(v.string()), // HH:mm format
});

export const dateConditionValidator = v.object({
  daysBeforeEvent: v.optional(v.number()),
  hoursBeforeEvent: v.optional(v.number()),
});

export const conditionsValidator = v.object({
  time: v.optional(timeConditionValidator),
  date: v.optional(dateConditionValidator),
  dayOfWeek: v.optional(v.array(v.number())), // 0-6, Sunday = 0
});

export type Conditions = {
  time?: { after: string; before?: string };
  date?: { daysBeforeEvent?: number; hoursBeforeEvent?: number };
  dayOfWeek?: number[];
};

// ============================================================================
// Prerequisite Validator
// ============================================================================

export const prerequisiteValidator = v.object({
  deliverableId: v.string(),
  scope: subjectTypeValidator,
});

export type Prerequisite = {
  deliverableId: string;
  scope: SubjectType;
};
