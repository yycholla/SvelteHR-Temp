/**
 * Rollback Migration Generator (T032)
 *
 * Generates inverse SQL statements for rollback migrations.
 * Returns null for irreversible operations with explanation.
 */

import type { MigrationMetadata } from '../types/migration';

/**
 * Result of rollback generation attempt.
 */
export interface RollbackResult {
	sql: string | null;
	irreversible: boolean;
	reason?: string;
	warnings: string[];
}

/**
 * Generates rollback SQL for a forward migration.
 *
 * Analyzes forward SQL and produces inverse operations:
 * - CREATE TABLE → DROP TABLE CASCADE
 * - ADD COLUMN → DROP COLUMN
 * - CREATE INDEX → DROP INDEX
 * - ALTER COLUMN TYPE → Requires manual rollback
 * - DROP COLUMN → Cannot reverse (data loss)
 *
 * @param forwardSql - Forward migration SQL
 * @param metadata - Migration metadata for context
 * @returns RollbackResult with SQL or irreversibility reason
 */
export function generateRollback(
	forwardSql: string,
	metadata: MigrationMetadata
): RollbackResult {
	const result: RollbackResult = {
		sql: null,
		irreversible: false,
		warnings: []
	};

	// Remove header comments and transaction blocks for analysis
	const cleanSql = forwardSql
		.split('\n')
		.filter((line) => !line.trim().startsWith('--'))
		.join('\n')
		.replace(/BEGIN;/gi, '')
		.replace(/COMMIT;/gi, '')
		.trim();

	const statements = parseStatements(cleanSql);
	const rollbackStatements: string[] = [];

	for (const stmt of statements) {
		const rollbackStmt = generateRollbackForStatement(stmt, result.warnings);

		if (rollbackStmt === null) {
			result.irreversible = true;
			result.reason = `Cannot auto-generate rollback for: ${stmt.substring(0, 50)}...`;
			return result;
		}

		rollbackStatements.push(rollbackStmt);
	}

	// Reverse order of rollback statements (drop in reverse order of creation)
	rollbackStatements.reverse();

	// Build complete rollback SQL
	const rollbackLines: string[] = ['BEGIN;', ''];

	// Add data loss warning if applicable
	if (hasDataLossRisk(statements)) {
		rollbackLines.push('-- WARNING: This rollback may result in data loss');
		rollbackLines.push('-- Review carefully before executing');
		rollbackLines.push('');
		result.warnings.push('Rollback may cause data loss');
	}

	rollbackLines.push(...rollbackStatements);
	rollbackLines.push('', 'COMMIT;');

	result.sql = rollbackLines.join('\n');
	return result;
}

/**
 * Parses SQL into individual statements.
 *
 * @param sql - SQL to parse
 * @returns Array of SQL statements
 */
