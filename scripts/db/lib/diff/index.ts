/**
 * Schema Diff Engine - Main Entry Point
 *
 * Orchestrates the three-phase comparison algorithm:
 * - Phase 1: Structural diff (tables and columns)
 * - Phase 2: Constraint and index diff
 * - Phase 3: Detailed column comparison
 */

import type { SchemaMetadata } from '../../types/schema';
import type { SchemaDiff, TableDiff } from '../../types/diff';
import { compareTableNames } from './structural';
import { compareConstraints, compareIndexes } from './constraints';
import { compareColumnDetails } from './columns';
import { generateSchemaDiff } from './summary';

/**
 * Main entry point for schema comparison.
 * Performs three-phase comparison and returns complete SchemaDiff.
 *
 * @param source - Source schema (version control)
 * @param target - Target schema (live database)
 * @returns Complete SchemaDiff with all differences
 */
export function compareSchemas(source: SchemaMetadata, target: SchemaMetadata): SchemaDiff {
	// Phase 1: Structural diff (table and column names)
	const structuralDiffs = compareTableNames(source, target);

	// Phase 2 & 3: Enrich with constraint, index, and detailed column diffs
	const enrichedDiffs = enrichTableDiffs(structuralDiffs, source, target);

	// Generate final SchemaDiff with summary
	return generateSchemaDiff(source, target, enrichedDiffs);
}

/**
 * Enriches structural table diffs with constraint, index, and detailed column comparisons.
 *
 * @param structuralDiffs - Diffs from Phase 1
 * @param source - Source schema
 * @param target - Target schema
 * @returns Enriched table diffs
 */
function enrichTableDiffs(
	structuralDiffs: TableDiff[],
	source: SchemaMetadata,
	target: SchemaMetadata
): TableDiff[] {
	const sourceTables = new Map(source.tables.map((t) => [t.tableName, t]));
	const targetTables = new Map(target.tables.map((t) => [t.tableName, t]));

	return structuralDiffs.map((tableDiff) => {
		// Only enrich "modified" tables (both exist)
		if (tableDiff.diffType !== 'modified') {
			return tableDiff;
		}

		const sourceTable = sourceTables.get(tableDiff.tableName);
		const targetTable = targetTables.get(tableDiff.tableName);

		if (!sourceTable || !targetTable) {
			return tableDiff;
		}

		// Phase 2: Compare constraints and indexes
		const constraintDiffs = compareConstraints(sourceTable, targetTable);
		const indexDiffs = compareIndexes(sourceTable, targetTable);

		// Phase 3: Detailed column comparison
		const detailedColumnDiffs = compareColumnDetails(sourceTable, targetTable);

		// Merge detailed column diffs with structural column diffs
		const mergedColumnDiffs = [...tableDiff.columnDiffs, ...detailedColumnDiffs];

		return {
			...tableDiff,
			columnDiffs: mergedColumnDiffs,
			constraintDiffs,
			indexDiffs
		};
	});
}

// Re-export utility functions
export { generateSummaryText, generateDetailedReport, determineSeverity } from './summary';
export { isCriticalColumnChange } from './columns';
