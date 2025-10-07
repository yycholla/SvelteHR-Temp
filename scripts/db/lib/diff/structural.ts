/**
 * Phase 1: Structural Diff (T022)
 *
 * Compares table names and column names using set operations.
 * Identifies missing, extra, and modified tables/columns.
 */

import type { SchemaMetadata, TableDefinition } from '../../types/schema';
import type { TableDiff, ColumnDiff, TableDiffType, ColumnDiffType } from '../../types/diff';

/**
 * Compares table names between source and target schemas.
 *
 * @param source - Source schema (version control)
 * @param target - Target schema (live database)
 * @returns Array of TableDiff objects with structural differences
 */
export function compareTableNames(
	source: SchemaMetadata,
	target: SchemaMetadata
): TableDiff[] {
	const sourceTables = new Map(source.tables.map((t) => [t.tableName, t]));
	const targetTables = new Map(target.tables.map((t) => [t.tableName, t]));

	const diffs: TableDiff[] = [];

	// Find missing tables (in source but not in target)
	for (const [tableName, sourceTable] of sourceTables) {
		if (!targetTables.has(tableName)) {
			diffs.push({
				tableName,
				diffType: 'missing',
				columnDiffs: [],
				constraintDiffs: [],
				indexDiffs: []
			});
		}
	}

	// Find extra tables (in target but not in source)
	for (const [tableName, targetTable] of targetTables) {
		if (!sourceTables.has(tableName)) {
			diffs.push({
				tableName,
				diffType: 'extra',
				columnDiffs: [],
				constraintDiffs: [],
				indexDiffs: []
			});
		}
	}

	// Find modified tables (exist in both, need column comparison)
	for (const [tableName, sourceTable] of sourceTables) {
		if (targetTables.has(tableName)) {
			const targetTable = targetTables.get(tableName)!;
			const columnDiffs = compareColumnNames(sourceTable, targetTable);

			// Only add to diff if there are column differences
			if (columnDiffs.length > 0) {
				diffs.push({
					tableName,
					diffType: 'modified',
					columnDiffs,
					constraintDiffs: [], // Will be populated in Phase 2
					indexDiffs: [] // Will be populated in Phase 2
				});
			}
		}
	}

	return diffs;
}

/**
 * Compares column names between two table definitions.
 *
 * @param sourceTable - Source table definition
 * @param targetTable - Target table definition
 * @returns Array of ColumnDiff objects
 */
export function compareColumnNames(
	sourceTable: TableDefinition,
	targetTable: TableDefinition
): ColumnDiff[] {
	const sourceColumns = new Map(sourceTable.columns.map((c) => [c.columnName, c]));
	const targetColumns = new Map(targetTable.columns.map((c) => [c.columnName, c]));

	const diffs: ColumnDiff[] = [];

	// Find missing columns (in source but not in target)
	for (const [columnName, sourceColumn] of sourceColumns) {
		if (!targetColumns.has(columnName)) {
			diffs.push({
				columnName,
				diffType: 'missing',
				sourceValue: sourceColumn,
				targetValue: undefined
			});
		}
	}

	// Find extra columns (in target but not in source)
	for (const [columnName, targetColumn] of targetColumns) {
		if (!sourceColumns.has(columnName)) {
			diffs.push({
				columnName,
				diffType: 'extra',
				sourceValue: undefined,
				targetValue: targetColumn
			});
		}
	}

	// Note: Type/nullability/default mismatches will be detected in Phase 3 (detailed comparison)

	return diffs;
}

/**
 * Generates a structural TableDiff for a table (without detailed column comparison).
 *
 * @param tableName - Table name
 * @param diffType - Type of difference
 * @returns TableDiff object
 */
export function createTableDiff(tableName: string, diffType: TableDiffType): TableDiff {
	return {
		tableName,
		diffType,
		columnDiffs: [],
		constraintDiffs: [],
		indexDiffs: []
	};
}

/**
 * Merges structural diffs with detailed diffs (used in Phase 3).
 *
 * @param structuralDiffs - Diffs from Phase 1
 * @param detailedColumnDiffs - Detailed column diffs from Phase 3
 * @returns Merged TableDiff array
 */
export function mergeStructuralWithDetailedDiffs(
	structuralDiffs: TableDiff[],
	detailedColumnDiffs: Map<string, ColumnDiff[]>
): TableDiff[] {
	return structuralDiffs.map((tableDiff) => {
		const detailedDiffs = detailedColumnDiffs.get(tableDiff.tableName) || [];

		// Merge column diffs
		const mergedColumnDiffs = [...tableDiff.columnDiffs, ...detailedDiffs];

		return {
			...tableDiff,
			columnDiffs: mergedColumnDiffs
		};
	});
}
