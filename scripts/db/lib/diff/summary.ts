/**
 * Diff Summary Generation (T025)
 *
 * Generates summary statistics and aggregates diff results.
 * Creates DiffSummary with counts of all difference types.
 */

import type { SchemaDiff, DiffSummary, TableDiff } from '../../types/diff';
import type { SchemaMetadata } from '../../types/schema';
import { createEmptyDiffSummary } from '../../types/diff';

/**
 * Generates a complete SchemaDiff with summary from table diffs.
 *
 * @param source - Source schema metadata
 * @param target - Target schema metadata
 * @param tableDiffs - Array of table differences
 * @returns Complete SchemaDiff object
 */
export function generateSchemaDiff(
	source: SchemaMetadata,
	target: SchemaMetadata,
	tableDiffs: TableDiff[]
): SchemaDiff {
	const summary = generateDiffSummary(tableDiffs);

	return {
		sourceSchema: `${source.schemaName} (captured: ${source.capturedAt})`,
		targetSchema: `${target.schemaName} (captured: ${target.capturedAt})`,
		comparedAt: new Date().toISOString(),
		hasDifferences: summary.totalDifferences > 0,
		tableDiffs,
		summary
	};
}

/**
 * Generates DiffSummary statistics from table diffs.
 *
 * @param tableDiffs - Array of table differences
 * @returns DiffSummary with all counts
 */
export function generateDiffSummary(tableDiffs: TableDiff[]): DiffSummary {
	const summary = createEmptyDiffSummary();

	for (const tableDiff of tableDiffs) {
		// Count table-level differences
		switch (tableDiff.diffType) {
			case 'missing':
				summary.missingTables++;
				break;
			case 'extra':
				summary.extraTables++;
				break;
			case 'modified':
				summary.modifiedTables++;
				break;
		}

		// Count column differences
		for (const columnDiff of tableDiff.columnDiffs) {
			switch (columnDiff.diffType) {
				case 'missing':
					summary.missingColumns++;
					break;
				case 'extra':
					summary.extraColumns++;
					break;
				case 'type_mismatch':
				case 'nullability_mismatch':
				case 'default_mismatch':
					summary.modifiedColumns++;
					break;
			}
		}

		// Count index differences
		for (const indexDiff of tableDiff.indexDiffs) {
			switch (indexDiff.diffType) {
				case 'missing':
					summary.missingIndexes++;
					break;
				case 'extra':
					summary.extraIndexes++;
					break;
			}
		}
	}

	// Calculate total differences
	summary.totalDifferences =
		summary.missingTables +
		summary.extraTables +
		summary.modifiedTables +
		summary.missingColumns +
		summary.extraColumns +
		summary.modifiedColumns +
		summary.missingIndexes +
		summary.extraIndexes;

	return summary;
}

/**
 * Generates a human-readable summary text.
 *
 * @param diff - SchemaDiff object
 * @returns Markdown-formatted summary text
 */
export function generateSummaryText(diff: SchemaDiff): string {
	const s = diff.summary;

	if (!diff.hasDifferences) {
		return '✅ **PASS**: Schemas are identical. No differences found.';
	}

	const lines: string[] = [];
	lines.push('## Schema Diff Summary');
	lines.push('');
	lines.push(`**Source**: ${diff.sourceSchema}`);
	lines.push(`**Target**: ${diff.targetSchema}`);
	lines.push(`**Compared**: ${diff.comparedAt}`);
	lines.push('');

	lines.push('### Differences Found');
	lines.push('');

	if (s.missingTables > 0) {
		lines.push(`- **${s.missingTables}** missing tables (in source, not in target)`);
	}

	if (s.extraTables > 0) {
		lines.push(`- **${s.extraTables}** extra tables (in target, not in source)`);
	}

	if (s.modifiedTables > 0) {
		lines.push(`- **${s.modifiedTables}** modified tables`);
	}

	if (s.missingColumns > 0) {
		lines.push(`- **${s.missingColumns}** missing columns`);
	}

	if (s.extraColumns > 0) {
		lines.push(`- **${s.extraColumns}** extra columns`);
	}

	if (s.modifiedColumns > 0) {
		lines.push(`- **${s.modifiedColumns}** modified columns (type/nullability/default changes)`);
	}

	if (s.missingIndexes > 0) {
		lines.push(`- **${s.missingIndexes}** missing indexes`);
	}

	if (s.extraIndexes > 0) {
		lines.push(`- **${s.extraIndexes}** extra indexes`);
	}

	lines.push('');
	lines.push(`**Total Differences**: ${s.totalDifferences}`);

	return lines.join('\n');
}

