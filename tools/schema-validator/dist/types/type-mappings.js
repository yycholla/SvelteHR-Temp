/**
 * Type mapping configuration between PostgreSQL, GraphQL, and Rust types
 * Based on data-model.md type mapping table
 */
/**
 * Complete type mapping table
 */
export const TYPE_MAPPINGS = [
    // String types
    {
        graphql: 'String',
        postgresql: ['text', 'varchar', 'char', 'character varying'],
        rust: 'String',
        strictCompatibility: true,
    },
    {
        graphql: 'String',
        postgresql: ['uuid'],
        rust: 'Uuid',
        strictCompatibility: true,
        notes: 'UUID strings are valid GraphQL strings',
    },
    // Integer types
    {
        graphql: 'Int',
        postgresql: ['int4', 'integer', 'int2', 'smallint'],
        rust: 'i32',
        strictCompatibility: true,
    },
    {
        graphql: 'Int',
        postgresql: ['int8', 'bigint'],
        rust: 'i64',
        strictCompatibility: false,
        notes: 'BigInt may overflow GraphQL Int (32-bit)',
    },
    // Float types
    {
        graphql: 'Float',
        postgresql: ['float4', 'real', 'float8', 'double precision'],
        rust: 'f64',
        strictCompatibility: true,
    },
    {
        graphql: 'Float',
        postgresql: ['numeric', 'decimal'],
        rust: 'BigDecimal',
        strictCompatibility: false,
        notes: 'Precision loss possible with high-precision decimals',
    },
    // Boolean types
    {
        graphql: 'Boolean',
        postgresql: ['bool', 'boolean'],
        rust: 'bool',
        strictCompatibility: true,
    },
    // DateTime types
    {
        graphql: 'DateTime',
        postgresql: ['timestamp', 'timestamptz', 'timestamp with time zone'],
        rust: 'DateTime<Utc>',
        strictCompatibility: true,
        notes: 'Requires DateTime scalar in GraphQL schema',
    },
    {
        graphql: 'Date',
        postgresql: ['date'],
        rust: 'NaiveDate',
        strictCompatibility: true,
        notes: 'Requires Date scalar in GraphQL schema',
    },
    {
        graphql: 'Time',
        postgresql: ['time', 'timetz', 'time with time zone'],
        rust: 'NaiveTime',
        strictCompatibility: true,
        notes: 'Requires Time scalar in GraphQL schema',
    },
    // JSON types
    {
        graphql: 'JSON',
        postgresql: ['json', 'jsonb'],
        rust: 'serde_json::Value',
        strictCompatibility: true,
        notes: 'Requires JSON scalar in GraphQL schema',
    },
    // Array types (handled specially)
    {
        graphql: '[String]',
        postgresql: ['text[]', 'varchar[]'],
        rust: 'Vec<String>',
        strictCompatibility: true,
    },
    {
        graphql: '[Int]',
        postgresql: ['int4[]', 'integer[]'],
        rust: 'Vec<i32>',
        strictCompatibility: true,
    },
    // ID type (special case)
    {
        graphql: 'ID',
        postgresql: ['uuid', 'int4', 'int8', 'text', 'bigint'],
        rust: 'ID',
        strictCompatibility: true,
        notes: 'ID can be String or Int in GraphQL',
    },
];
/**
 * PostgreSQL to GraphQL type mapping
 */
export const PG_TO_GRAPHQL = {
    // String types
    text: 'String',
    varchar: 'String',
    char: 'String',
    'character varying': 'String',
    uuid: 'String',
    // Integer types
    int2: 'Int',
    int4: 'Int',
    int8: 'Int',
    smallint: 'Int',
    integer: 'Int',
    bigint: 'Int',
    // Float types
    float4: 'Float',
    float8: 'Float',
    real: 'Float',
    'double precision': 'Float',
    numeric: 'Float',
    decimal: 'Float',
    // Boolean
    bool: 'Boolean',
    boolean: 'Boolean',
    // DateTime types
    timestamp: 'DateTime',
    timestamptz: 'DateTime',
    'timestamp with time zone': 'DateTime',
    date: 'Date',
    time: 'Time',
    timetz: 'Time',
    'time with time zone': 'Time',
    // JSON types
    json: 'JSON',
    jsonb: 'JSON',
    // Array types (special handling needed)
    'text[]': '[String]',
    'varchar[]': '[String]',
    'int4[]': '[Int]',
    'integer[]': '[Int]',
    'uuid[]': '[String]',
};
/**
 * GraphQL to Rust type mapping
 */
export const GRAPHQL_TO_RUST = {
    String: 'String',
    Int: 'i32',
    Float: 'f64',
    Boolean: 'bool',
    ID: 'ID',
    DateTime: 'DateTime<Utc>',
    Date: 'NaiveDate',
    Time: 'NaiveTime',
    JSON: 'serde_json::Value',
};
/**
 * Check if two types are compatible
 */
export function areTypesCompatible(graphqlType, pgType) {
    // Check if both are array types
    const graphqlIsArray = isListType(graphqlType);
    const pgIsArray = pgType.includes('[]');
    // If array status doesn't match, incompatible
    if (graphqlIsArray !== pgIsArray) {
        return false;
    }
    // Normalize types (remove array markers since we already checked they match)
    const normalizedGraphQL = normalizeGraphQLType(graphqlType);
    // For PostgreSQL arrays, remove [] for comparison since we know both are arrays
    const normalizedPg = normalizePgType(pgIsArray ? pgType.replace('[]', '') : pgType);
    // Find mapping
    const mapping = TYPE_MAPPINGS.find((m) => m.graphql === normalizedGraphQL &&
        m.postgresql.some((pg) => normalizePgType(pg.replace('[]', '')) === normalizedPg));
    return mapping !== undefined && mapping.strictCompatibility;
}
/**
 * Get suggested GraphQL type for PostgreSQL type
 */
export function suggestGraphQLType(pgType) {
    const normalized = normalizePgType(pgType);
    return PG_TO_GRAPHQL[normalized] ?? null;
}
/**
 * Get suggested Rust type for GraphQL type
 */
export function suggestRustType(graphqlType) {
    const normalized = normalizeGraphQLType(graphqlType);
    return GRAPHQL_TO_RUST[normalized] ?? null;
}
/**
 * Normalize GraphQL type (remove ! and [])
 */
export function normalizeGraphQLType(type) {
    return type.replace(/[!\[\]]/g, '').trim();
}
/**
 * Normalize PostgreSQL type
 */
export function normalizePgType(type) {
    return type.toLowerCase().trim();
}
/**
 * Check if type is a list type
 */
export function isListType(graphqlType) {
    return graphqlType.includes('[') && graphqlType.includes(']');
}
/**
 * Check if type is nullable
 */
export function isNullableType(graphqlType) {
    return !graphqlType.endsWith('!');
}
/**
 * Extract base type from GraphQL type string
 * Example: "[User!]!" -> "User"
 */
export function extractBaseType(graphqlType) {
    return normalizeGraphQLType(graphqlType);
}
/**
 * Get compatibility notes for a type mapping
 */
export function getCompatibilityNotes(graphqlType, pgType) {
    const normalizedGraphQL = normalizeGraphQLType(graphqlType);
    const normalizedPg = normalizePgType(pgType);
    const mapping = TYPE_MAPPINGS.find((m) => m.graphql === normalizedGraphQL &&
        m.postgresql.some((pg) => normalizePgType(pg) === normalizedPg));
    return mapping?.notes ?? null;
}
//# sourceMappingURL=type-mappings.js.map