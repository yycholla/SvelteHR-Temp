/**
 * Phase 2: Constraint and Index Diff (T023)
 *
 * Compares constraints and indexes between table definitions.
 * Detects missing, extra, and definition mismatches.
 */

import type { TableDefinition } from '../../types/schema';
import type {
	PrimaryKeyConstraint,
	ForeignKeyConstraint,
	UniqueConstraint,
	CheckConstraint,
	IndexDefinition
} from '../../types/constraints';
import type {
	ConstraintDiff,
	IndexDiff,
	ConstraintDiffType,
	IndexDiffType
} from '../../types/diff';

/**
 * Compares all constraints between source and target tables.
 *
 * @param sourceTable - Source table definition
 * @param targetTable - Target table definition
 * @returns Array of ConstraintDiff objects
 */
export function compareConstraints(
	sourceTable: TableDefinition,
	targetTable: TableDefinition
): ConstraintDiff[] {
	const diffs: ConstraintDiff[] = [];

	// Compare primary keys
	diffs.push(...comparePrimaryKeys(sourceTable, targetTable));

	// Compare foreign keys
	diffs.push(...compareForeignKeys(sourceTable, targetTable));

	// Compare unique constraints
	diffs.push(...compareUniqueConstraints(sourceTable, targetTable));

	// Compare check constraints
	diffs.push(...compareCheckConstraints(sourceTable, targetTable));

	return diffs;
}

/**
 * Compares primary key constraints.
 */
function comparePrimaryKeys(
	sourceTable: TableDefinition,
	targetTable: TableDefinition
): ConstraintDiff[] {
	const diffs: ConstraintDiff[] = [];

	const sourcePK = sourceTable.primaryKey;
	const targetPK = targetTable.primaryKey;

	// Missing PK (source has PK, target doesn't)
	if (sourcePK && !targetPK) {
		diffs.push({
			constraintName: sourcePK.constraintName,
			constraintType: 'primary_key',
			diffType: 'missing',
			sourceDefinition: JSON.stringify(sourcePK.columns),
			targetDefinition: undefined
		});
	}

	// Extra PK (target has PK, source doesn't)
	if (!sourcePK && targetPK) {
		diffs.push({
			constraintName: targetPK.constraintName,
			constraintType: 'primary_key',
			diffType: 'extra',
			sourceDefinition: undefined,
			targetDefinition: JSON.stringify(targetPK.columns)
		});
	}

	// Definition mismatch (both have PK, but columns differ)
	if (sourcePK && targetPK) {
		// Ensure columns are arrays (handle both array and PostgreSQL array string formats)
		const sourceColumnsArray = normalizeColumnsArray(sourcePK.columns);
		const targetColumnsArray = normalizeColumnsArray(targetPK.columns);

		const sourceColumns = JSON.stringify(sourceColumnsArray.sort());
		const targetColumns = JSON.stringify(targetColumnsArray.sort());

		if (sourceColumns !== targetColumns) {
			diffs.push({
				constraintName: sourcePK.constraintName,
				constraintType: 'primary_key',
				diffType: 'definition_mismatch',
				sourceDefinition: sourceColumns,
				targetDefinition: targetColumns
			});
		}
	}

	return diffs;
}

/**
 * Compares foreign key constraints.
 */
