/**
 * Unit tests for field alignment utilities
 * Tests alignment status computation, error message generation, and suggestion generation
 */

import { describe, it, expect } from 'vitest';
import {
  alignField,
  computeAlignmentStatus,
  generateErrorMessage,
  generateSuggestion,
  isComputedField,
  getRequiredAction,
} from '../../src/validators/field-aligner.js';
import { AlignmentStatus } from '../../src/types/enums.js';
import { TypeComparator } from '../../src/validators/type-comparator.js';
import type { FieldReference, DatabaseColumn, ApiField } from '../../src/types/models.js';

describe('Field Aligner Utilities', () => {
  const typeComparator = new TypeComparator();

  const mockGraphQLField: FieldReference = {
    name: 'email',
    graphqlType: 'String!',
    nullable: false,
    isList: false,
    children: [],
  };

  const mockDbColumn: DatabaseColumn = {
    tableName: 'users',
    columnName: 'email',
    pgType: 'text',
    graphqlType: 'String',
    nullable: false,
    isArray: false,
    isPrimaryKey: false,
  };

  const mockApiField: ApiField = {
    parentType: 'User',
    fieldName: 'email',
    graphqlType: 'String!',
    nullable: false,
    isList: false,
    args: [],
  };

  describe('computeAlignmentStatus', () => {
    it('should return Aligned when all layers match', () => {
      const status = computeAlignmentStatus(
        mockGraphQLField,
        mockDbColumn,
        mockApiField,
        typeComparator
      );

      expect(status).toBe(AlignmentStatus.Aligned);
    });

    it('should return MissingDb when database column is missing', () => {
      const status = computeAlignmentStatus(
        mockGraphQLField,
        undefined,
        mockApiField,
        typeComparator
      );

      expect(status).toBe(AlignmentStatus.MissingDb);
    });

    it('should return MissingApi when API field is missing', () => {
      const status = computeAlignmentStatus(
        mockGraphQLField,
        mockDbColumn,
        undefined,
        typeComparator
      );

      expect(status).toBe(AlignmentStatus.MissingApi);
    });

    it('should return TypeMismatch when types are incompatible', () => {
      const incompatibleDbColumn: DatabaseColumn = {
        ...mockDbColumn,
        pgType: 'int4',
        graphqlType: 'Int',
      };

      const status = computeAlignmentStatus(
        mockGraphQLField,
        incompatibleDbColumn,
        mockApiField,
        typeComparator
      );

      expect(status).toBe(AlignmentStatus.TypeMismatch);
    });

    it('should return Aligned when GraphQL is nullable and DB is non-null', () => {
      const nullableGraphQLField: FieldReference = {
        ...mockGraphQLField,
        nullable: true,
        graphqlType: 'String',
      };

      const nonNullDbColumn: DatabaseColumn = {
        ...mockDbColumn,
        nullable: false,
      };

      const nullableApiField: ApiField = {
        ...mockApiField,
        nullable: true,
        graphqlType: 'String',
      };

      const status = computeAlignmentStatus(
        nullableGraphQLField,
        nonNullDbColumn,
        nullableApiField,
        typeComparator
      );

      // GraphQL nullable with DB non-null is compatible (DB guarantees non-null)
      expect(status).toBe(AlignmentStatus.Aligned);
    });

    it('should detect nullability mismatch when GraphQL requires non-null but DB allows null', () => {
      const nonNullGraphQLField: FieldReference = {
        ...mockGraphQLField,
        nullable: false,
      };

      const nullableDbColumn: DatabaseColumn = {
        ...mockDbColumn,
        nullable: true,
      };

      const status = computeAlignmentStatus(
        nonNullGraphQLField,
        nullableDbColumn,
        mockApiField,
        typeComparator
      );

      expect(status).toBe(AlignmentStatus.NullabilityMismatch);
    });
  });

  describe('generateErrorMessage', () => {
    it('should return undefined for Aligned status', () => {
      const message = generateErrorMessage(
        AlignmentStatus.Aligned,
        'users.email',
        mockGraphQLField,
        mockDbColumn,
        mockApiField
      );

      expect(message).toBeUndefined();
    });

    it('should generate error for MissingDb', () => {
      const message = generateErrorMessage(
        AlignmentStatus.MissingDb,
        'users.email',
        mockGraphQLField,
        undefined,
        mockApiField
      );

      expect(message).toContain('users.email');
      expect(message).toContain('queried in GraphQL');
      expect(message).toContain('does not exist in the database');
    });

    it('should generate error for MissingApi', () => {
      const message = generateErrorMessage(
        AlignmentStatus.MissingApi,
        'users.email',
        mockGraphQLField,
        mockDbColumn,
        undefined
      );

      expect(message).toContain('users.email');
      expect(message).toContain('exists in database');
      expect(message).toContain('not exposed by the API');
    });

    it('should generate error for TypeMismatch', () => {
      const message = generateErrorMessage(
        AlignmentStatus.TypeMismatch,
        'users.age',
        { ...mockGraphQLField, graphqlType: 'String' },
        { ...mockDbColumn, pgType: 'int4' },
        { ...mockApiField, graphqlType: 'Int' }
      );

      expect(message).toContain('Type mismatch');
      expect(message).toContain('users.age');
      expect(message).toContain('String');
      expect(message).toContain('int4');
      expect(message).toContain('Int');
    });

    it('should generate error for NullabilityMismatch', () => {
      const message = generateErrorMessage(
        AlignmentStatus.NullabilityMismatch,
        'users.email',
        { ...mockGraphQLField, nullable: false },
        { ...mockDbColumn, nullable: true },
        { ...mockApiField, nullable: false }
      );

      expect(message).toContain('Nullability mismatch');
      expect(message).toContain('users.email');
      expect(message).toContain('non-null');
      expect(message).toContain('nullable');
    });
  });

  describe('generateSuggestion', () => {
    it('should return undefined for Aligned status', () => {
      const suggestion = generateSuggestion(
        AlignmentStatus.Aligned,
        'users.email',
        mockGraphQLField,
        mockDbColumn,
        mockApiField,
        typeComparator
      );

      expect(suggestion).toBeUndefined();
    });

    it('should generate SQL migration for MissingDb', () => {
      const suggestion = generateSuggestion(
        AlignmentStatus.MissingDb,
        'users.email',
        mockGraphQLField,
        undefined,
        mockApiField,
        typeComparator
      );

      expect(suggestion).toContain('ALTER TABLE');
      expect(suggestion).toContain('users');
      expect(suggestion).toContain('ADD COLUMN');
      expect(suggestion).toContain('email');
      expect(suggestion).toContain('NOT NULL');
    });

    it('should generate SQL migration for nullable field', () => {
      const nullableField: FieldReference = {
        ...mockGraphQLField,
        nullable: true,
        graphqlType: 'String',
      };

      const suggestion = generateSuggestion(
        AlignmentStatus.MissingDb,
        'users.bio',
        nullableField,
        undefined,
        mockApiField,
        typeComparator
      );

      expect(suggestion).toContain('ALTER TABLE');
      expect(suggestion).not.toContain('NOT NULL');
    });

    it('should generate Rust resolver suggestion for MissingApi', () => {
      const suggestion = generateSuggestion(
        AlignmentStatus.MissingApi,
        'users.email',
        mockGraphQLField,
        mockDbColumn,
        undefined,
        typeComparator
      );

      expect(suggestion).toContain('Rust');
      expect(suggestion).toContain('email');
      expect(suggestion).toContain('#[graphql');
    });

    it('should generate type fix suggestion for TypeMismatch', () => {
      const suggestion = generateSuggestion(
        AlignmentStatus.TypeMismatch,
        'users.age',
        { ...mockGraphQLField, graphqlType: 'String' },
        { ...mockDbColumn, pgType: 'int4' },
        mockApiField,
        typeComparator
      );

      expect(suggestion).toContain('String');
      expect(suggestion).toContain('Int');
      expect(suggestion).toContain('int4');
    });

    it('should generate nullability fix suggestion', () => {
      const suggestion = generateSuggestion(
        AlignmentStatus.NullabilityMismatch,
        'users.email',
        { ...mockGraphQLField, nullable: false },
        { ...mockDbColumn, nullable: true },
        mockApiField,
        typeComparator
      );

      expect(suggestion).toContain('NULL');
      expect(suggestion).toContain('GraphQL');
    });
  });

  describe('alignField', () => {
    it('should return complete FieldAlignment object', () => {
      const alignment = alignField(
        mockGraphQLField,
        mockDbColumn,
        mockApiField,
        'users.email',
        'src/routes/users.ts',
        10,
        5,
        typeComparator
      );

      expect(alignment.fieldPath).toBe('users.email');
      expect(alignment.graphqlField).toBe(mockGraphQLField);
      expect(alignment.dbColumn).toBe(mockDbColumn);
      expect(alignment.apiField).toBe(mockApiField);
      expect(alignment.status).toBe(AlignmentStatus.Aligned);
      expect(alignment.sourceLocation.file).toBe('src/routes/users.ts');
      expect(alignment.sourceLocation.line).toBe(10);
      expect(alignment.sourceLocation.column).toBe(5);
    });

    it('should include error message for misalignments', () => {
      const alignment = alignField(
        mockGraphQLField,
        undefined,
        mockApiField,
        'users.email',
        'src/routes/users.ts',
        10,
        5,
        typeComparator
      );

      expect(alignment.status).toBe(AlignmentStatus.MissingDb);
      expect(alignment.error).toBeDefined();
      expect(alignment.error).toContain('database');
    });

    it('should include suggestion for misalignments', () => {
      const alignment = alignField(
        mockGraphQLField,
        undefined,
        mockApiField,
        'users.email',
        'src/routes/users.ts',
        10,
        5,
        typeComparator
      );

      expect(alignment.suggestion).toBeDefined();
      expect(alignment.suggestion).toContain('ALTER TABLE');
    });
  });

  describe('isComputedField', () => {
    it('should identify computed fields', () => {
      const computedFields = ['User.fullName', 'Order.total'];

      expect(isComputedField('User.fullName', computedFields)).toBe(true);
      expect(isComputedField('Order.total', computedFields)).toBe(true);
    });

    it('should identify non-computed fields', () => {
      const computedFields = ['User.fullName', 'Order.total'];

      expect(isComputedField('User.email', computedFields)).toBe(false);
      expect(isComputedField('Order.id', computedFields)).toBe(false);
    });

    it('should handle empty computed fields list', () => {
      expect(isComputedField('User.email', [])).toBe(false);
    });
  });

  describe('getRequiredAction', () => {
    it('should return appropriate action for each status', () => {
      expect(getRequiredAction(AlignmentStatus.Aligned)).toBe('No action required');
      expect(getRequiredAction(AlignmentStatus.MissingDb)).toBe('Add database column');
      expect(getRequiredAction(AlignmentStatus.MissingApi)).toBe('Add API resolver');
      expect(getRequiredAction(AlignmentStatus.TypeMismatch)).toBe('Fix type mismatch');
      expect(getRequiredAction(AlignmentStatus.NullabilityMismatch)).toBe('Fix nullability mismatch');
    });
  });

  describe('Type Mapping Suggestions', () => {
    it('should suggest correct PostgreSQL type for GraphQL Int', () => {
      const intField: FieldReference = {
        name: 'age',
        graphqlType: 'Int!',
        nullable: false,
        isList: false,
        children: [],
      };

      const suggestion = generateSuggestion(
        AlignmentStatus.MissingDb,
        'users.age',
        intField,
        undefined,
        mockApiField,
        typeComparator
      );

      expect(suggestion).toContain('int4');
    });

    it('should suggest correct PostgreSQL type for GraphQL Boolean', () => {
      const boolField: FieldReference = {
        name: 'isActive',
        graphqlType: 'Boolean!',
        nullable: false,
        isList: false,
        children: [],
      };

      const suggestion = generateSuggestion(
        AlignmentStatus.MissingDb,
        'users.isActive',
        boolField,
        undefined,
        mockApiField,
        typeComparator
      );

      expect(suggestion).toContain('bool');
    });

    it('should suggest correct PostgreSQL type for GraphQL ID', () => {
      const idField: FieldReference = {
        name: 'id',
        graphqlType: 'ID!',
        nullable: false,
        isList: false,
        children: [],
      };

      const suggestion = generateSuggestion(
        AlignmentStatus.MissingDb,
        'users.id',
        idField,
        undefined,
        mockApiField,
        typeComparator
      );

      expect(suggestion).toContain('uuid');
    });

    it('should handle array types in suggestions', () => {
      const arrayField: FieldReference = {
        name: 'tags',
        graphqlType: '[String!]!',
        nullable: false,
        isList: true,
        children: [],
      };

      const suggestion = generateSuggestion(
        AlignmentStatus.MissingDb,
        'posts.tags',
        arrayField,
        undefined,
        mockApiField,
        typeComparator
      );

      expect(suggestion).toContain('[]');
      expect(suggestion).toContain('text[]');
    });
  });
});
