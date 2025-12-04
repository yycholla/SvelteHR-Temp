/**
 * Type Comparator - Validates type compatibility between GraphQL, PostgreSQL, and Rust
 */

import type { TypeComparisonResult } from '../types/results.js';
import {
  areTypesCompatible as checkCompatibility,
  suggestGraphQLType,
  getCompatibilityNotes,
  normalizeGraphQLType,
  normalizePgType,
  isListType,
  isNullableType,
  extractBaseType,
  TYPE_MAPPINGS,
} from '../types/type-mappings.js';

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
export class TypeComparator {
  private customMappings: Map<string, string>;
  // @ts-expect-error - Reserved for future strict mode validation
  private _strict: boolean;

  constructor(config: TypeMappingConfig = {}) {
    this.customMappings = config.customMappings ?? new Map();
    this._strict = config.strict ?? false;
  }

  /**
   * Check if GraphQL type and database type are compatible
   */
  areTypesCompatible(graphqlType: string, dbType: string): boolean {
    // Check custom mappings first
    const normalizedPg = normalizePgType(dbType);
    if (this.customMappings.has(normalizedPg)) {
      const expectedGraphQL = this.customMappings.get(normalizedPg);
      return normalizeGraphQLType(graphqlType) === normalizeGraphQLType(expectedGraphQL!);
    }

    // Use default compatibility check
    return checkCompatibility(graphqlType, dbType);
  }

  /**
   * Check if nullability is compatible
   */
  isNullabilityCompatible(graphqlNullable: boolean, dbNullable: boolean): boolean {
    // GraphQL non-null (!!) must match DB non-null
    if (!graphqlNullable && dbNullable) {
      // GraphQL requires non-null but DB allows null - INCOMPATIBLE
      return false;
    }

    // GraphQL nullable can match either DB nullable or non-null
    // This is safe because GraphQL will just return null if DB value is null
    return true;
  }

  /**
   * Compare types and return detailed result
   */
  compareTypes(graphqlType: string, dbType: string, apiType: string): TypeComparisonResult {
    const baseGraphQL = extractBaseType(graphqlType);
    const basePg = normalizePgType(dbType);
    // @ts-expect-error - Reserved for future API type validation
    const _baseApi = extractBaseType(apiType);

    // Check if list types match (check this FIRST before type compatibility)
    const graphqlIsList = isListType(graphqlType);
    const pgIsList = dbType.includes('[]');
    const apiIsList = isListType(apiType);
    const listTypesMatch = graphqlIsList === pgIsList && graphqlIsList === apiIsList;

    // Check type compatibility
    const typesCompatible = this.areTypesCompatible(graphqlType, dbType);

    // Check nullability
    const graphqlNullable = isNullableType(graphqlType);
    const apiNullable = isNullableType(apiType);
    const nullabilityMatches = graphqlNullable === apiNullable;

    // Determine compatibility and reason
    let compatible = typesCompatible && listTypesMatch && nullabilityMatches;
    let reason: string | undefined;

    // Check list type mismatch FIRST (most specific error)
    if (!listTypesMatch) {
      reason = `List type mismatch: GraphQL ${graphqlIsList ? 'expects list' : 'is scalar'} but database ${
        pgIsList ? 'is array' : 'is scalar'
      }`;
    } else if (!typesCompatible) {
      const suggestion = suggestGraphQLType(dbType);
      reason = `Type mismatch: GraphQL type '${baseGraphQL}' is not compatible with PostgreSQL type '${basePg}'. ${
        suggestion ? `Suggested GraphQL type: '${suggestion}'` : ''
      }`;

      const notes = getCompatibilityNotes(baseGraphQL, basePg);
      if (notes) {
        reason += ` (${notes})`;
      }
    } else if (!nullabilityMatches) {
      reason = `Nullability mismatch: GraphQL field is ${
        graphqlNullable ? 'nullable' : 'non-null'
      } but API field is ${apiNullable ? 'nullable' : 'non-null'}`;
    }

    return {
      compatible,
      graphqlType,
      dbType,
      apiType,
      ...(reason ? { reason } : {}),
      nullabilityMatches,
      listTypesMatch,
    };
  }

  /**
   * Get human-readable type mapping explanation
   */
  getTypeMapping(graphqlType: string, dbType: string): string {
    const baseGraphQL = extractBaseType(graphqlType);
    const basePg = normalizePgType(dbType);

    const mapping = TYPE_MAPPINGS.find(
      (m) => m.graphql === baseGraphQL && m.postgresql.some((pg) => normalizePgType(pg) === basePg)
    );

    if (mapping) {
      return `${graphqlType} (GraphQL) ↔ ${dbType} (PostgreSQL) ↔ ${mapping.rust} (Rust)${
        mapping.notes ? ` - ${mapping.notes}` : ''
      }`;
    }

    return `${graphqlType} (GraphQL) ↔ ${dbType} (PostgreSQL) - No standard mapping found`;
  }

  /**
   * Validate enum values between database and API
   */
  validateEnumValues(
    dbValues: string[],
    apiValues: string[]
  ): {
    valid: boolean;
    missingInDb: string[];
    extraInDb: string[];
    missingInApi: string[];
    extraInApi: string[];
  } {
    const dbSet = new Set(dbValues);
    const apiSet = new Set(apiValues);

    const missingInDb = apiValues.filter((v) => !dbSet.has(v));
    const extraInDb = dbValues.filter((v) => !apiSet.has(v));
    const missingInApi = dbValues.filter((v) => !apiSet.has(v));
    const extraInApi = apiValues.filter((v) => !dbSet.has(v));

    const valid =
      missingInDb.length === 0 &&
      extraInDb.length === 0 &&
      missingInApi.length === 0 &&
      extraInApi.length === 0;

    return {
      valid,
      missingInDb,
      extraInDb,
      missingInApi,
      extraInApi,
    };
  }

  /**
   * Check if precision is compatible (for numeric types)
   */
  isPrecisionCompatible(graphqlType: string, dbType: string): boolean {
    const baseGraphQL = extractBaseType(graphqlType);
    const basePg = normalizePgType(dbType);

    // Int can safely represent int2, int4
    if (baseGraphQL === 'Int') {
      return ['int2', 'int4', 'smallint', 'integer'].includes(basePg);
    }

    // Float can represent float4, float8
    if (baseGraphQL === 'Float') {
      return ['float4', 'float8', 'real', 'double precision'].includes(basePg);
    }

    // For other types, no precision concerns
    return true;
  }

  /**
   * Suggest fix for type mismatch
   */
  suggestFix(graphqlType: string, dbType: string): string {
    const suggested = suggestGraphQLType(dbType);

    if (suggested) {
      return `Change GraphQL type from '${extractBaseType(graphqlType)}' to '${suggested}' to match database type '${dbType}'`;
    }

    return `Review type mapping for PostgreSQL type '${dbType}'. Consider adding custom mapping.`;
  }

  /**
   * Check if type requires custom scalar definition
   */
  requiresCustomScalar(graphqlType: string): boolean {
    const baseType = extractBaseType(graphqlType);
    const customScalars = ['DateTime', 'Date', 'Time', 'JSON', 'UUID', 'BigInt'];
    return customScalars.includes(baseType);
  }

  /**
   * Add custom type mapping
   */
  addCustomMapping(pgType: string, graphqlType: string): void {
    this.customMappings.set(normalizePgType(pgType), graphqlType);
  }

  /**
   * Clear all custom mappings
   */
  clearCustomMappings(): void {
    this.customMappings.clear();
  }
}
