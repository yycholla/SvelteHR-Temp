/**
 * Data Type Normalization (T020)
 *
 * Normalizes PostgreSQL data types to canonical forms for consistent comparison.
 * Handles type aliases (int4 → integer, varchar → character varying, etc.)
 */

/**
 * Normalization rules from data-model.md:
 * - int4/int → integer
 * - int8/bigint → bigint
 * - int2/smallint → smallint
 * - varchar → character varying
 * - char → character
 * - bool → boolean
 * - timestamp → timestamp without time zone
 * - timestamptz → timestamp with time zone
 */

const TYPE_NORMALIZATION_MAP: Record<string, string> = {
	// Integer types
	int: 'integer',
	int4: 'integer',
	int8: 'bigint',
	bigint: 'bigint',
	int2: 'smallint',
	smallint: 'smallint',

	// Character types
	varchar: 'character varying',
	char: 'character',
	bpchar: 'character', // PostgreSQL internal name for char

	// Boolean
	bool: 'boolean',

	// Timestamp types
	timestamp: 'timestamp without time zone',
	timestamptz: 'timestamp with time zone',

	// Numeric types (no aliases, but included for completeness)
	numeric: 'numeric',
	decimal: 'numeric',

	// Text type (no alias)
	text: 'text',

	// Serial types (auto-increment)
	serial: 'integer',
	serial4: 'integer',
	serial8: 'bigint',
	bigserial: 'bigint',
	smallserial: 'smallint',
	serial2: 'smallint',

	// Real/Float types
	real: 'real',
	float4: 'real',
	float8: 'double precision',
	'double precision': 'double precision',

	// Date/Time types
	date: 'date',
	time: 'time without time zone',
	timetz: 'time with time zone',
	interval: 'interval',

	// JSON types
	json: 'json',
	jsonb: 'jsonb',

	// UUID
	uuid: 'uuid',

	// Bytea (binary)
	bytea: 'bytea',

	// Arrays (handled separately)
	// User-defined types pass through unchanged
};

/**
 * Normalizes a PostgreSQL data type to its canonical form.
 *
 * @param pgType - The PostgreSQL data type string (e.g., "int4", "varchar")
 * @returns The normalized data type (e.g., "integer", "character varying")
 */
export function normalizeDataType(pgType: string): string {
	// Handle null/undefined
	if (!pgType) return pgType;

	// Trim whitespace
	const trimmed = pgType.trim().toLowerCase();

	// Handle array types (e.g., "integer[]", "text[]")
	const arrayMatch = trimmed.match(/^(.+)\[\]$/);
	if (arrayMatch) {
		const baseType = normalizeDataType(arrayMatch[1]);
		return `${baseType}[]`;
	}

	// Handle types with length/precision (e.g., "varchar(255)", "numeric(10,2)")
	const withParamsMatch = trimmed.match(/^([a-z_]+)\(.*\)$/);
	if (withParamsMatch) {
		const baseType = withParamsMatch[1];
		const normalized = TYPE_NORMALIZATION_MAP[baseType] || baseType;
		// Return with original parameters
		return trimmed.replace(baseType, normalized);
	}

	// Direct lookup in normalization map
	return TYPE_NORMALIZATION_MAP[trimmed] || trimmed;
}

/**
 * Normalizes type parameters (length, precision, scale) for comparison.
 *
 * @param dataType - The data type (e.g., "character varying")
 * @param characterMaximumLength - Maximum length for character types
 * @param numericPrecision - Precision for numeric types
 * @param numericScale - Scale for numeric types
 * @returns Normalized type string with parameters
 */
export function normalizeTypeWithParameters(
	dataType: string,
	characterMaximumLength: number | null,
	numericPrecision: number | null,
	numericScale: number | null
): string {
	const normalizedBase = normalizeDataType(dataType);

	// Character types with length
	if (
		(normalizedBase === 'character varying' || normalizedBase === 'character') &&
		characterMaximumLength !== null
	) {
		return `${normalizedBase}(${characterMaximumLength})`;
	}

	// Numeric types with precision/scale
	if (normalizedBase === 'numeric' && numericPrecision !== null) {
		if (numericScale !== null && numericScale > 0) {
			return `${normalizedBase}(${numericPrecision},${numericScale})`;
		}
		return `${normalizedBase}(${numericPrecision})`;
	}

	return normalizedBase;
}

/**
 * Checks if two data types are equivalent after normalization.
 *
 * @param type1 - First data type
 * @param type2 - Second data type
 * @returns True if types are equivalent
 */
export function areTypesEquivalent(type1: string, type2: string): boolean {
	return normalizeDataType(type1) === normalizeDataType(type2);
}

/**
 * Extracts base type from a type with parameters.
 *
 * @param typeWithParams - Type string with parameters (e.g., "varchar(255)")
 * @returns Base type without parameters (e.g., "varchar")
 */
export function extractBaseType(typeWithParams: string): string {
	const match = typeWithParams.match(/^([a-z_\s]+)(?:\(.*\))?(?:\[\])?$/i);
	return match ? match[1].trim() : typeWithParams;
}
