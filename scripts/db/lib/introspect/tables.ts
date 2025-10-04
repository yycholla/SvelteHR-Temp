/**
 * Table Introspection (T018 - Part 1)
 *
 * Queries information_schema.tables to extract table metadata.
 */

import type { Client } from 'pg';
import type { TableDefinition } from '../../types/schema';
import { introspectColumns } from './columns';
import { introspectIndexes } from './indexes';
import { introspectConstraints } from './constraints';

/**
 * Introspects all tables in the specified schema.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name to introspect (e.g., "hr_public")
 * @returns Array of TableDefinition objects
 */
export async function introspectTables(
	client: Client,
	schemaName: string
): Promise<TableDefinition[]> {
	const query = `
		SELECT
			table_name,
			table_type
		FROM information_schema.tables
		WHERE table_schema = $1
			AND table_type = 'BASE TABLE'
		ORDER BY table_name;
	`;

	const result = await client.query(query, [schemaName]);

	const tables: TableDefinition[] = [];

	for (const row of result.rows) {
		const tableName = row.table_name;

		// Get row count (optional statistics)
		const rowCount = await getTableRowCount(client, schemaName, tableName);

		// Introspect related objects
		const columns = await introspectColumns(client, schemaName, tableName);
		const constraints = await introspectConstraints(client, schemaName, tableName);
		const indexes = await introspectIndexes(client, schemaName, tableName);

		tables.push({
			tableName,
			columns,
			primaryKey: constraints.primaryKey,
			foreignKeys: constraints.foreignKeys,
			uniqueConstraints: constraints.uniqueConstraints,
			checkConstraints: constraints.checkConstraints,
			indexes,
			rowCount
		});
	}

	return tables;
}

/**
 * Gets the row count for a table (optional statistics).
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns Row count or undefined if error
 */
async function getTableRowCount(
	client: Client,
	schemaName: string,
	tableName: string
): Promise<number | undefined> {
	try {
		const query = `SELECT COUNT(*) as count FROM "${schemaName}"."${tableName}";`;
		const result = await client.query(query);
		return parseInt(result.rows[0].count, 10);
	} catch (error) {
		// If count fails (large table, permissions), return undefined
		return undefined;
	}
}

/**
 * Checks if a table exists in the schema.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns True if table exists
 */
export async function tableExists(
	client: Client,
	schemaName: string,
	tableName: string
): Promise<boolean> {
	const query = `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = $1
				AND table_name = $2
				AND table_type = 'BASE TABLE'
		) as exists;
	`;

	const result = await client.query(query, [schemaName, tableName]);
	return result.rows[0].exists;
}
