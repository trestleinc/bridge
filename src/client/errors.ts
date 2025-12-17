/**
 * @trestleinc/bridge - Client Errors
 *
 * Error types for Bridge client operations.
 */

import { Data } from 'effect';

/** Error for network-related failures */
export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly cause: unknown;
  readonly retryable: boolean;
  readonly operation: string;
}> {}

/** Error when authorization check fails */
export class AuthorizationError extends Data.TaggedError('AuthorizationError')<{
  readonly operation: string;
  readonly organizationId: string;
  readonly reason?: string;
}> {}

/** Error when a required entity is not found */
export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly entity: 'card' | 'procedure' | 'deliverable' | 'evaluation';
  readonly id: string;
}> {}

/** Error when validation fails */
export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
}> {}

/** Error that should not be retried (auth failures, validation errors) */
export class NonRetriableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetriableError';
  }
}
