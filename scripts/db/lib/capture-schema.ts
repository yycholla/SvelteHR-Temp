/**
 * Schema Metadata Capture Service (T021)
 *
 * Orchestrates all introspection queries to capture complete schema metadata.
 */

import { Client } from 'pg';
import type { SchemaMetadata } from '../types/schema';
import { introspectTables } from './introspect/tables';
import { introspectFunctions, introspectTriggers } from './introspect/triggers';

/**
 * Captures complete schema metadata from a PostgreSQL database.
 *
 * @param dbUrl - Database connection URL
 * @param schemaName - Schema name to introspect (e.g., "hr_public")
 * @returns Complete SchemaMetadata object
 */
export async function captureSchema(dbUrl: string, schemaName: string): Promise<SchemaMetadata> {
	const client = new Client({ connectionString: dbUrl });

	try {
		await client.connect();

		// Get PostgreSQL version
		const postgresVersion = await getPostgresVersion(client);

		// Introspect all schema objects
		const tables = await introspectTables(client, schemaName);
		const functions = await introspectFunctions(client, schemaName);

		// Introspect triggers for all tables
		const allTriggers = [];
		for (const table of tables) {
			const triggers = await introspectTriggers(client, schemaName, table.tableName);
			allTriggers.push(...triggers);
		}

		const schemaMetadata: SchemaMetadata = {
			schemaName,
			capturedAt: new Date().toISOString(),
			postgresVersion,
			tables,
			functions,
			triggers: allTriggers
		};

		return schemaMetadata;
	} finally {
		await client.end();
	}
}

/**
 * Gets the PostgreSQL server version.
 *
 * @param client - PostgreSQL client
 * @returns Version string (e.g., "14.5")
 */
async function getPostgresVersion(client: Client): Promise<string> {
	const result = await client.query('SHOW server_version;');
	const fullVersion = result.rows[0].server_version;

	// Extract major.minor version (e.g., "14.5" from "14.5 (Debian 14.5-1.pgdg110+1)")
	const match = fullVersion.match(/^(\d+\.\d+)/);
	return match ? match[1] : fullVersion;
}

/**
 * Captures schema metadata and saves to JSON file.
 *
 * @param dbUrl - Database connection URL
 * @param schemaName - Schema name to introspect
 * @param outputPath - Path to save JSON file
 */
export async function captureSchemaToFile(
	dbUrl: string,
	schemaName: string,
	outputPath: string
): Promise<void> {
	const schema = await captureSchema(dbUrl, schemaName);

	const fs = await import('fs/promises');
	await fs.writeFile(outputPath, JSON.stringify(schema, null, 2), 'utf-8');
}

/**
 * Loads schema metadata from a JSON file.
 *
 * @param filePath - Path to JSON file
 * @returns SchemaMetadata object
 */
export async function loadSchemaFromFile(filePath: string): Promise<SchemaMetadata> {
	const fs = await import('fs/promises');
	const content = await fs.readFile(filePath, 'utf-8');
	return JSON.parse(content) as SchemaMetadata;
}

/**
 * Compares two schema snapshots (live database vs. version control).
 *
 * @param dbUrl - Live database connection URL
 * @param schemaFilePath - Path to version control schema JSON
 * @param schemaName - Schema name to compare
 * @returns Object with source and target schemas for comparison
 */
export async function captureSchemaForComparison(
	dbUrl: string,
	schemaFilePath: string,
	schemaName: string
): Promise<{ source: SchemaMetadata; target: SchemaMetadata }> {
	// Load source schema from version control file
	const source = await loadSchemaFromFile(schemaFilePath);

	// Capture target schema from live database
	const target = await captureSchema(dbUrl, schemaName);

	return { source, target };
}