function compareForeignKeys(
	sourceTable: TableDefinition,
	targetTable: TableDefinition
): ConstraintDiff[] {
	const sourceFKs = new Map(sourceTable.foreignKeys.map((fk) => [fk.constraintName, fk]));
	const targetFKs = new Map(targetTable.foreignKeys.map((fk) => [fk.constraintName, fk]));

	const diffs: ConstraintDiff[] = [];

	// Missing FKs
	for (const [name, fk] of sourceFKs) {
		if (!targetFKs.has(name)) {
			diffs.push({
				constraintName: name,
				constraintType: 'foreign_key',
				diffType: 'missing',
				sourceDefinition: serializeForeignKey(fk),
				targetDefinition: undefined
			});
		}
	}

	// Extra FKs
	for (const [name, fk] of targetFKs) {
		if (!sourceFKs.has(name)) {
			diffs.push({
				constraintName: name,
				constraintType: 'foreign_key',
				diffType: 'extra',
				sourceDefinition: undefined,
				targetDefinition: serializeForeignKey(fk)
			});
		}
	}

	// Definition mismatches
	for (const [name, sourceFk] of sourceFKs) {
		if (targetFKs.has(name)) {
			const targetFk = targetFKs.get(name)!;
			const sourceDefn = serializeForeignKey(sourceFk);
			const targetDefn = serializeForeignKey(targetFk);

			if (sourceDefn !== targetDefn) {
				diffs.push({
					constraintName: name,
					constraintType: 'foreign_key',
					diffType: 'definition_mismatch',
					sourceDefinition: sourceDefn,
					targetDefinition: targetDefn
				});
			}
		}
	}

	return diffs;
}

/**
 * Compares unique constraints.
 */
function compareUniqueConstraints(
	sourceTable: TableDefinition,
	targetTable: TableDefinition
): ConstraintDiff[] {
	const sourceUniques = new Map(sourceTable.uniqueConstraints.map((u) => [u.constraintName, u]));
	const targetUniques = new Map(targetTable.uniqueConstraints.map((u) => [u.constraintName, u]));

	const diffs: ConstraintDiff[] = [];

	// Missing unique constraints
	for (const [name, unique] of sourceUniques) {
		if (!targetUniques.has(name)) {
			const columnsArray = normalizeColumnsArray(unique.columns);
			diffs.push({
				constraintName: name,
				constraintType: 'unique',
				diffType: 'missing',
				sourceDefinition: JSON.stringify(columnsArray.sort()),
				targetDefinition: undefined
			});
		}
	}

	// Extra unique constraints
	for (const [name, unique] of targetUniques) {
		if (!sourceUniques.has(name)) {
			const columnsArray = normalizeColumnsArray(unique.columns);
			diffs.push({
				constraintName: name,
				constraintType: 'unique',
				diffType: 'extra',
				sourceDefinition: undefined,
				targetDefinition: JSON.stringify(columnsArray.sort())
			});
		}
	}

	// Definition mismatches
	for (const [name, sourceUnique] of sourceUniques) {
		if (targetUniques.has(name)) {
			const targetUnique = targetUniques.get(name)!;
			const sourceColumnsArray = normalizeColumnsArray(sourceUnique.columns);
			const targetColumnsArray = normalizeColumnsArray(targetUnique.columns);
			const sourceDefn = JSON.stringify(sourceColumnsArray.sort());
			const targetDefn = JSON.stringify(targetColumnsArray.sort());

			if (sourceDefn !== targetDefn) {
				diffs.push({
					constraintName: name,
					constraintType: 'unique',
					diffType: 'definition_mismatch',
					sourceDefinition: sourceDefn,
					targetDefinition: targetDefn
				});
			}
		}
	}

	return diffs;
}

/**
 * Compares check constraints.
 */
function compareCheckConstraints(
	sourceTable: TableDefinition,
	targetTable: TableDefinition
): ConstraintDiff[] {
	const sourceChecks = new Map(sourceTable.checkConstraints.map((c) => [c.constraintName, c]));
	const targetChecks = new Map(targetTable.checkConstraints.map((c) => [c.constraintName, c]));

	const diffs: ConstraintDiff[] = [];

	// Missing check constraints
	for (const [name, check] of sourceChecks) {
		if (!targetChecks.has(name)) {
			diffs.push({
				constraintName: name,
				constraintType: 'check',
				diffType: 'missing',
				sourceDefinition: check.checkClause,
				targetDefinition: undefined
			});
		}
	}

	// Extra check constraints
	for (const [name, check] of targetChecks) {
		if (!sourceChecks.has(name)) {
			diffs.push({
				constraintName: name,
				constraintType: 'check',
				diffType: 'extra',
				sourceDefinition: undefined,
				targetDefinition: check.checkClause
			});
		}
	}

	// Definition mismatches
	for (const [name, sourceCheck] of sourceChecks) {
		if (targetChecks.has(name)) {
			const targetCheck = targetChecks.get(name)!;

			if (sourceCheck.checkClause !== targetCheck.checkClause) {
				diffs.push({
					constraintName: name,
					constraintType: 'check',
					diffType: 'definition_mismatch',
					sourceDefinition: sourceCheck.checkClause,
					targetDefinition: targetCheck.checkClause
				});
			}
		}
	}

	return diffs;
}

