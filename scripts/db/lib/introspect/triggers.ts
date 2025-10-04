/**
 * Trigger Introspection (T019 - Part 2)
 *
 * Queries pg_catalog for trigger and function metadata.
 */

import type { Client } from 'pg';
import type {
	TriggerDefinition,
	TriggerTiming,
	TriggerEvent,
	TriggerLevel,
	FunctionDefinition,
	FunctionLanguage,
	FunctionArgument,
	FunctionArgMode
} from '../../types/functions';

/**
 * Introspects all triggers for a specific table.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns Array of TriggerDefinition objects
 */
export async function introspectTriggers(
	client: Client,
	schemaName: string,
	tableName: string
): Promise<TriggerDefinition[]> {
	const query = `
		SELECT
			t.tgname as trigger_name,
			c.relname as table_name,
			CASE
				WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
				WHEN t.tgtype & 64 = 64 THEN 'INSTEAD OF'
				ELSE 'AFTER'
			END as timing,
			CASE
				WHEN t.tgtype & 4 = 4 THEN 'INSERT'
				WHEN t.tgtype & 8 = 8 THEN 'DELETE'
				WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
				WHEN t.tgtype & 32 = 32 THEN 'TRUNCATE'
			END as event,
			CASE t.tgtype & 1
				WHEN 1 THEN 'ROW'
				ELSE 'STATEMENT'
			END as level,
			p.proname as function_name,
			pg_get_triggerdef(t.oid) as trigger_definition,
			t.tgqual as when_condition
		FROM pg_catalog.pg_trigger t
		JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
		JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
		JOIN pg_catalog.pg_proc p ON t.tgfoid = p.oid
		WHERE n.nspname = $1
			AND c.relname = $2
			AND NOT t.tgisinternal
		ORDER BY t.tgname;
	`;

	const result = await client.query(query, [schemaName, tableName]);

	return result.rows.map((row) => ({
		triggerName: row.trigger_name,
		tableName: row.table_name,
		timing: row.timing as TriggerTiming,
		events: [row.event as TriggerEvent], // Single event per query row
		level: row.level as TriggerLevel,
		whenCondition: row.when_condition,
		functionName: row.function_name,
		triggerDefinition: row.trigger_definition
	}));
}

/**
 * Introspects all user-defined functions in the schema.
 *
 * @param client - PostgreSQL client
 * @param schemaName - Schema name
 * @returns Array of FunctionDefinition objects
 */
export async function introspectFunctions(
	client: Client,
	schemaName: string
): Promise<FunctionDefinition[]> {
	const query = `
		SELECT
			p.proname as function_name,
			n.nspname as function_schema,
			pg_catalog.pg_get_function_result(p.oid) as return_type,
			l.lanname as language,
			pg_catalog.pg_get_functiondef(p.oid) as function_definition,
			p.proargnames as arg_names,
			p.proargtypes::regtype[] as arg_types,
			p.proargmodes as arg_modes,
			p.proargdefaults as arg_defaults
		FROM pg_catalog.pg_proc p
		JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
		JOIN pg_catalog.pg_language l ON p.prolang = l.oid
		WHERE n.nspname = $1
			AND NOT p.proisagg  -- Exclude aggregate functions
		ORDER BY p.proname;
	`;

	const result = await client.query(query, [schemaName]);

	return result.rows.map((row) => {
		const language = normalizeFunctionLanguage(row.language);
		const args = parseFunctionArguments(
			row.arg_names || [],
			row.arg_types || [],
			row.arg_modes || [],
			row.arg_defaults
		);

		return {
			functionName: row.function_name,
			functionSchema: row.function_schema,
			returnType: row.return_type,
			language,
			functionDefinition: row.function_definition,
			arguments: args
		};
	});
}

/**
 * Normalizes PostgreSQL language names to FunctionLanguage enum.
 *
 * @param lanname - Language name from pg_language
 * @returns Normalized FunctionLanguage
 */
function normalizeFunctionLanguage(lanname: string): FunctionLanguage {
	const normalized = lanname.toLowerCase();
	switch (normalized) {
		case 'plpgsql':
			return 'plpgsql';
		case 'sql':
			return 'sql';
		case 'c':
			return 'c';
		case 'internal':
			return 'internal';
		default:
			return 'plpgsql'; // Default fallback
	}
}

/**
 * Parses function arguments from PostgreSQL catalog data.
 *
 * @param argNames - Array of argument names
 * @param argTypes - Array of argument types
 * @param argModes - Array of argument modes (IN, OUT, INOUT, VARIADIC)
 * @param argDefaults - Argument defaults (unused for now)
 * @returns Array of FunctionArgument objects
 */
function parseFunctionArguments(
	argNames: string[],
	argTypes: string[],
	argModes: string[],
	argDefaults: any
): FunctionArgument[] {
	const args: FunctionArgument[] = [];

	for (let i = 0; i < argTypes.length; i++) {
		const argName = argNames && argNames[i] ? argNames[i] : null;
		const argType = argTypes[i];
		const argMode = (argModes && argModes[i] ? argModes[i] : 'IN') as FunctionArgMode;

		args.push({
			argName,
			argType,
			argMode,
			defaultValue: null // TODO: Parse argDefaults if needed
		});
	}

	return args;
}
