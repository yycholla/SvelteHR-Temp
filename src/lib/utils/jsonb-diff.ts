/**
 * JSONB Diff Utility for Conflict Detection
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T031
 * Created: 2025-10-02
 *
 * Utilities for detecting conflicts when rolling back by comparing JSONB snapshots.
 * Identifies fields that have changed between snapshot and current state.
 */

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === 'object' && value !== null;
}

export interface ConflictDetail {
	field: string;
	currentValue: unknown;
	targetValue: unknown;
	snapshotValue: unknown;
	conflictType: 'value_mismatch' | 'type_mismatch' | 'added' | 'removed';
}

export interface DiffResult {
	hasConflicts: boolean;
	conflictFields: string[];
	conflicts: ConflictDetail[];
	currentState: JsonRecord;
	targetState: JsonRecord;
}

/**
 * Compares current state with snapshot to detect conflicts
 *
 * @param currentState Current resource state from database
 * @param snapshotState Target state from activity log snapshot
 * @param excludeFields Fields to exclude from comparison (e.g., updated_at, _metadata)
 * @returns Diff result with conflict details
 */
export function detectConflicts(
	currentState: JsonRecord | null,
	snapshotState: JsonRecord | null,
	excludeFields: string[] = ['updated_at', 'created_at', '_metadata', '_relationships']
): DiffResult {
	const conflicts: ConflictDetail[] = [];
	const conflictFields: string[] = [];

	// Handle null states
	if (!currentState && !snapshotState) {
		return {
			hasConflicts: false,
			conflictFields: [],
			conflicts: [],
			currentState: {},
			targetState: {}
		};
	}

	if (!currentState) {
		return {
			hasConflicts: true,
			conflictFields: ['*'],
			conflicts: [
				{
					field: '*',
					currentValue: null,
					targetValue: snapshotState,
					snapshotValue: snapshotState,
					conflictType: 'removed'
				}
			],
			currentState: {},
			targetState: snapshotState || {}
		};
	}

	if (!snapshotState) {
		return {
			hasConflicts: false,
			conflictFields: [],
			conflicts: [],
			currentState,
			targetState: {}
		};
	}

	// Get all unique field names from both states
	const allFields = new Set([...Object.keys(currentState), ...Object.keys(snapshotState)]);

	// Compare each field
	for (const field of allFields) {
		// Skip excluded fields
		if (excludeFields.includes(field)) {
			continue;
		}

		const currentValue = currentState[field];
		const snapshotValue = snapshotState[field];

		// Check if field exists in both
		const inCurrent = field in currentState;
		const inSnapshot = field in snapshotState;

		// Field added after snapshot
		if (inCurrent && !inSnapshot) {
			conflicts.push({
				field,
				currentValue,
				targetValue: undefined,
				snapshotValue: undefined,
				conflictType: 'added'
			});
			conflictFields.push(field);
			continue;
		}

		// Field removed after snapshot
		if (!inCurrent && inSnapshot) {
			conflicts.push({
				field,
				currentValue: undefined,
				targetValue: snapshotValue,
				snapshotValue,
				conflictType: 'removed'
			});
			conflictFields.push(field);
			continue;
		}

		// Compare values with deep equality
		if (!deepEqual(currentValue, snapshotValue)) {
			// Check if types match
			const currentType = typeof currentValue;
			const snapshotType = typeof snapshotValue;

			if (currentType !== snapshotType) {
				conflicts.push({
					field,
					currentValue,
					targetValue: snapshotValue,
					snapshotValue,
					conflictType: 'type_mismatch'
				});
			} else {
				conflicts.push({
					field,
					currentValue,
					targetValue: snapshotValue,
					snapshotValue,
					conflictType: 'value_mismatch'
				});
			}

			conflictFields.push(field);
		}
	}

	return {
		hasConflicts: conflicts.length > 0,
		conflictFields,
		conflicts,
		currentState,
		targetState: snapshotState
	};
}

/**
 * Deep equality comparison for arbitrary values
 *
 * @param a First value
 * @param b Second value
 * @returns True if values are deeply equal
 */
function deepEqual(a: unknown, b: unknown): boolean {
	// Strict equality for primitives
	if (a === b) return true;

	// Handle null and undefined
	if (a == null || b == null) return a === b;

	// Handle Date objects
	if (a instanceof Date && b instanceof Date) {
		return a.getTime() === b.getTime();
	}

	// Handle arrays
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;

		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}

		return true;
	}

	// Handle objects
	if (isRecord(a) && isRecord(b)) {
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);

		if (keysA.length !== keysB.length) return false;

		for (const key of keysA) {
			if (!keysB.includes(key)) return false;
			if (!deepEqual(a[key], b[key])) return false;
		}

		return true;
	}

	// Different types or values
	return false;
}