/**
 * Generates detailed diff report in Markdown format.
 *
 * @param diff - SchemaDiff object
 * @returns Detailed Markdown report
 */
export function generateDetailedReport(diff: SchemaDiff): string {
	const lines: string[] = [];

	lines.push('# Schema Verification Report');
	lines.push('');
	lines.push(generateSummaryText(diff));
	lines.push('');

	if (!diff.hasDifferences) {
		return lines.join('\n');
	}

	lines.push('## Detailed Differences');
	lines.push('');

	for (const tableDiff of diff.tableDiffs) {
		lines.push(`### Table: \`${tableDiff.tableName}\``);
		lines.push('');

		switch (tableDiff.diffType) {
			case 'missing':
				lines.push('**Status**: Missing (exists in source, not in target)');
				break;
			case 'extra':
				lines.push('**Status**: Extra (exists in target, not in source)');
				break;
			case 'modified':
				lines.push('**Status**: Modified');
				break;
		}

		lines.push('');

		// Column diffs
		if (tableDiff.columnDiffs.length > 0) {
			lines.push('#### Column Differences');
			lines.push('');

			for (const colDiff of tableDiff.columnDiffs) {
				lines.push(`- **${colDiff.columnName}**: ${colDiff.diffType}`);

				if (colDiff.sourceValue !== undefined) {
					lines.push(`  - Source: \`${colDiff.sourceValue}\``);
				}

				if (colDiff.targetValue !== undefined) {
					lines.push(`  - Target: \`${colDiff.targetValue}\``);
				}
			}

			lines.push('');
		}

		// Constraint diffs
		if (tableDiff.constraintDiffs.length > 0) {
			lines.push('#### Constraint Differences');
			lines.push('');

			for (const constDiff of tableDiff.constraintDiffs) {
				lines.push(
					`- **${constDiff.constraintName}** (${constDiff.constraintType}): ${constDiff.diffType}`
				);
			}

			lines.push('');
		}

		// Index diffs
		if (tableDiff.indexDiffs.length > 0) {
			lines.push('#### Index Differences');
			lines.push('');

			for (const idxDiff of tableDiff.indexDiffs) {
				lines.push(`- **${idxDiff.indexName}**: ${idxDiff.diffType}`);
			}

			lines.push('');
		}
	}

	return lines.join('\n');
}

/**
 * Determines severity level of differences.
 *
 * @param diff - SchemaDiff object
 * @returns Severity: 'critical', 'warning', or 'info'
 */
export function determineSeverity(diff: SchemaDiff): 'critical' | 'warning' | 'info' {
	if (!diff.hasDifferences) {
		return 'info';
	}

	const s = diff.summary;

	// Critical: Missing tables, extra tables, or type mismatches
	if (s.missingTables > 0 || s.extraTables > 0) {
		return 'critical';
	}

	// Check for critical column changes
	for (const tableDiff of diff.tableDiffs) {
		for (const colDiff of tableDiff.columnDiffs) {
			if (colDiff.diffType === 'type_mismatch' || colDiff.diffType === 'missing') {
				return 'critical';
			}
		}
	}

	// Warning: Modified tables, columns, indexes
	return 'warning';
}
