/**
 * SQL Template System (T028)
 *
 * Reusable SQL generation templates for migration creation.
 * All templates use IF NOT EXISTS guards for idempotency.
 */

import type { TableDefinition, ColumnDefinition } from '../../types/schema';
import type {
	PrimaryKeyConstraint,
	ForeignKeyConstraint,
	UniqueConstraint,
	CheckConstraint,
	IndexDefinition
} from '../../types/constraints';

/**
 * Generates a CREATE TABLE statement with IF NOT EXISTS guard.
 *
 * @param tableDef - Table definition
 * @param schemaName - Schema name (default: hr_public)
 * @returns CREATE TABLE SQL
 */
export function generateCreateTable(
	tableDef: TableDefinition,
	schemaName: string = 'hr_public'
): string {
	const lines: string[] = [];

	lines.push(`CREATE TABLE IF NOT EXISTS ${schemaName}.${tableDef.tableName} (`);

	// Column definitions
	const columnDefs = tableDef.columns.map((col) => {
		const parts: string[] = [`  ${col.columnName} ${col.dataType}`];

		if (!col.isNullable) {
			parts.push('NOT NULL');
		}

		if (col.defaultValue) {
			parts.push(`DEFAULT ${col.defaultValue}`);
		}

		return parts.join(' ');
	});

	lines.push(columnDefs.join(',\n'));

	// Primary key inline if exists
	if (tableDef.primaryKey) {
		const pkColumns = tableDef.primaryKey.columns.join(', ');
		lines.push(`,\n  CONSTRAINT ${tableDef.primaryKey.constraintName} PRIMARY KEY (${pkColumns})`);
	}

	lines.push(');');

	return lines.join('\n');
}

/**
 * Generates an ALTER TABLE ADD COLUMN statement.
 *
 * @param tableName - Table name
 * @param column - Column definition
 * @param schemaName - Schema name (default: hr_public)
 * @returns ALTER TABLE SQL
 */
export function generateAddColumn(
	tableName: string,
	column: ColumnDefinition,
	schemaName: string = 'hr_public'
): string {
	const parts: string[] = [`ALTER TABLE ${schemaName}.${tableName}`];
	parts.push(`ADD COLUMN IF NOT EXISTS ${column.columnName} ${column.dataType}`);

	if (!column.isNullable) {
		parts.push('NOT NULL');
	}

	if (column.defaultValue) {
		parts.push(`DEFAULT ${column.defaultValue}`);
	}

	return parts.join(' ') + ';';
}

/**
 * Generates an ALTER TABLE DROP COLUMN statement.
 *
 * @param tableName - Table name
 * @param columnName - Column name
 * @param schemaName - Schema name (default: hr_public)
 * @returns ALTER TABLE SQL
 */
export function generateDropColumn(
	tableName: string,
	columnName: string,
	schemaName: string = 'hr_public'
): string {
	return `ALTER TABLE ${schemaName}.${tableName} DROP COLUMN IF EXISTS ${columnName};`;
}

/**
 * Generates an ALTER TABLE ALTER COLUMN statement for type changes.
 *
 * @param tableName - Table name
 * @param columnName - Column name
 * @param newType - New data type
 * @param schemaName - Schema name (default: hr_public)
 * @returns ALTER TABLE SQL
 */
export function generateAlterColumnType(
	tableName: string,
	columnName: string,
	newType: string,
	schemaName: string = 'hr_public'
): string {
	return `ALTER TABLE ${schemaName}.${tableName} ALTER COLUMN ${columnName} TYPE ${newType};`;
}

/**
 * Generates an ALTER TABLE ALTER COLUMN statement for nullability.
 *
 * @param tableName - Table name
 * @param columnName - Column name
 * @param nullable - True for NULL, false for NOT NULL
 * @param schemaName - Schema name (default: hr_public)
 * @returns ALTER TABLE SQL
 */
export function generateAlterColumnNullability(
	tableName: string,
	columnName: string,
	nullable: boolean,
	schemaName: string = 'hr_public'
): string {
	const action = nullable ? 'DROP NOT NULL' : 'SET NOT NULL';
	return `ALTER TABLE ${schemaName}.${tableName} ALTER COLUMN ${columnName} ${action};`;
}

/**
 * Generates a CREATE INDEX statement with IF NOT EXISTS guard.
 *
 * @param indexDef - Index definition
 * @param tableName - Table name
 * @param schemaName - Schema name (default: hr_public)
 * @returns CREATE INDEX SQL
 */
export function generateCreateIndex(
	indexDef: IndexDefinition,
	tableName: string,
	schemaName: string = 'hr_public'
): string {
	const unique = indexDef.isUnique ? 'UNIQUE ' : '';
	const columns = indexDef.columns.join(', ');
	const using = `USING ${indexDef.indexType.toLowerCase()}`;
	const where = indexDef.whereClause ? ` WHERE ${indexDef.whereClause}` : '';

	return `CREATE ${unique}INDEX IF NOT EXISTS ${indexDef.indexName} ON ${schemaName}.${tableName} ${using} (${columns})${where};`;
}

/**
 * Generates a DROP INDEX statement.
 *
 * @param indexName - Index name
 * @param schemaName - Schema name (default: hr_public)
 * @returns DROP INDEX SQL
 */
