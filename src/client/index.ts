/**
 * @trestleinc/bridge - Client exports
 *
 * Import from '@trestleinc/bridge/client' for client-side utilities.
 */

// Error types
export {
	AuthorizationError,
	NetworkError,
	NonRetriableError,
	NotFoundError,
	ValidationError,
} from "$/client/errors";

// Logger utility
export { getLogger } from "$/client/logger";

// Re-export shared types and validators for convenience
export * from "$/shared/index";
