/**
 * Phase 3: Detailed Column Comparison (T024)
 *
 * Compares column data types, nullability, default values.
 * Detects type mismatches, nullability changes, and default value changes.
 */

import type { TableDefinition, ColumnDefinition } from '../../types/schema';
import type { ColumnDiff, ColumnDiffType } from '../../types/diff';
import { normalizeDataType, normalizeTypeWithParameters } from '../normalize';

/**
 * Performs detailed column comparison for matching tables.
 *
 * @param sourceTable - Source table definition
 * @param targetTable - Target table definition
 * @returns Array of ColumnDiff objects with detailed mismatches
 */
export function compareColumnDetails(
	sourceTable: TableDefinition,
	targetTable: TableDefinition
): ColumnDiff[] {
	const sourceColumns = new Map(sourceTable.columns.map((c) => [c.columnName, c]));
	const targetColumns = new Map(targetTable.columns.map((c) => [c.columnName, c]));

	const diffs: ColumnDiff[] = [];

	// Compare columns that exist in both tables
	for (const [columnName, sourceColumn] of sourceColumns) {
		if (targetColumns.has(columnName)) {
			const targetColumn = targetColumns.get(columnName)!;

			// Check for type mismatch
			const typeDiff = compareColumnTypes(sourceColumn, targetColumn);
			if (typeDiff) {
				diffs.push(typeDiff);
			}

			// Check for nullability mismatch
			const nullabilityDiff = compareColumnNullability(sourceColumn, targetColumn);
			if (nullabilityDiff) {
				diffs.push(nullabilityDiff);
			}

			// Check for default value mismatch
			const defaultDiff = compareColumnDefaults(sourceColumn, targetColumn);
			if (defaultDiff) {
				diffs.push(defaultDiff);
			}
		}
	}

	return diffs;
}

/**
 * Compares column data types (with normalization).
 *
 * @param sourceColumn - Source column definition
 * @param targetColumn - Target column definition
 * @returns ColumnDiff if mismatch, null if match
 */
function compareColumnTypes(
	sourceColumn: ColumnDefinition,
	targetColumn: ColumnDefinition
): ColumnDiff | null {
	// Normalize both types with their parameters
	const sourceType = normalizeTypeWithParameters(
		sourceColumn.dataType,
		sourceColumn.characterMaximumLength,
		sourceColumn.numericPrecision,
		sourceColumn.numericScale
	);

	const targetType = normalizeTypeWithParameters(
		targetColumn.dataType,
		targetColumn.characterMaximumLength,
		targetColumn.numericPrecision,
		targetColumn.numericScale
	);

	if (sourceType !== targetType) {
		return {
			columnName: sourceColumn.columnName,
			diffType: 'type_mismatch',
			sourceValue: sourceType,
			targetValue: targetType
		};
	}

	return null;
}

/**
 * Compares column nullability.
 *
 * @param sourceColumn - Source column definition
 * @param targetColumn - Target column definition
 * @returns ColumnDiff if mismatch, null if match
 */
function compareColumnNullability(
	sourceColumn: ColumnDefinition,
	targetColumn: ColumnDefinition
): ColumnDiff | null {
	if (sourceColumn.isNullable !== targetColumn.isNullable) {
		return {
			columnName: sourceColumn.columnName,
			diffType: 'nullability_mismatch',
			sourceValue: sourceColumn.isNullable ? 'NULL' : 'NOT NULL',
			targetValue: targetColumn.isNullable ? 'NULL' : 'NOT NULL'
		};
	}

	return null;
}

/**
 * Compares column default values.
 *
 * @param sourceColumn - Source column definition
 * @param targetColumn - Target column definition
 * @returns ColumnDiff if mismatch, null if match
 */
function compareColumnDefaults(
	sourceColumn: ColumnDefinition,
	targetColumn: ColumnDefinition
): ColumnDiff | null {
	// Normalize default values for comparison
	const sourceDefault = normalizeDefaultValue(sourceColumn.defaultValue);
	const targetDefault = normalizeDefaultValue(targetColumn.defaultValue);

	if (sourceDefault !== targetDefault) {
		return {
			columnName: sourceColumn.columnName,
			diffType: 'default_mismatch',
			sourceValue: sourceColumn.defaultValue,
			targetValue: targetColumn.defaultValue
		};
	}

	return null;
}

/**
 * Normalizes default values for comparison.
 * Handles casting syntax differences, whitespace, etc.
 *
 * @param defaultValue - Default value string or null
 * @returns Normalized default value
 */
function normalizeDefaultValue(defaultValue: string | null): string {
	if (!defaultValue) return '';

	return (
		defaultValue
			.trim()
			// Normalize casting syntax: ::type → type
			.replace(/::[a-z_]+/gi, '')
			// Normalize whitespace
			.replace(/\s+/g, ' ')
			// Remove quotes around simple values
			.replace(/^'([^']*)'$/, '$1')
			.toLowerCase()
	);
}

/**
 * Compares column ordinal positions (for detecting column reordering).
 *
 * @param sourceTable - Source table definition
 * @param targetTable - Target table definition
 * @returns Map of column names to position mismatches
 */
export function compareColumnPositions(
	sourceTable: TableDefinition,
	targetTable: TableDefinition
): Map<string, { sourcePos: number; targetPos: number }> {
	const sourceColumns = new Map(sourceTable.columns.map((c) => [c.columnName, c.ordinalPosition]));
	const targetColumns = new Map(targetTable.columns.map((c) => [c.columnName, c.ordinalPosition]));

	const positionMismatches = new Map<string, { sourcePos: number; targetPos: number }>();

	for (const [columnName, sourcePos] of sourceColumns) {
		if (targetColumns.has(columnName)) {
			const targetPos = targetColumns.get(columnName)!;

			if (sourcePos !== targetPos) {
				positionMismatches.set(columnName, { sourcePos, targetPos });
			}
		}
	}

	return positionMismatches;
}

/**
 * Detects critical column changes that require data migration.
 *
 * @param columnDiff - Column difference
 * @returns True if change is critical (non-reversible, data loss risk)
 */
export function isCriticalColumnChange(columnDiff: ColumnDiff): boolean {
	switch (columnDiff.diffType) {
		case 'type_mismatch':
			// Type changes can cause data loss or require conversion
			return true;

		case 'nullability_mismatch':
			// NOT NULL → NULL is safe, NULL → NOT NULL requires data validation
			return columnDiff.sourceValue === 'NULL' && columnDiff.targetValue === 'NOT NULL';

		case 'default_mismatch':
			// Default changes are generally safe
			return false;

		case 'missing':
		case 'extra':
			// Structural changes are critical
			return true;

		default:
			return false;
	}
}
