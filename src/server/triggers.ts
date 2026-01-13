/**
 * Trigger Generator Factory for Bridge
 *
 * Provides utilities for generating convex-helpers trigger handlers
 * from subject configuration. Automatically extracts changed fields
 * from attribute arrays and tracked fields, then delegates to Bridge
 * for deliverable evaluation.
 */

import type { GenericDataModel, GenericMutationCtx } from "convex/server";
import type { BridgeComponentApi } from "./bridge";
import type { SubjectConfig } from "$/shared/validators";

// ============================================================================
// Types
// ============================================================================

type Operation = "insert" | "update" | "delete";

type Attribute = {
	slug: string;
	value: unknown;
};

type DocumentWithAttributes = {
	id: string;
	organizationId: string;
	attributes?: Attribute[];
	[key: string]: unknown;
};

type Change = {
	operation: Operation;
	oldDoc: DocumentWithAttributes | null;
	newDoc: DocumentWithAttributes | null;
};

export type TriggerHandler = (
	ctx: GenericMutationCtx<GenericDataModel>,
	change: Change,
) => Promise<void>;

// ============================================================================
// Attribute Change Detection
// ============================================================================

/**
 * Extracts changed attribute slugs based on the operation type.
 *
 * - For insert: returns all attribute slugs from the new document
 * - For update: returns slugs of changed, added, or removed attributes
 * - For delete: returns empty array (delete operations are typically skipped)
 *
 * @param operation - The type of database operation
 * @param oldAttributes - Attributes from the previous document state
 * @param newAttributes - Attributes from the new document state
 * @returns Array of attribute slugs that changed
 */
export function extractAttributeChanges(
	operation: Operation,
	oldAttributes: Attribute[] | undefined,
	newAttributes: Attribute[] | undefined,
): string[] {
	if (operation === "delete") {
		return [];
	}

	if (operation === "insert") {
		if (!newAttributes) return [];
		return newAttributes.map(attr => attr.slug);
	}

	// operation === 'update'
	if (!oldAttributes && !newAttributes) return [];

	const changedSlugs: string[] = [];
	const oldMap = new Map<string, unknown>();
	const newMap = new Map<string, unknown>();

	// Build lookup maps
	if (oldAttributes) {
		for (const attr of oldAttributes) {
			oldMap.set(attr.slug, attr.value);
		}
	}

	if (newAttributes) {
		for (const attr of newAttributes) {
			newMap.set(attr.slug, attr.value);
		}
	}

	// Check for changed or added attributes in new document
	for (const [slug, newValue] of newMap) {
		const oldValue = oldMap.get(slug);
		if (!oldMap.has(slug) || oldValue !== newValue) {
			changedSlugs.push(slug);
		}
	}

	// Check for removed attributes (in old but not in new)
	for (const slug of oldMap.keys()) {
		if (!newMap.has(slug)) {
			changedSlugs.push(slug);
		}
	}

	return changedSlugs;
}

// ============================================================================
// Trigger Factory
// ============================================================================

/**
 * Creates a trigger handler for a specific subject type.
 *
 * The handler automatically:
 * - Skips delete operations
 * - Extracts changed fields from attributes
 * - Tracks additional non-attribute fields specified in config
 * - Calls Bridge's deliverableEvaluate mutation
 *
 * @param component - The Bridge component API
 * @param subjectName - The name of the subject (e.g., 'beneficiary', 'event')
 * @param config - Subject configuration including tracked fields
 * @returns A trigger handler function compatible with convex-helpers triggers
 */
export function createSubjectTrigger(
	component: BridgeComponentApi,
	subjectName: string,
	config: SubjectConfig,
): TriggerHandler {
	const { trackedFields = [] } = config;

	return async (ctx: GenericMutationCtx<GenericDataModel>, change: Change): Promise<void> => {
		// Skip delete operations - deliverables typically don't need to evaluate on delete
		if (change.operation === "delete") {
			return;
		}

		// Must have a new document to evaluate
		if (!change.newDoc) {
			return;
		}

		// Extract changed attribute slugs
		const changedFields = extractAttributeChanges(
			change.operation,
			change.oldDoc?.attributes,
			change.newDoc.attributes,
		);

		// Add tracked fields that changed
		for (const field of trackedFields) {
			if (change.operation === "insert") {
				// For inserts, include all tracked fields if they exist
				if (change.newDoc[field] !== undefined) {
					changedFields.push(field);
				}
			} else if (change.oldDoc) {
				// For updates, only include if the value changed
				if (change.oldDoc[field] !== change.newDoc[field]) {
					changedFields.push(field);
				}
			}
		}

		// No changes detected, skip evaluation
		if (changedFields.length === 0) {
			return;
		}

		// Determine Bridge operation type
		const operation = change.operation === "insert" ? "create" : "update";

		// Delegate to Bridge for deliverable evaluation
		await ctx.runMutation(component.public.deliverableEvaluate, {
			organizationId: change.newDoc.organizationId,
			subject: subjectName,
			subjectId: change.newDoc.id,
			operation,
			mutated: changedFields,
		});
	};
}

// ============================================================================
// Batch Trigger Generation
// ============================================================================

/**
 * Configuration for all subjects in the system.
 * Maps subject names to their configuration.
 */
export type SubjectsConfig = Record<string, SubjectConfig>;

/**
 * Creates trigger handlers for all configured subjects.
 *
 * Returns a record mapping table names to their trigger handlers,
 * ready to be registered with convex-helpers Triggers.
 *
 * @example
 * ```typescript
 * const triggers = new Triggers<DataModel>();
 * const handlers = createTriggers(component, {
 *   beneficiary: { table: 'beneficiaries' },
 *   event: { table: 'events' },
 *   eventInstance: { table: 'eventInstances', trackedFields: ['startTime', 'endTime'] },
 * });
 *
 * for (const [table, handler] of Object.entries(handlers)) {
 *   triggers.register(table, handler);
 * }
 * ```
 *
 * @param component - The Bridge component API
 * @param subjects - Configuration for all subjects
 * @returns Record mapping table names to trigger handlers
 */
export function createTriggers(
	component: BridgeComponentApi,
	subjects: SubjectsConfig,
): Record<string, TriggerHandler> {
	const handlers: Record<string, TriggerHandler> = {};

	for (const [subjectName, config] of Object.entries(subjects)) {
		const handler = createSubjectTrigger(component, subjectName, config);
		handlers[config.table] = handler;
	}

	return handlers;
}
