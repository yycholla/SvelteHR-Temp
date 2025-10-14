/**
 * Type Comparator - Validates type compatibility between GraphQL, PostgreSQL, and Rust
 */
import type { TypeComparisonResult } from '../types/results.js';
/**
 * Type mapping configuration
 */
export interface TypeMappingConfig {
    /** Custom type mappings (overrides defaults) */
    customMappings?: Map<string, string>;
    /** Strict mode (fail on any mismatch) */
    strict?: boolean;
}
/**
 * Type Comparator class
 * Handles type compatibility checking between schema layers
 */
export declare class TypeComparator {
    private customMappings;
    private _strict;
    constructor(config?: TypeMappingConfig);
    /**
     * Check if GraphQL type and database type are compatible
     */
    areTypesCompatible(graphqlType: string, dbType: string): boolean;
    /**
     * Check if nullability is compatible
     */
    isNullabilityCompatible(graphqlNullable: boolean, dbNullable: boolean): boolean;
    /**
     * Compare types and return detailed result
     */
    compareTypes(graphqlType: string, dbType: string, apiType: string): TypeComparisonResult;
    /**
     * Get human-readable type mapping explanation
     */
    getTypeMapping(graphqlType: string, dbType: string): string;
    /**
     * Validate enum values between database and API
     */
    validateEnumValues(dbValues: string[], apiValues: string[]): {
        valid: boolean;
        missingInDb: string[];
        extraInDb: string[];
        missingInApi: string[];
        extraInApi: string[];
    };
    /**
     * Check if precision is compatible (for numeric types)
     */
    isPrecisionCompatible(graphqlType: string, dbType: string): boolean;
    /**
     * Suggest fix for type mismatch
     */
    suggestFix(graphqlType: string, dbType: string): string;
    /**
     * Check if type requires custom scalar definition
     */
    requiresCustomScalar(graphqlType: string): boolean;
    /**
     * Add custom type mapping
     */
    addCustomMapping(pgType: string, graphqlType: string): void;
    /**
     * Clear all custom mappings
     */
    clearCustomMappings(): void;
}
//# sourceMappingURL=type-comparator.d.ts.map