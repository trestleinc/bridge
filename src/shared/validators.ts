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
  STRING: "STRING",
  TEXT: "TEXT",
  NUMBER: "NUMBER",
  BOOLEAN: "BOOLEAN",
  DATE: "DATE",
  EMAIL: "EMAIL",
  URL: "URL",
  PHONE: "PHONE",
  SSN: "SSN",
  ADDRESS: "ADDRESS",
  SUBJECT: "SUBJECT",
  ARRAY: "ARRAY",
} as const;

export type Variant = (typeof variantValues)[keyof typeof variantValues];

const variantDisplayNames: Record<Variant, string> = {
  STRING: "Text",
  TEXT: "Long Text",
  NUMBER: "Number",
  BOOLEAN: "Yes/No",
  DATE: "Date",
  EMAIL: "Email",
  URL: "URL",
  PHONE: "Phone",
  SSN: "SSN",
  ADDRESS: "Address",
  SUBJECT: "Subject Reference",
  ARRAY: "List",
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
  PUBLIC: "PUBLIC",
  CONFIDENTIAL: "CONFIDENTIAL",
  RESTRICTED: "RESTRICTED",
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
  FORM: "form",
  IMPORT: "import",
  API: "api",
} as const;

export type Source = (typeof sourceValues)[keyof typeof sourceValues];

const sourceDisplayNames: Record<Source, string> = {
  form: "Form",
  import: "Import",
  api: "API",
};

export const Source = {
  ...sourceValues,
  valid: (value: string): value is Source =>
    Object.values(sourceValues).includes(value as Source),
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
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
} as const;

export type Operation = (typeof operationValues)[keyof typeof operationValues];

const operationDisplayNames: Record<Operation, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
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
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type EvaluationStatus
  = (typeof evaluationStatusValues)[keyof typeof evaluationStatusValues];

export const EvaluationStatus = {
  ...evaluationStatusValues,
} as const;

// ============================================================================
// DeliverableStatus
// ============================================================================

const deliverableStatusValues = {
  ACTIVE: "active",
  PAUSED: "paused",
} as const;

export type DeliverableStatus
  = (typeof deliverableStatusValues)[keyof typeof deliverableStatusValues];

export const DeliverableStatus = {
  ...deliverableStatusValues,
} as const;

// ============================================================================
// Duration (Template Literal Type)
// ============================================================================

type TimeUnit = "s" | "m" | "h" | "d";

export type Duration = `${number}${TimeUnit}`;

const DURATION_MS: Record<TimeUnit, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDuration(duration: Duration): number {
  const match = /^(\d+)(s|m|h|d)$/i.exec(duration);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase() as TimeUnit;
  return value * DURATION_MS[unit];
}

export function formatDuration(ms: number): Duration {
  if (ms >= DURATION_MS.d && ms % DURATION_MS.d === 0) {
    return `${ms / DURATION_MS.d}d` as Duration;
  }
  if (ms >= DURATION_MS.h && ms % DURATION_MS.h === 0) {
    return `${ms / DURATION_MS.h}h` as Duration;
  }
  if (ms >= DURATION_MS.m && ms % DURATION_MS.m === 0) {
    return `${ms / DURATION_MS.m}m` as Duration;
  }
  return `${ms / DURATION_MS.s}s` as Duration;
}

// ============================================================================
// Branded Types (Compile-Time ID Safety)
// ============================================================================

declare const CARD_ID: unique symbol;
declare const PROCEDURE_ID: unique symbol;
declare const DELIVERABLE_ID: unique symbol;
declare const EVALUATION_ID: unique symbol;
declare const ORGANIZATION_ID: unique symbol;

export type CardId = string & { readonly [CARD_ID]: typeof CARD_ID };
export type ProcedureId = string & {
  readonly [PROCEDURE_ID]: typeof PROCEDURE_ID;
};
export type DeliverableId = string & {
  readonly [DELIVERABLE_ID]: typeof DELIVERABLE_ID;
};
export type EvaluationId = string & {
  readonly [EVALUATION_ID]: typeof EVALUATION_ID;
};
export type OrganizationId = string & {
  readonly [ORGANIZATION_ID]: typeof ORGANIZATION_ID;
};

export const createId = {
  card: (id: string) => id as CardId,
  procedure: (id: string) => id as ProcedureId,
  deliverable: (id: string) => id as DeliverableId,
  evaluation: (id: string) => id as EvaluationId,
  organization: (id: string) => id as OrganizationId,
} as const;

// ============================================================================
// Composite Types (TypeScript only, no validators)
// ============================================================================

export interface Schedule {
  at?: number;
  delay?: Duration;
  cron?: string;
}

export interface Required {
  cardIds: CardId[];
  deliverableIds: DeliverableId[];
}