/**
 * Filters conflicts by field names
 *
 * @param diffResult Diff result
 * @param fields Array of field names to include
 * @returns Filtered diff result
 */
export function filterConflictsByFields(diffResult: DiffResult, fields: string[]): DiffResult {
	const filteredConflicts = diffResult.conflicts.filter((conflict) =>
		fields.includes(conflict.field)
	);

	const filteredFields = diffResult.conflictFields.filter((field) => fields.includes(field));

	return {
		hasConflicts: filteredConflicts.length > 0,
		conflictFields: filteredFields,
		conflicts: filteredConflicts,
		currentState: diffResult.currentState,
		targetState: diffResult.targetState
	};
}

/**
 * Groups conflicts by conflict type
 *
 * @param diffResult Diff result
 * @returns Map of conflict type to conflicts
 */
export function groupConflictsByType(diffResult: DiffResult): Map<string, ConflictDetail[]> {
	const grouped = new Map<string, ConflictDetail[]>();

	for (const conflict of diffResult.conflicts) {
		const type = conflict.conflictType;

		if (!grouped.has(type)) {
			grouped.set(type, []);
		}

		grouped.get(type)!.push(conflict);
	}

	return grouped;
}

/**
 * Generates human-readable conflict summary
 *
 * @param diffResult Diff result
 * @returns Formatted conflict summary
 */
export function formatConflictSummary(diffResult: DiffResult): string {
	if (!diffResult.hasConflicts) {
		return 'No conflicts detected';
	}

	const lines: string[] = [
		`Found ${diffResult.conflicts.length} conflict(s) in ${diffResult.conflictFields.length} field(s):`
	];

	const grouped = groupConflictsByType(diffResult);

	for (const [type, conflicts] of grouped.entries()) {
		lines.push(`\n${type.replace('_', ' ').toUpperCase()}:`);

		for (const conflict of conflicts) {
			const currentValueStr = JSON.stringify(conflict.currentValue);
			const targetValueStr = JSON.stringify(conflict.targetValue);

			lines.push(`  - ${conflict.field}: current=${currentValueStr}, target=${targetValueStr}`);
		}
	}

	return lines.join('\n');
}

/**
 * Merges snapshot with current state for selected fields
 *
 * @param currentState Current resource state
 * @param snapshotState Target snapshot state
 * @param fieldsToMerge Array of field names to merge from snapshot
 * @returns Merged state
 */
export function mergeStates(
	currentState: JsonRecord,
	snapshotState: JsonRecord,
	fieldsToMerge: string[]
): JsonRecord {
	const merged: JsonRecord = { ...currentState };

	for (const field of fieldsToMerge) {
		if (field in snapshotState) {
			merged[field] = snapshotState[field];
		}
	}

	return merged;
}

/**
 * Checks if conflicts exist for specific fields
 *
 * @param diffResult Diff result
 * @param fields Array of field names to check
 * @returns True if any specified field has conflicts
 */
export function hasConflictsInFields(diffResult: DiffResult, fields: string[]): boolean {
	return fields.some((field) => diffResult.conflictFields.includes(field));
}

/**
 * Gets conflict details for a specific field
 *
 * @param diffResult Diff result
 * @param field Field name
 * @returns Conflict detail or undefined
 */
export function getConflictForField(
	diffResult: DiffResult,
	field: string
): ConflictDetail | undefined {
	return diffResult.conflicts.find((conflict) => conflict.field === field);
}

/**
 * Compares nested objects with path notation
 *
 * @param currentState Current state
 * @param snapshotState Snapshot state
 * @param path Field path (e.g., "address.city")
 * @returns Conflict detail or null
 */
export function compareNestedField(
	currentState: JsonRecord,
	snapshotState: JsonRecord,
	path: string
): ConflictDetail | null {
	const pathParts = path.split('.');

	let currentValue: unknown = currentState;
	let snapshotValue: unknown = snapshotState;

	// Traverse path
	for (const part of pathParts) {
		currentValue = isRecord(currentValue) ? currentValue[part] : undefined;
		snapshotValue = isRecord(snapshotValue) ? snapshotValue[part] : undefined;
	}

	// Compare values
	if (!deepEqual(currentValue, snapshotValue)) {
		return {
			field: path,
			currentValue,
			targetValue: snapshotValue,
			snapshotValue,
			conflictType:
				typeof currentValue !== typeof snapshotValue ? 'type_mismatch' : 'value_mismatch'
		};
	}

	return null;
}
