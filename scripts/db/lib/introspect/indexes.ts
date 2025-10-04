/**
 * Index Introspection (T019 - Part 1)
 *
 * Queries pg_catalog.pg_indexes to extract index metadata.
 */

import type { Client } from 'pg';
import type { IndexDefinition, IndexType } from '../../types/constraints';

/**
 * Introspects all indexes for a specific table.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns Array of IndexDefinition objects
 */
export async function introspectIndexes(
	client: Client,
	schemaName: string,
	tableName: string
): Promise<IndexDefinition[]> {
	const query = `
		SELECT
			i.indexname as index_name,
			i.indexdef as index_definition,
			ix.indisunique as is_unique,
			am.amname as index_type,
			pg_get_expr(ix.indpred, ix.indrelid) as where_clause
		FROM pg_catalog.pg_indexes i
		JOIN pg_catalog.pg_class c ON c.relname = i.tablename
		JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
		JOIN pg_catalog.pg_index ix ON ix.indexrelid = (
			SELECT oid FROM pg_catalog.pg_class WHERE relname = i.indexname AND relnamespace = n.oid
		)
		JOIN pg_catalog.pg_am am ON am.oid = (
			SELECT relam FROM pg_catalog.pg_class WHERE oid = ix.indexrelid
		)
		WHERE i.schemaname = $1
			AND i.tablename = $2
			AND i.indexname NOT LIKE '%_pkey'  -- Exclude primary key indexes (handled separately)
		ORDER BY i.indexname;
	`;

	const result = await client.query(query, [schemaName, tableName]);

	return result.rows.map((row) => {
		const columns = extractColumnsFromIndexDef(row.index_definition);
		const indexType = normalizeIndexType(row.index_type);

		return {
			indexName: row.index_name,
			columns,
			isUnique: row.is_unique,
			indexType,
			whereClause: row.where_clause,
			indexDefinition: row.index_definition
		};
	});
}

/**
 * Extracts column names from CREATE INDEX statement.
 *
 * @param indexDef - Full CREATE INDEX statement
 * @returns Array of column names
 */
function extractColumnsFromIndexDef(indexDef: string): string[] {
	// Example: "CREATE INDEX idx_users_email ON hr_public.users USING btree (email)"
	// Extract content between parentheses
	const match = indexDef.match(/\(([^)]+)\)/);
	if (!match) return [];

	const columnsPart = match[1];

	// Split by comma and clean up
	return columnsPart
		.split(',')
		.map((col) => {
			// Remove ASC/DESC, NULLS FIRST/LAST, etc.
			return col
				.trim()
				.replace(/\s+(ASC|DESC|NULLS\s+FIRST|NULLS\s+LAST)/gi, '')
				.trim();
		})
		.filter((col) => col.length > 0);
}

/**
 * Normalizes PostgreSQL access method names to IndexType enum.
 *
 * @param amname - Access method name (e.g., "btree", "hash")
 * @returns Normalized IndexType
 */
function normalizeIndexType(amname: string): IndexType {
	const normalized = amname.toUpperCase();
	switch (normalized) {
		case 'BTREE':
			return 'BTREE';
		case 'HASH':
			return 'HASH';
		case 'GIN':
			return 'GIN';
		case 'GIST':
			return 'GIST';
		case 'SPGIST':
			return 'SP-GIST';
		case 'BRIN':
			return 'BRIN';
		default:
			return 'BTREE'; // Default fallback
	}
}

/**
 * Gets a specific index definition.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @param indexName - Index name
 * @returns IndexDefinition or null if not found
 */
export async function introspectIndex(
	client: Client,
	schemaName: string,
	tableName: string,
	indexName: string
): Promise<IndexDefinition | null> {
	const indexes = await introspectIndexes(client, schemaName, tableName);
	return indexes.find((idx) => idx.indexName === indexName) || null;
}