function parseStatements(sql: string): string[] {
	// Simple split on semicolons (doesn't handle complex cases)
	return sql
		.split(';')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/**
 * Generates rollback statement for a single forward statement.
 *
 * @param statement - Forward SQL statement
 * @param warnings - Array to append warnings to
 * @returns Rollback SQL or null if irreversible
 */
function generateRollbackForStatement(statement: string, warnings: string[]): string | null {
	const upper = statement.toUpperCase().trim();

	// CREATE TABLE
	if (upper.startsWith('CREATE TABLE')) {
		const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+\.[a-z_]+)/i);
		if (match) {
			const tableName = match[1];
			warnings.push(`Dropping table ${tableName} will delete all data`);
			return `DROP TABLE IF EXISTS ${tableName} CASCADE;`;
		}
	}

	// ALTER TABLE ADD COLUMN
	if (upper.includes('ALTER TABLE') && upper.includes('ADD COLUMN')) {
		const tableMatch = statement.match(/ALTER TABLE ([a-z_]+\.[a-z_]+)/i);
		const columnMatch = statement.match(/ADD COLUMN (?:IF NOT EXISTS )?([a-z_]+)/i);
		if (tableMatch && columnMatch) {
			const tableName = tableMatch[1];
			const columnName = columnMatch[1];
			return `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName};`;
		}
	}

	// CREATE INDEX
	if (upper.startsWith('CREATE') && upper.includes('INDEX')) {
		const match = statement.match(/INDEX (?:IF NOT EXISTS )?([a-z_]+)/i);
		if (match) {
			const indexName = match[1];
			// Extract schema if present
			const schemaMatch = statement.match(/ON ([a-z_]+)\./i);
			const schema = schemaMatch ? schemaMatch[1] : 'hr_public';
			return `DROP INDEX IF EXISTS ${schema}.${indexName};`;
		}
	}

	// ALTER TABLE ADD CONSTRAINT (Primary Key, Foreign Key, Unique, Check)
	if (upper.includes('ALTER TABLE') && upper.includes('ADD CONSTRAINT')) {
		const tableMatch = statement.match(/ALTER TABLE ([a-z_]+\.[a-z_]+)/i);
		const constraintMatch = statement.match(/ADD CONSTRAINT ([a-z_]+)/i);
		if (tableMatch && constraintMatch) {
			const tableName = tableMatch[1];
			const constraintName = constraintMatch[1];
			return `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`;
		}
	}

	// DROP COLUMN - Irreversible (data loss)
	if (upper.includes('ALTER TABLE') && upper.includes('DROP COLUMN')) {
		return null; // Cannot reverse column drops
	}

	// ALTER COLUMN TYPE - Potentially reversible but complex
	if (upper.includes('ALTER TABLE') && upper.includes('ALTER COLUMN') && upper.includes('TYPE')) {
		// Would need to know the old type, which we don't have
		warnings.push('ALTER COLUMN TYPE rollback requires manual review');
		return null;
	}

	// DROP TABLE - Irreversible (data loss)
	if (upper.startsWith('DROP TABLE')) {
		return null;
	}

	// DROP INDEX - Reversible but requires original index definition
	if (upper.startsWith('DROP INDEX')) {
		warnings.push('DROP INDEX rollback requires recreating index with original definition');
		return null;
	}

	// ALTER COLUMN SET/DROP NOT NULL
	if (upper.includes('ALTER COLUMN') && (upper.includes('SET NOT NULL') || upper.includes('DROP NOT NULL'))) {
		const tableMatch = statement.match(/ALTER TABLE ([a-z_]+\.[a-z_]+)/i);
		const columnMatch = statement.match(/ALTER COLUMN ([a-z_]+)/i);
		if (tableMatch && columnMatch) {
			const tableName = tableMatch[1];
			const columnName = columnMatch[1];
			const action = upper.includes('SET NOT NULL') ? 'DROP NOT NULL' : 'SET NOT NULL';
			return `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} ${action};`;
		}
	}

	// Unknown statement type
	warnings.push(`Unknown statement type: ${statement.substring(0, 50)}...`);
	return null;
}

/**
 * Checks if statements have data loss risk.
 *
 * @param statements - Forward SQL statements
 * @returns True if any statement can cause data loss on rollback
 */
function hasDataLossRisk(statements: string[]): boolean {
	for (const stmt of statements) {
		const upper = stmt.toUpperCase();
		if (
			upper.includes('CREATE TABLE') ||
			upper.includes('ADD COLUMN') ||
			upper.includes('DROP COLUMN')
		) {
			return true;
		}
	}
	return false;
}

/**
 * Validates if a rollback is safe to execute.
 *
 * @param rollbackSql - Rollback SQL to validate
 * @returns Validation result with warnings
 */
export function validateRollback(rollbackSql: string): {
	valid: boolean;
	warnings: string[];
	errors: string[];
} {
	const warnings: string[] = [];
	const errors: string[] = [];

	// Check for dangerous operations
	if (rollbackSql.includes('DROP TABLE')) {
		warnings.push('Rollback drops tables - this will delete all data');
	}

	if (rollbackSql.includes('DROP COLUMN')) {
		warnings.push('Rollback drops columns - this will delete data in those columns');
	}

	// Check for missing transaction block
	if (!rollbackSql.includes('BEGIN') || !rollbackSql.includes('COMMIT')) {
		errors.push('Rollback SQL must be wrapped in BEGIN/COMMIT transaction');
	}

	return {
		valid: errors.length === 0,
		warnings,
		errors
	};
}

/**
 * Generates a warning header for rollback files.
 *
 * @param affectedTables - Tables affected by rollback
 * @returns Warning header as SQL comment
 */
export function generateRollbackWarningHeader(affectedTables: string[]): string {
	return [
		'-- ========================================',
		'-- ROLLBACK MIGRATION - USE WITH CAUTION',
		'-- ========================================',
		'--',
		'-- This rollback migration will undo changes from the forward migration.',
		'-- WARNING: Executing this may result in DATA LOSS.',
		'--',
		`-- Affected tables: ${affectedTables.join(', ')}`,
		'--',
		'-- BEFORE EXECUTING:',
		'--   1. Backup the database',
		'--   2. Review all DROP operations carefully',
		'--   3. Verify no critical data will be lost',
		'--   4. Test in a non-production environment first',
		'--',
		''
	].join('\n');
}