export function generateDropIndex(indexName: string, schemaName: string = 'hr_public'): string {
	return `DROP INDEX IF EXISTS ${schemaName}.${indexName};`;
}

/**
 * Generates an ALTER TABLE ADD CONSTRAINT statement for primary key.
 *
 * @param tableName - Table name
 * @param constraint - Primary key constraint
 * @param schemaName - Schema name (default: hr_public)
 * @returns ALTER TABLE SQL
 */
export function generateAddPrimaryKey(
	tableName: string,
	constraint: PrimaryKeyConstraint,
	schemaName: string = 'hr_public'
): string {
	const columns = constraint.columns.join(', ');
	return `ALTER TABLE ${schemaName}.${tableName} ADD CONSTRAINT ${constraint.constraintName} PRIMARY KEY (${columns});`;
}

/**
 * Generates an ALTER TABLE ADD CONSTRAINT statement for foreign key.
 *
 * @param tableName - Table name
 * @param constraint - Foreign key constraint
 * @param schemaName - Schema name (default: hr_public)
 * @returns ALTER TABLE SQL
 */
export function generateAddForeignKey(
	tableName: string,
	constraint: ForeignKeyConstraint,
	schemaName: string = 'hr_public'
): string {
	const localColumns = constraint.columns.join(', ');
	const refColumns = constraint.referencedColumns.join(', ');
	const onDelete = constraint.onDelete !== 'NO ACTION' ? ` ON DELETE ${constraint.onDelete}` : '';
	const onUpdate = constraint.onUpdate !== 'NO ACTION' ? ` ON UPDATE ${constraint.onUpdate}` : '';

	return `ALTER TABLE ${schemaName}.${tableName} ADD CONSTRAINT ${constraint.constraintName} FOREIGN KEY (${localColumns}) REFERENCES ${schemaName}.${constraint.referencedTable} (${refColumns})${onDelete}${onUpdate};`;
}

/**
 * Generates an ALTER TABLE ADD CONSTRAINT statement for unique constraint.
 *
 * @param tableName - Table name
 * @param constraint - Unique constraint
 * @param schemaName - Schema name (default: hr_public)
 * @returns ALTER TABLE SQL
 */
export function generateAddUniqueConstraint(
	tableName: string,
	constraint: UniqueConstraint,
	schemaName: string = 'hr_public'
): string {
	const columns = constraint.columns.join(', ');
	return `ALTER TABLE ${schemaName}.${tableName} ADD CONSTRAINT ${constraint.constraintName} UNIQUE (${columns});`;
}

/**
 * Generates an ALTER TABLE ADD CONSTRAINT statement for check constraint.
 *
 * @param tableName - Table name
 * @param constraint - Check constraint
 * @param schemaName - Schema name (default: hr_public)
 * @returns ALTER TABLE SQL
 */
export function generateAddCheckConstraint(
	tableName: string,
	constraint: CheckConstraint,
	schemaName: string = 'hr_public'
): string {
	return `ALTER TABLE ${schemaName}.${tableName} ADD CONSTRAINT ${constraint.constraintName} CHECK (${constraint.checkClause});`;
}

/**
 * Generates an ALTER TABLE DROP CONSTRAINT statement.
 *
 * @param tableName - Table name
 * @param constraintName - Constraint name
 * @param schemaName - Schema name (default: hr_public)
 * @returns ALTER TABLE SQL
 */
export function generateDropConstraint(
	tableName: string,
	constraintName: string,
	schemaName: string = 'hr_public'
): string {
	return `ALTER TABLE ${schemaName}.${tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`;
}

/**
 * Wraps SQL statements in a transaction block.
 *
 * @param statements - Array of SQL statements
 * @returns SQL with BEGIN/COMMIT
 */
export function wrapInTransaction(statements: string[]): string {
	return ['BEGIN;', '', ...statements, '', 'COMMIT;'].join('\n');
}

/**
 * Generates a migration file header with metadata.
 *
 * @param description - Migration description
 * @param source - Source of migration (e.g., "auto-generated", "manual")
 * @param affectedObjects - List of affected tables/columns
 * @param requiresReview - Whether manual review is required
 * @returns Header comment block
 */
export function generateMigrationHeader(
	description: string,
	source: string,
	affectedObjects: string[],
	requiresReview: boolean = true
): string {
	return [
		`-- Migration: ${description}`,
		`-- Created: ${new Date().toISOString()}`,
		`-- Source: ${source}`,
		`-- Affected: ${affectedObjects.join(', ')}`,
		`-- Requires Review: ${requiresReview ? 'YES' : 'NO'}`,
		'--'
	].join('\n');
}

/**
 * Generates a complete migration file with header and transaction.
 *
 * @param description - Migration description
 * @param source - Source of migration
 * @param affectedObjects - Affected tables/columns
 * @param statements - SQL statements to include
 * @param requiresReview - Whether manual review is required
 * @returns Complete migration file content
 */
export function generateMigrationFile(
	description: string,
	source: string,
	affectedObjects: string[],
	statements: string[],
	requiresReview: boolean = true
): string {
	const header = generateMigrationHeader(description, source, affectedObjects, requiresReview);
	const body = wrapInTransaction(statements);

	return [header, '', body].join('\n');
}
