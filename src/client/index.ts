/**
 * @trestleinc/bridge - Client exports
 *
 * Import from '@trestleinc/bridge/client' for client-side utilities.
 */

// Error types
export {
  NetworkError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  NonRetriableError,
} from '$/client/errors.js';

// Logger utility
export { getLogger } from '$/client/logger.js';

// Re-export shared types and validators for convenience
export * from '$/shared/index.js';
