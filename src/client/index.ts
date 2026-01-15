/**
 * @trestleinc/bridge - Client exports
 *
 * Import from '@trestleinc/bridge/client' for client-side utilities.
 */

import type { Card, Procedure, Deliverable, Evaluation, SubmissionResult } from "$/shared";

// ============================================================================
// Error Types
// ============================================================================

export {
	AuthorizationError,
	NetworkError,
	NonRetriableError,
	NotFoundError,
	ValidationError,
} from "$/client/errors";

// ============================================================================
// Logger Utility
// ============================================================================

export { getLogger } from "$/shared/logger";

// ============================================================================
// Bridge Client Factory
// ============================================================================

/**
 * Options for connecting to Bridge.
 */
export interface ConnectOptions {
	/** Convex client instance */
	convex: {
		query: <T>(query: unknown, args: Record<string, unknown>) => Promise<T>;
		mutation: <T>(mutation: unknown, args: Record<string, unknown>) => Promise<T>;
	};
	/** Convex API reference with bridge endpoints */
	api: {
		card: {
			get: unknown;
			find: unknown;
			list: unknown;
		};
		procedure: {
			get: unknown;
			list: unknown;
			submit: unknown;
		};
		deliverable: {
			get: unknown;
			list: unknown;
		};
		evaluation: {
			get: unknown;
			list: unknown;
		};
	};
	/** Default organization ID for operations */
	organizationId?: string;
}

/**
 * Submit arguments for procedure submission.
 */
export interface SubmitArgs {
	procedureId: string;
	subject: string;
	subjectId: string;
	values: Record<string, unknown>;
	organizationId?: string;
}

/**
 * Connected Bridge client instance.
 */
export interface BridgeClient {
	/** Card operations */
	card: {
		/** Get a card by ID */
		get: (id: string) => Promise<Card | null>;
		/** List cards for the organization */
		list: (args?: { subject?: string; limit?: number; organizationId?: string }) => Promise<Card[]>;
		/** Find a card by slug */
		find: (slug: string, organizationId?: string) => Promise<Card | null>;
	};

	/** Procedure operations */
	procedure: {
		/** Get a procedure by ID */
		get: (id: string) => Promise<Procedure | null>;
		/** List procedures for the organization */
		list: (args?: {
			procedureType?: string;
			limit?: number;
			organizationId?: string;
		}) => Promise<Procedure[]>;
		/** Submit values through a procedure */
		submit: (args: SubmitArgs) => Promise<SubmissionResult>;
	};

	/** Deliverable operations */
	deliverable: {
		/** Get a deliverable by ID */
		get: (id: string) => Promise<Deliverable | null>;
		/** List deliverables for the organization */
		list: (args?: {
			subject?: string;
			limit?: number;
			organizationId?: string;
		}) => Promise<Deliverable[]>;
	};

	/** Evaluation operations */
	evaluation: {
		/** Get an evaluation by ID */
		get: (id: string) => Promise<Evaluation | null>;
		/** List evaluations for the organization */
		list: (args?: {
			deliverableId?: string;
			status?: string;
			limit?: number;
			organizationId?: string;
		}) => Promise<Evaluation[]>;
	};
}

/**
 * Bridge client factory.
 *
 * @example
 * ```typescript
 * import { bridge } from '@trestleinc/bridge/client';
 * import { useConvex } from 'convex/react';
 * import { api } from '../convex/_generated/api';
 *
 * const convex = useConvex();
 * const client = bridge.connect({
 *   convex,
 *   api: api.bridge,
 *   organizationId: 'org_123',
 * });
 *
 * // Get cards
 * const cards = await client.card.list();
 *
 * // Submit procedure
 * const result = await client.procedure.submit({
 *   procedureId: 'proc_123',
 *   subject: 'beneficiary',
 *   subjectId: 'ben_456',
 *   values: { firstName: 'John', lastName: 'Doe' },
 * });
 * ```
 */
export const bridge = {
	/**
	 * Connect to Bridge and create a client instance.
	 */
	connect: (options: ConnectOptions): BridgeClient => {
		const { convex, api, organizationId: defaultOrgId } = options;

		const requireOrgId = (orgId?: string): string => {
			const id = orgId ?? defaultOrgId;
			if (!id) {
				throw new Error("organizationId is required");
			}
			return id;
		};

		return {
			card: {
				get: (id: string) => convex.query(api.card.get, { id }) as Promise<Card | null>,

				list: (args?: { subject?: string; limit?: number; organizationId?: string }) =>
					convex.query(api.card.list, {
						organizationId: requireOrgId(args?.organizationId),
						subject: args?.subject,
						limit: args?.limit,
					}) as Promise<Card[]>,

				find: (slug: string, organizationId?: string) =>
					convex.query(api.card.find, {
						organizationId: requireOrgId(organizationId),
						slug,
					}) as Promise<Card | null>,
			},

			procedure: {
				get: (id: string) => convex.query(api.procedure.get, { id }) as Promise<Procedure | null>,

				list: (args?: { procedureType?: string; limit?: number; organizationId?: string }) =>
					convex.query(api.procedure.list, {
						organizationId: requireOrgId(args?.organizationId),
						procedureType: args?.procedureType,
						limit: args?.limit,
					}) as Promise<Procedure[]>,

				submit: (args: SubmitArgs) =>
					convex.mutation(api.procedure.submit, {
						organizationId: requireOrgId(args.organizationId),
						procedureId: args.procedureId,
						subject: args.subject,
						subjectId: args.subjectId,
						values: args.values,
					}) as Promise<SubmissionResult>,
			},

			deliverable: {
				get: (id: string) =>
					convex.query(api.deliverable.get, { id }) as Promise<Deliverable | null>,

				list: (args?: { subject?: string; limit?: number; organizationId?: string }) =>
					convex.query(api.deliverable.list, {
						organizationId: requireOrgId(args?.organizationId),
						subject: args?.subject,
						limit: args?.limit,
					}) as Promise<Deliverable[]>,
			},

			evaluation: {
				get: (id: string) => convex.query(api.evaluation.get, { id }) as Promise<Evaluation | null>,

				list: (args?: {
					deliverableId?: string;
					status?: string;
					limit?: number;
					organizationId?: string;
				}) =>
					convex.query(api.evaluation.list, {
						organizationId: requireOrgId(args?.organizationId),
						deliverableId: args?.deliverableId,
						status: args?.status,
						limit: args?.limit,
					}) as Promise<Evaluation[]>,
			},
		};
	},
} as const;
