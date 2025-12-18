/**
 * Type definitions and runtime guards for @trestleinc/bridge
 *
 * These are used across client, server, and component code for type safety.
 * Convex validators are defined inline within the component to avoid circular dependencies.
 */

// ============================================================================
// Variant (Card field types)
// ============================================================================

const variantValues = {
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

export type Variant = (typeof variantValues)[keyof typeof variantValues];

const variantDisplayNames: Record<Variant, string> = {
  STRING: 'Text',
  TEXT: 'Long Text',
  NUMBER: 'Number',
  BOOLEAN: 'Yes/No',
  DATE: 'Date',
  EMAIL: 'Email',
  URL: 'URL',
  PHONE: 'Phone',
  SSN: 'SSN',
  ADDRESS: 'Address',
  SUBJECT: 'Subject Reference',
  ARRAY: 'List',
};

export const Variant = {
  ...variantValues,
  valid: (value: string): value is Variant =>
    Object.values(variantValues).includes(value as Variant),
  display: (v: Variant): string => variantDisplayNames[v],
} as const;

// ============================================================================
// Security (Data sensitivity levels)
// ============================================================================

const securityValues = {
  PUBLIC: 'PUBLIC',
  CONFIDENTIAL: 'CONFIDENTIAL',
  RESTRICTED: 'RESTRICTED',
} as const;

export type Security = (typeof securityValues)[keyof typeof securityValues];

const securityOrder: Record<Security, number> = {
  PUBLIC: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
};

export const Security = {
  ...securityValues,
  valid: (value: string): value is Security =>
    Object.values(securityValues).includes(value as Security),
  order: (s: Security): number => securityOrder[s],
} as const;

// ============================================================================
// Source (Procedure data sources)
// ============================================================================

const sourceValues = {
  FORM: 'form',
  IMPORT: 'import',
  API: 'api',
} as const;

export type Source = (typeof sourceValues)[keyof typeof sourceValues];

const sourceDisplayNames: Record<Source, string> = {
  form: 'Form',
  import: 'Import',
  api: 'API',
};

export const Source = {
  ...sourceValues,
  valid: (value: string): value is Source => Object.values(sourceValues).includes(value as Source),
  display: (s: Source): string => sourceDisplayNames[s],
} as const;

// ============================================================================
// Subject (Entity types - defined by host application)
// ============================================================================

/**
 * Subject type is a generic string - the host application defines their own subjects.
 * Examples: 'beneficiary', 'event', 'eventInstance', 'user', 'project', etc.
 */
export type Subject = string;

// ============================================================================
// Operation (CRUD operations)
// ============================================================================

const operationValues = {
  CREATE: 'create',
  UPDATE: 'update',
} as const;

export type Operation = (typeof operationValues)[keyof typeof operationValues];

const operationDisplayNames: Record<Operation, string> = {
  create: 'Create',
  update: 'Update',
};

export const Operation = {
  ...operationValues,
  valid: (value: string): value is Operation =>
    Object.values(operationValues).includes(value as Operation),
  display: (o: Operation): string => operationDisplayNames[o],
} as const;

// ============================================================================
// EvaluationStatus
// ============================================================================

const evaluationStatusValues = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type EvaluationStatus = (typeof evaluationStatusValues)[keyof typeof evaluationStatusValues];

export const EvaluationStatus = {
  ...evaluationStatusValues,
} as const;

// ============================================================================
// DeliverableStatus
// ============================================================================

const deliverableStatusValues = {
  ACTIVE: 'active',
  PAUSED: 'paused',
} as const;

export type DeliverableStatus =
  (typeof deliverableStatusValues)[keyof typeof deliverableStatusValues];

export const DeliverableStatus = {
  ...deliverableStatusValues,
} as const;

// ============================================================================
// Composite Types (TypeScript only, no validators)
// ============================================================================

export type Schedule = {
  at?: number;
  cron?: string;
};

export type Required = {
  cardIds: string[];
  deliverableIds: string[];
};
