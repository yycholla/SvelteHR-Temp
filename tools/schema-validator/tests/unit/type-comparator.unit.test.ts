/**
 * Unit tests for TypeComparator class
 * Tests type compatibility checking, nullability validation, and type mapping
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypeComparator } from '../../src/validators/type-comparator.js';

describe('TypeComparator', () => {
  let comparator: TypeComparator;

  beforeEach(() => {
    comparator = new TypeComparator();
  });

  describe('areTypesCompatible', () => {
    it('should validate String to text mapping', () => {
      expect(comparator.areTypesCompatible('String', 'text')).toBe(true);
      expect(comparator.areTypesCompatible('String', 'varchar')).toBe(true);
    });

    it('should validate Int to integer mappings', () => {
      expect(comparator.areTypesCompatible('Int', 'int4')).toBe(true);
      expect(comparator.areTypesCompatible('Int', 'int2')).toBe(true);
      expect(comparator.areTypesCompatible('Int', 'integer')).toBe(true);
    });

    it('should validate Float to numeric mappings', () => {
      expect(comparator.areTypesCompatible('Float', 'float4')).toBe(true);
      expect(comparator.areTypesCompatible('Float', 'float8')).toBe(true);
      expect(comparator.areTypesCompatible('Float', 'real')).toBe(true);
    });

    it('should validate Boolean to bool mapping', () => {
      expect(comparator.areTypesCompatible('Boolean', 'bool')).toBe(true);
      expect(comparator.areTypesCompatible('Boolean', 'boolean')).toBe(true);
    });

    it('should validate ID to uuid mapping', () => {
      expect(comparator.areTypesCompatible('ID', 'uuid')).toBe(true);
    });

    it('should validate DateTime to timestamptz mapping', () => {
      expect(comparator.areTypesCompatible('DateTime', 'timestamptz')).toBe(true);
      expect(comparator.areTypesCompatible('DateTime', 'timestamp with time zone')).toBe(true);
    });

    it('should validate JSON to jsonb mapping', () => {
      expect(comparator.areTypesCompatible('JSON', 'jsonb')).toBe(true);
      expect(comparator.areTypesCompatible('JSON', 'json')).toBe(true);
    });

    it('should reject incompatible type pairs', () => {
      expect(comparator.areTypesCompatible('String', 'int4')).toBe(false);
      expect(comparator.areTypesCompatible('Int', 'text')).toBe(false);
      expect(comparator.areTypesCompatible('Boolean', 'uuid')).toBe(false);
    });

    it('should handle array types', () => {
      expect(comparator.areTypesCompatible('[String]', 'text[]')).toBe(true);
      expect(comparator.areTypesCompatible('[Int]', 'int4[]')).toBe(true);
    });

    it('should handle non-null modifiers', () => {
      expect(comparator.areTypesCompatible('String!', 'text')).toBe(true);
      expect(comparator.areTypesCompatible('Int!', 'int4')).toBe(true);
    });
  });

  describe('isNullabilityCompatible', () => {
    it('should allow GraphQL nullable with DB nullable', () => {
      expect(comparator.isNullabilityCompatible(true, true)).toBe(true);
    });

    it('should allow GraphQL nullable with DB non-null', () => {
      expect(comparator.isNullabilityCompatible(true, false)).toBe(true);
    });

    it('should reject GraphQL non-null with DB nullable', () => {
      expect(comparator.isNullabilityCompatible(false, true)).toBe(false);
    });

    it('should allow GraphQL non-null with DB non-null', () => {
      expect(comparator.isNullabilityCompatible(false, false)).toBe(true);
    });
  });

  describe('compareTypes', () => {
    it('should return compatible result for matching types', () => {
      const result = comparator.compareTypes('String', 'text', 'String');

      expect(result.compatible).toBe(true);
      expect(result.graphqlType).toBe('String');
      expect(result.dbType).toBe('text');
      expect(result.apiType).toBe('String');
      expect(result.nullabilityMatches).toBe(true);
      expect(result.listTypesMatch).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return incompatible result for type mismatch', () => {
      const result = comparator.compareTypes('String', 'int4', 'String');

      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('Type mismatch');
      expect(result.reason).toContain('String');
      expect(result.reason).toContain('int4');
    });

    it('should detect list type mismatches', () => {
      const result = comparator.compareTypes('[String]', 'text', '[String]');

      expect(result.compatible).toBe(false);
      expect(result.listTypesMatch).toBe(false);
      expect(result.reason).toContain('List type mismatch');
    });

    it('should detect nullability mismatches', () => {
      const result = comparator.compareTypes('String!', 'text', 'String');

      expect(result.compatible).toBe(false);
      expect(result.nullabilityMatches).toBe(false);
      expect(result.reason).toContain('Nullability mismatch');
    });

    it('should handle array types correctly', () => {
      const result = comparator.compareTypes('[String]', 'text[]', '[String]');

      expect(result.compatible).toBe(true);
      expect(result.listTypesMatch).toBe(true);
    });

    it('should handle non-null array types', () => {
      const result = comparator.compareTypes('[String!]!', 'text[]', '[String!]!');

      expect(result.compatible).toBe(true);
      expect(result.nullabilityMatches).toBe(true);
      expect(result.listTypesMatch).toBe(true);
    });
  });

  describe('isPrecisionCompatible', () => {
    it('should accept Int with int2', () => {
      expect(comparator.isPrecisionCompatible('Int', 'int2')).toBe(true);
    });

    it('should accept Int with int4', () => {
      expect(comparator.isPrecisionCompatible('Int', 'int4')).toBe(true);
    });

    it('should reject Int with int8', () => {
      expect(comparator.isPrecisionCompatible('Int', 'int8')).toBe(false);
    });

    it('should accept Float with float4', () => {
      expect(comparator.isPrecisionCompatible('Float', 'float4')).toBe(true);
    });

    it('should accept Float with float8', () => {
      expect(comparator.isPrecisionCompatible('Float', 'float8')).toBe(true);
    });

    it('should return true for non-numeric types', () => {
      expect(comparator.isPrecisionCompatible('String', 'text')).toBe(true);
      expect(comparator.isPrecisionCompatible('Boolean', 'bool')).toBe(true);
    });
  });

  describe('suggestFix', () => {
    it('should suggest GraphQL type change for int4', () => {
      const suggestion = comparator.suggestFix('String', 'int4');

      expect(suggestion).toContain('Int');
      expect(suggestion).toContain('int4');
    });

    it('should suggest GraphQL type change for text', () => {
      const suggestion = comparator.suggestFix('Int', 'text');

      expect(suggestion).toContain('String');
      expect(suggestion).toContain('text');
    });

    it('should suggest GraphQL type change for bool', () => {
      const suggestion = comparator.suggestFix('String', 'bool');

      expect(suggestion).toContain('Boolean');
      expect(suggestion).toContain('bool');
    });

    it('should provide fallback message for unknown types', () => {
      const suggestion = comparator.suggestFix('String', 'unknown_type');

      expect(suggestion).toContain('unknown_type');
      expect(suggestion).toContain('custom mapping');
    });
  });

  describe('requiresCustomScalar', () => {
    it('should identify DateTime as custom scalar', () => {
      expect(comparator.requiresCustomScalar('DateTime')).toBe(true);
    });

    it('should identify Date as custom scalar', () => {
      expect(comparator.requiresCustomScalar('Date')).toBe(true);
    });

    it('should identify JSON as custom scalar', () => {
      expect(comparator.requiresCustomScalar('JSON')).toBe(true);
    });

    it('should identify UUID as custom scalar', () => {
      expect(comparator.requiresCustomScalar('UUID')).toBe(true);
    });

    it('should not identify standard scalars as custom', () => {
      expect(comparator.requiresCustomScalar('String')).toBe(false);
      expect(comparator.requiresCustomScalar('Int')).toBe(false);
      expect(comparator.requiresCustomScalar('Float')).toBe(false);
      expect(comparator.requiresCustomScalar('Boolean')).toBe(false);
      expect(comparator.requiresCustomScalar('ID')).toBe(false);
    });
  });

  describe('getTypeMapping', () => {
    it('should return mapping description for String/text', () => {
      const mapping = comparator.getTypeMapping('String', 'text');

      expect(mapping).toContain('String');
      expect(mapping).toContain('text');
      expect(mapping).toContain('GraphQL');
      expect(mapping).toContain('PostgreSQL');
    });

    it('should return mapping description for Int/int4', () => {
      const mapping = comparator.getTypeMapping('Int', 'int4');

      expect(mapping).toContain('Int');
      expect(mapping).toContain('int4');
    });

    it('should handle unknown mappings', () => {
      const mapping = comparator.getTypeMapping('CustomType', 'custom_db_type');

      expect(mapping).toContain('CustomType');
      expect(mapping).toContain('custom_db_type');
      expect(mapping).toContain('No standard mapping found');
    });
  });

  describe('validateEnumValues', () => {
    it('should validate matching enum values', () => {
      const result = comparator.validateEnumValues(
        ['ACTIVE', 'INACTIVE', 'PENDING'],
        ['ACTIVE', 'INACTIVE', 'PENDING']
      );

      expect(result.valid).toBe(true);
      expect(result.missingInDb).toHaveLength(0);
      expect(result.extraInDb).toHaveLength(0);
      expect(result.missingInApi).toHaveLength(0);
      expect(result.extraInApi).toHaveLength(0);
    });

    it('should detect values missing in database', () => {
      const result = comparator.validateEnumValues(
        ['ACTIVE', 'INACTIVE'],
        ['ACTIVE', 'INACTIVE', 'PENDING']
      );

      expect(result.valid).toBe(false);
      expect(result.missingInDb).toContain('PENDING');
      expect(result.extraInApi).toContain('PENDING');
    });

    it('should detect extra values in database', () => {
      const result = comparator.validateEnumValues(
        ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
        ['ACTIVE', 'INACTIVE']
      );

      expect(result.valid).toBe(false);
      expect(result.extraInDb).toContain('ARCHIVED');
      expect(result.missingInApi).toContain('ARCHIVED');
    });

    it('should handle empty enums', () => {
      const result = comparator.validateEnumValues([], []);

      expect(result.valid).toBe(true);
      expect(result.missingInDb).toHaveLength(0);
      expect(result.extraInDb).toHaveLength(0);
    });
  });

  describe('Custom Mappings', () => {
    it('should allow adding custom type mappings', () => {
      comparator.addCustomMapping('custom_db_type', 'CustomGraphQLType');

      expect(comparator.areTypesCompatible('CustomGraphQLType', 'custom_db_type')).toBe(true);
    });

    it('should override default mappings with custom ones', () => {
      comparator.addCustomMapping('text', 'CustomString');

      expect(comparator.areTypesCompatible('CustomString', 'text')).toBe(true);
      expect(comparator.areTypesCompatible('String', 'text')).toBe(false);
    });

    it('should clear custom mappings', () => {
      comparator.addCustomMapping('custom_type', 'CustomType');
      expect(comparator.areTypesCompatible('CustomType', 'custom_type')).toBe(true);

      comparator.clearCustomMappings();
      expect(comparator.areTypesCompatible('CustomType', 'custom_type')).toBe(false);
    });

    it('should accept custom mappings in constructor', () => {
      const customMappings = new Map([['special_type', 'SpecialGraphQL']]);

      const customComparator = new TypeComparator({ customMappings });

      expect(customComparator.areTypesCompatible('SpecialGraphQL', 'special_type')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle case sensitivity in type names', () => {
      expect(comparator.areTypesCompatible('String', 'TEXT')).toBe(true);
      expect(comparator.areTypesCompatible('Int', 'INT4')).toBe(true);
    });

    it('should handle whitespace in type names', () => {
      expect(comparator.areTypesCompatible('String', 'timestamp with time zone')).toBe(false);
      expect(comparator.areTypesCompatible('DateTime', 'timestamp with time zone')).toBe(true);
    });

    it('should handle complex array types', () => {
      const result = comparator.compareTypes('[String!]', 'text[]', '[String!]');
      expect(result.compatible).toBe(true);
    });

    it('should handle nested non-null modifiers', () => {
      const result = comparator.compareTypes('[String]!', 'text[]', '[String]!');
      expect(result.compatible).toBe(true);
      expect(result.nullabilityMatches).toBe(true);
    });
  });
});
