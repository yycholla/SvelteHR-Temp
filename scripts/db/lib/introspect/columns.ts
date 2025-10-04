/**
 * Column Introspection (T018 - Part 2)
 *
 * Queries information_schema.columns to extract column metadata with normalization.
 */

import type { Client } from 'pg';
import type { ColumnDefinition } from '../../types/schema';
import { normalizeDataType } from '../normalize';

/**
 * Introspects all columns for a specific table.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns Array of ColumnDefinition objects
 */
export async function introspectColumns(
	client: Client,
	schemaName: string,
	tableName: string
): Promise<ColumnDefinition[]> {
	const query = `
		SELECT
			column_name,
			ordinal_position,
			data_type,
			is_nullable,
			column_default,
			character_maximum_length,
			numeric_precision,
			numeric_scale,
			is_generated,
			generation_expression
		FROM information_schema.columns
		WHERE table_schema = $1
			AND table_name = $2
		ORDER BY ordinal_position;
	`;

	const result = await client.query(query, [schemaName, tableName]);

	return result.rows.map((row) => {
		const dataType = normalizeDataType(row.data_type);

		return {
			columnName: row.column_name,
			ordinalPosition: row.ordinal_position,
			dataType,
			isNullable: row.is_nullable === 'YES',
			defaultValue: row.column_default,
			characterMaximumLength: row.character_maximum_length,
			numericPrecision: row.numeric_precision,
			numericScale: row.numeric_scale,
			isGenerated: row.is_generated === 'ALWAYS',
			generationExpression: row.generation_expression
		};
	});
}

/**
 * Gets a specific column definition.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @param columnName - Column name
 * @returns ColumnDefinition or null if not found
 */
export async function introspectColumn(
	client: Client,
	schemaName: string,
	tableName: string,
	columnName: string
): Promise<ColumnDefinition | null> {
	const columns = await introspectColumns(client, schemaName, tableName);
	return columns.find((col) => col.columnName === columnName) || null;
}

/**
 * Checks if a column exists in a table.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @param columnName - Column name
 * @returns True if column exists
 */
export async function columnExists(
	client: Client,
	schemaName: string,
	tableName: string,
	columnName: string
): Promise<boolean> {
	const query = `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = $1
				AND table_name = $2
				AND column_name = $3
		) as exists;
	`;

	const result = await client.query(query, [schemaName, tableName, columnName]);
	return result.rows[0].exists;
}
