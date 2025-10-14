/**
 * Type mapping configuration between PostgreSQL, GraphQL, and Rust types
 * Based on data-model.md type mapping table
 */
/**
 * Type mapping entry
 */
export interface TypeMapping {
    /** GraphQL type */
    graphql: string;
    /** PostgreSQL type(s) */
    postgresql: string[];
    /** Rust type (async-graphql) */
    rust: string;
    /** Whether types are strictly compatible */
    strictCompatibility: boolean;
    /** Notes about compatibility */
    notes?: string;
}
/**
 * Complete type mapping table
 */
export declare const TYPE_MAPPINGS: TypeMapping[];
/**
 * PostgreSQL to GraphQL type mapping
 */
export declare const PG_TO_GRAPHQL: Record<string, string>;
/**
 * GraphQL to Rust type mapping
 */
export declare const GRAPHQL_TO_RUST: Record<string, string>;
/**
 * Check if two types are compatible
 */
export declare function areTypesCompatible(graphqlType: string, pgType: string): boolean;
/**
 * Get suggested GraphQL type for PostgreSQL type
 */
export declare function suggestGraphQLType(pgType: string): string | null;
/**
 * Get suggested Rust type for GraphQL type
 */
export declare function suggestRustType(graphqlType: string): string | null;
/**
 * Normalize GraphQL type (remove ! and [])
 */
export declare function normalizeGraphQLType(type: string): string;
/**
 * Normalize PostgreSQL type
 */
export declare function normalizePgType(type: string): string;
/**
 * Check if type is a list type
 */
export declare function isListType(graphqlType: string): boolean;
/**
 * Check if type is nullable
 */
export declare function isNullableType(graphqlType: string): boolean;
/**
 * Extract base type from GraphQL type string
 * Example: "[User!]!" -> "User"
 */
export declare function extractBaseType(graphqlType: string): string;
/**
 * Get compatibility notes for a type mapping
 */
export declare function getCompatibilityNotes(graphqlType: string, pgType: string): string | null;
//# sourceMappingURL=type-mappings.d.ts.map