/**
 * Schema Metadata Types
 *
 * Core type definitions for PostgreSQL schema structure representation.
 * Used by schema introspection and comparison tools.
 */

export interface SchemaMetadata {
	schemaName: string; // e.g., "hr_public"
	capturedAt: string; // ISO-8601 timestamp
	postgresVersion: string; // e.g., "14.5"
	tables: TableDefinition[];
	functions: FunctionDefinition[];
	triggers: TriggerDefinition[];
}

export interface TableDefinition {
	tableName: string;
	columns: ColumnDefinition[];
	primaryKey: PrimaryKeyConstraint | null;
	foreignKeys: ForeignKeyConstraint[];
	uniqueConstraints: UniqueConstraint[];
	checkConstraints: CheckConstraint[];
	indexes: IndexDefinition[];
	rowCount?: number; // Optional, for statistics
}

export interface ColumnDefinition {
	columnName: string;
	ordinalPosition: number; // 1-based position in table
	dataType: string; // PostgreSQL type (normalized)
	isNullable: boolean;
	defaultValue: string | null;
	characterMaximumLength: number | null; // For varchar/char types
	numericPrecision: number | null; // For numeric types
	numericScale: number | null; // For numeric types
	isGenerated: boolean; // GENERATED ALWAYS AS
	generationExpression: string | null;
}

// Re-export constraint types (will be defined in constraints.ts)
export type {
	PrimaryKeyConstraint,
	ForeignKeyConstraint,
	UniqueConstraint,
	CheckConstraint,
	IndexDefinition
} from './constraints';

// Re-export function/trigger types (will be defined in functions.ts)
export type { FunctionDefinition, TriggerDefinition } from './functions';

/**
 * Validation Functions
 */

export function validateSchemaName(schemaName: string): boolean {
	return schemaName.length > 0;
}

export function validateTableName(tableName: string): boolean {
	return /^[a-z_][a-z0-9_]*$/.test(tableName);
}

export function validateColumnName(columnName: string): boolean {
	return /^[a-z_][a-z0-9_]*$/.test(columnName);
}

export function validatePostgresVersion(version: string): boolean {
	return /^\d+\.\d+/.test(version);
}

export function validateTimestamp(timestamp: string): boolean {
	try {
		const date = new Date(timestamp);
		return !isNaN(date.getTime()) && date.toISOString() === timestamp;
	} catch {
		return false;
	}
}

export function validateSchemaMetadata(schema: SchemaMetadata): string[] {
	const errors: string[] = [];

	if (!validateSchemaName(schema.schemaName)) {
		errors.push('schemaName must be non-empty string');
	}

	if (!validateTimestamp(schema.capturedAt)) {
		errors.push('capturedAt must be valid ISO-8601 timestamp');
	}

	if (!validatePostgresVersion(schema.postgresVersion)) {
		errors.push('postgresVersion must match pattern ^\\d+\\.\\d+');
	}

	if (schema.tables.length === 0) {
		errors.push('tables array must contain at least one table');
	}

	return errors;
}

export function validateTableDefinition(table: TableDefinition): string[] {
	const errors: string[] = [];

	if (!validateTableName(table.tableName)) {
		errors.push(`tableName "${table.tableName}" must match pattern ^[a-z_][a-z0-9_]*$`);
	}

	if (table.columns.length === 0) {
		errors.push('columns array must contain at least one column');
	}

	// Check for unique column names
	const columnNames = new Set<string>();
	for (const column of table.columns) {
		if (columnNames.has(column.columnName)) {
			errors.push(`Duplicate column name: ${column.columnName}`);
		}
		columnNames.add(column.columnName);
	}

	// Validate primary key references existing columns
	if (table.primaryKey) {
		for (const pkCol of table.primaryKey.columns) {
			if (!columnNames.has(pkCol)) {
				errors.push(`Primary key references non-existent column: ${pkCol}`);
			}
		}
	}

	return errors;
}

export function validateColumnDefinition(column: ColumnDefinition): string[] {
	const errors: string[] = [];

	if (!validateColumnName(column.columnName)) {
		errors.push(`columnName "${column.columnName}" must match pattern ^[a-z_][a-z0-9_]*$`);
	}

	if (column.ordinalPosition < 1) {
		errors.push('ordinalPosition must be positive integer');
	}

	if (column.isGenerated && !column.generationExpression) {
		errors.push('If isGenerated is true, generationExpression must be non-null');
	}

	return errors;
}