/**
 * Compares indexes between source and target tables.
 *
 * @param sourceTable - Source table definition
 * @param targetTable - Target table definition
 * @returns Array of IndexDiff objects
 */
export function compareIndexes(
	sourceTable: TableDefinition,
	targetTable: TableDefinition
): IndexDiff[] {
	const sourceIndexes = new Map(sourceTable.indexes.map((idx) => [idx.indexName, idx]));
	const targetIndexes = new Map(targetTable.indexes.map((idx) => [idx.indexName, idx]));

	const diffs: IndexDiff[] = [];

	// Missing indexes
	for (const [name, index] of sourceIndexes) {
		if (!targetIndexes.has(name)) {
			diffs.push({
				indexName: name,
				diffType: 'missing',
				sourceDefinition: index.indexDefinition,
				targetDefinition: undefined
			});
		}
	}

	// Extra indexes
	for (const [name, index] of targetIndexes) {
		if (!sourceIndexes.has(name)) {
			diffs.push({
				indexName: name,
				diffType: 'extra',
				sourceDefinition: undefined,
				targetDefinition: index.indexDefinition
			});
		}
	}

	// Definition mismatches
	for (const [name, sourceIndex] of sourceIndexes) {
		if (targetIndexes.has(name)) {
			const targetIndex = targetIndexes.get(name)!;

			// Normalize index definitions for comparison (remove schema prefix, normalize whitespace)
			const sourceNormalized = normalizeIndexDefinition(sourceIndex.indexDefinition);
			const targetNormalized = normalizeIndexDefinition(targetIndex.indexDefinition);

			if (sourceNormalized !== targetNormalized) {
				diffs.push({
					indexName: name,
					diffType: 'definition_mismatch',
					sourceDefinition: sourceIndex.indexDefinition,
					targetDefinition: targetIndex.indexDefinition
				});
			}
		}
	}

	return diffs;
}

/**
 * Serializes a foreign key constraint for comparison.
 */
function serializeForeignKey(fk: ForeignKeyConstraint): string {
	const columnsArray = normalizeColumnsArray(fk.columns);
	const referencedColumnsArray = normalizeColumnsArray(fk.referencedColumns);

	return JSON.stringify({
		columns: columnsArray.sort(),
		referencedTable: fk.referencedTable,
		referencedColumns: referencedColumnsArray.sort(),
		onDelete: fk.onDelete,
		onUpdate: fk.onUpdate
	});
}

/**
 * Normalizes index definition for comparison.
 */
function normalizeIndexDefinition(definition: string): string {
	return definition
		.replace(/\s+/g, ' ') // Normalize whitespace
		.replace(/\w+\./g, '') // Remove schema prefixes
		.trim()
		.toLowerCase();
}

/**
 * Normalizes columns to always be an array.
 * Handles both array format and PostgreSQL array string format like "{id,name}".
 */
function normalizeColumnsArray(columns: string[] | string): string[] {
	// If it's already an array, return it
	if (Array.isArray(columns)) {
		return columns;
	}

	// If it's a PostgreSQL array string like "{id,name}", parse it
	if (typeof columns === 'string' && columns.startsWith('{') && columns.endsWith('}')) {
		return columns
			.slice(1, -1) // Remove { and }
			.split(',')
			.map((col) => col.trim())
			.filter((col) => col.length > 0);
	}

	// If it's a single string column name, wrap it in an array
	if (typeof columns === 'string') {
		return [columns];
	}

	// Fallback: return as-is (will cause error if not compatible)
	return columns as string[];
}
