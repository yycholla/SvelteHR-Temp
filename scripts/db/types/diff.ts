/**
 * Schema Diff Types
 *
 * Type definitions for schema comparison results and difference tracking.
 */

export interface SchemaDiff {
	sourceSchema: string; // Source schema name (e.g., "version control")
	targetSchema: string; // Target schema name (e.g., "production database")
	comparedAt: string; // ISO-8601 timestamp
	hasDifferences: boolean;
	tableDiffs: TableDiff[];
	summary: DiffSummary;
}

export interface DiffSummary {
	missingTables: number;
	extraTables: number;
	modifiedTables: number;
	missingColumns: number;
	extraColumns: number;
	modifiedColumns: number;
	missingIndexes: number;
	extraIndexes: number;
	totalDifferences: number;
}

export type TableDiffType = 'missing' | 'extra' | 'modified';

export interface TableDiff {
	tableName: string;
	diffType: TableDiffType;
	columnDiffs: ColumnDiff[];
	constraintDiffs: ConstraintDiff[];
	indexDiffs: IndexDiff[];
}

export type ColumnDiffType =
	| 'missing'
	| 'extra'
	| 'type_mismatch'
	| 'nullability_mismatch'
	| 'default_mismatch';

export interface ColumnDiff {
	columnName: string;
	diffType: ColumnDiffType;
	sourceValue?: any;
	targetValue?: any;
}

export type ConstraintType = 'primary_key' | 'foreign_key' | 'unique' | 'check';

export type ConstraintDiffType = 'missing' | 'extra' | 'definition_mismatch';

export interface ConstraintDiff {
	constraintName: string;
	constraintType: ConstraintType;
	diffType: ConstraintDiffType;
	sourceDefinition?: string;
	targetDefinition?: string;
}

export type IndexDiffType = 'missing' | 'extra' | 'definition_mismatch';

export interface IndexDiff {
	indexName: string;
	diffType: IndexDiffType;
	sourceDefinition?: string;
	targetDefinition?: string;
}

/**
 * Validation Functions
 */

export function validateSchemaDiff(diff: SchemaDiff): string[] {
	const errors: string[] = [];

	// hasDifferences must match whether any diffs exist
	const hasAnyDiffs =
		diff.tableDiffs.length > 0 ||
		diff.summary.missingTables > 0 ||
		diff.summary.extraTables > 0 ||
		diff.summary.modifiedTables > 0;

	if (diff.hasDifferences !== hasAnyDiffs) {
		errors.push('hasDifferences must match whether any diffs exist');
	}

	// summary.totalDifferences must equal sum of all individual difference counts
	const expectedTotal =
		diff.summary.missingTables +
		diff.summary.extraTables +
		diff.summary.modifiedTables +
		diff.summary.missingColumns +
		diff.summary.extraColumns +
		diff.summary.modifiedColumns +
		diff.summary.missingIndexes +
		diff.summary.extraIndexes;

	if (diff.summary.totalDifferences !== expectedTotal) {
		errors.push(
			`summary.totalDifferences (${diff.summary.totalDifferences}) must equal sum of all individual counts (${expectedTotal})`
		);
	}

	return errors;
}

export function validateColumnDiff(diff: ColumnDiff): string[] {
	const errors: string[] = [];

	// For "missing", targetValue must be undefined
	if (diff.diffType === 'missing' && diff.targetValue !== undefined) {
		errors.push('For diffType "missing", targetValue must be undefined');
	}

	// For "extra", sourceValue must be undefined
	if (diff.diffType === 'extra' && diff.sourceValue !== undefined) {
		errors.push('For diffType "extra", sourceValue must be undefined');
	}

	// For mismatch types, both source and target must be defined
	const mismatchTypes: ColumnDiffType[] = [
		'type_mismatch',
		'nullability_mismatch',
		'default_mismatch'
	];
	if (mismatchTypes.includes(diff.diffType)) {
		if (diff.sourceValue === undefined || diff.targetValue === undefined) {
			errors.push(`For diffType "${diff.diffType}", both sourceValue and targetValue must be defined`);
		}
	}

	return errors;
}

export function validateConstraintDiff(diff: ConstraintDiff): string[] {
	const errors: string[] = [];

	// For "missing", targetDefinition must be undefined
	if (diff.diffType === 'missing' && diff.targetDefinition !== undefined) {
		errors.push('For diffType "missing", targetDefinition must be undefined');
	}

	// For "extra", sourceDefinition must be undefined
	if (diff.diffType === 'extra' && diff.sourceDefinition !== undefined) {
		errors.push('For diffType "extra", sourceDefinition must be undefined');
	}

	// For "definition_mismatch", both source and target must be defined
	if (diff.diffType === 'definition_mismatch') {
		if (diff.sourceDefinition === undefined || diff.targetDefinition === undefined) {
			errors.push(
				'For diffType "definition_mismatch", both sourceDefinition and targetDefinition must be defined'
			);
		}
	}

	return errors;
}

export function validateIndexDiff(diff: IndexDiff): string[] {
	const errors: string[] = [];

	// For "missing", targetDefinition must be undefined
	if (diff.diffType === 'missing' && diff.targetDefinition !== undefined) {
		errors.push('For diffType "missing", targetDefinition must be undefined');
	}

	// For "extra", sourceDefinition must be undefined
	if (diff.diffType === 'extra' && diff.sourceDefinition !== undefined) {
		errors.push('For diffType "extra", sourceDefinition must be undefined');
	}

	// For "definition_mismatch", both source and target must be defined
	if (diff.diffType === 'definition_mismatch') {
		if (diff.sourceDefinition === undefined || diff.targetDefinition === undefined) {
			errors.push(
				'For diffType "definition_mismatch", both sourceDefinition and targetDefinition must be defined'
			);
		}
	}

	return errors;
}

/**
 * Helper function to create an empty DiffSummary
 */
export function createEmptyDiffSummary(): DiffSummary {
	return {
		missingTables: 0,
		extraTables: 0,
		modifiedTables: 0,
		missingColumns: 0,
		extraColumns: 0,
		modifiedColumns: 0,
		missingIndexes: 0,
		extraIndexes: 0,
		totalDifferences: 0
	};
}
