/**
 * Unit tests for operation utility functions
 * Tests field path extraction, field finding, and operation analysis
 */

import { describe, it, expect } from 'vitest';
import {
  extractFieldPaths,
  findFieldByPath,
  getUniqueFieldNames,
  calculateComplexity,
  isMutation,
  isQuery,
  isSubscription,
  formatOperationSignature,
  getRootFieldNames,
  isAliased,
  getEffectiveFieldName,
  usesVariable,
  FragmentRegistry,
} from '../../src/parsers/operation-utils.js';
import type { GraphQLOperation, FieldReference } from '../../src/types/models.js';

describe('Operation Utilities', () => {
  const mockOperation: GraphQLOperation = {
    name: 'GetUser',
    operationType: 'query',
    selections: [
      {
        name: 'user',
        graphqlType: 'User',
        nullable: true,
        isList: false,
        children: [
          {
            name: 'id',
            graphqlType: 'ID',
            nullable: false,
            isList: false,
            children: [],
          },
          {
            name: 'email',
            graphqlType: 'String',
            nullable: false,
            isList: false,
            children: [],
          },
          {
            name: 'profile',
            graphqlType: 'Profile',
            nullable: true,
            isList: false,
            children: [
              {
                name: 'bio',
                graphqlType: 'String',
                nullable: true,
                isList: false,
                children: [],
              },
            ],
          },
        ],
      },
    ],
    variables: [],
    filePath: 'src/routes/users.ts',
    line: 10,
    column: 5,
  };

  describe('extractFieldPaths', () => {
    it('should extract all field paths from operation', () => {
      const paths = extractFieldPaths(mockOperation);

      expect(paths).toContain('user');
      expect(paths).toContain('user.id');
      expect(paths).toContain('user.email');
      expect(paths).toContain('user.profile');
      expect(paths).toContain('user.profile.bio');
    });

    it('should handle operations with no selections', () => {
      const emptyOperation: GraphQLOperation = {
        ...mockOperation,
        selections: [],
      };

      const paths = extractFieldPaths(emptyOperation);
      expect(paths).toHaveLength(0);
    });

    it('should handle deeply nested selections', () => {
      const nestedOperation: GraphQLOperation = {
        ...mockOperation,
        selections: [
          {
            name: 'organization',
            graphqlType: 'Organization',
            nullable: false,
            isList: false,
            children: [
              {
                name: 'teams',
                graphqlType: 'Team',
                nullable: false,
                isList: true,
                children: [
                  {
                    name: 'members',
                    graphqlType: 'User',
                    nullable: false,
                    isList: true,
                    children: [
                      {
                        name: 'email',
                        graphqlType: 'String',
                        nullable: false,
                        isList: false,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const paths = extractFieldPaths(nestedOperation);

      expect(paths).toContain('organization');
      expect(paths).toContain('organization.teams');
      expect(paths).toContain('organization.teams.members');
      expect(paths).toContain('organization.teams.members.email');
    });

    it('should handle list types', () => {
      const listOperation: GraphQLOperation = {
        ...mockOperation,
        selections: [
          {
            name: 'users',
            graphqlType: 'User',
            nullable: false,
            isList: true,
            children: [
              {
                name: 'id',
                graphqlType: 'ID',
                nullable: false,
                isList: false,
                children: [],
              },
            ],
          },
        ],
      };

      const paths = extractFieldPaths(listOperation);

      expect(paths).toContain('users');
      expect(paths).toContain('users.id');
    });
  });

  describe('findFieldByPath', () => {
    it('should find top-level field', () => {
      const field = findFieldByPath(mockOperation, 'user');

      expect(field).toBeDefined();
      expect(field?.name).toBe('user');
    });

    it('should find nested field', () => {
      const field = findFieldByPath(mockOperation, 'user.email');

      expect(field).toBeDefined();
      expect(field?.name).toBe('email');
    });

    it('should find deeply nested field', () => {
      const field = findFieldByPath(mockOperation, 'user.profile.bio');

      expect(field).toBeDefined();
      expect(field?.name).toBe('bio');
    });

    it('should return null for non-existent field', () => {
      const field = findFieldByPath(mockOperation, 'user.nonexistent');

      expect(field).toBeNull();
    });

    it('should return null for invalid path', () => {
      const field = findFieldByPath(mockOperation, 'nonexistent.path');

      expect(field).toBeNull();
    });
  });

  describe('getUniqueFieldNames', () => {
    it('should return all unique field names', () => {
      const names = getUniqueFieldNames(mockOperation);

      expect(names.has('user')).toBe(true);
      expect(names.has('id')).toBe(true);
      expect(names.has('email')).toBe(true);
      expect(names.has('profile')).toBe(true);
      expect(names.has('bio')).toBe(true);
      expect(names.size).toBe(5);
    });

    it('should handle operations with duplicate field names at different levels', () => {
      const operation: GraphQLOperation = {
        ...mockOperation,
        selections: [
          {
            name: 'user',
            graphqlType: 'User',
            nullable: false,
            isList: false,
            children: [
              {
                name: 'id',
                graphqlType: 'ID',
                nullable: false,
                isList: false,
                children: [],
              },
            ],
          },
          {
            name: 'post',
            graphqlType: 'Post',
            nullable: false,
            isList: false,
            children: [
              {
                name: 'id',
                graphqlType: 'ID',
                nullable: false,
                isList: false,
                children: [],
              },
            ],
          },
        ],
      };

      const names = getUniqueFieldNames(operation);

      expect(names.size).toBe(3); // user, post, id
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity for flat operation', () => {
      const flatOperation: GraphQLOperation = {
        ...mockOperation,
        selections: [
          {
            name: 'user',
            graphqlType: 'User',
            nullable: false,
            isList: false,
            children: [],
          },
        ],
      };

      expect(calculateComplexity(flatOperation)).toBe(1);
    });

    it('should calculate complexity for nested operation', () => {
      // user -> profile -> bio (depth 3)
      expect(calculateComplexity(mockOperation)).toBe(3);
    });

    it('should handle deeply nested operations', () => {
      const deepOperation: GraphQLOperation = {
        ...mockOperation,
        selections: [
          {
            name: 'a',
            graphqlType: 'A',
            nullable: false,
            isList: false,
            children: [
              {
                name: 'b',
                graphqlType: 'B',
                nullable: false,
                isList: false,
                children: [
                  {
                    name: 'c',
                    graphqlType: 'C',
                    nullable: false,
                    isList: false,
                    children: [
                      {
                        name: 'd',
                        graphqlType: 'D',
                        nullable: false,
                        isList: false,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(calculateComplexity(deepOperation)).toBe(4);
    });
  });

  describe('Operation Type Checks', () => {
    it('should identify query operations', () => {
      expect(isQuery(mockOperation)).toBe(true);
      expect(isMutation(mockOperation)).toBe(false);
      expect(isSubscription(mockOperation)).toBe(false);
    });

    it('should identify mutation operations', () => {
      const mutationOp: GraphQLOperation = {
        ...mockOperation,
        name: 'CreateUser',
        operationType: 'mutation',
      };

      expect(isMutation(mutationOp)).toBe(true);
      expect(isQuery(mutationOp)).toBe(false);
      expect(isSubscription(mutationOp)).toBe(false);
    });

    it('should identify subscription operations', () => {
      const subscriptionOp: GraphQLOperation = {
        ...mockOperation,
        name: 'OnUserCreated',
        operationType: 'subscription',
      };

      expect(isSubscription(subscriptionOp)).toBe(true);
      expect(isQuery(subscriptionOp)).toBe(false);
      expect(isMutation(subscriptionOp)).toBe(false);
    });
  });

  describe('formatOperationSignature', () => {
    it('should format operation without variables', () => {
      const signature = formatOperationSignature(mockOperation);

      expect(signature).toBe('query GetUser');
    });

    it('should format operation with variables', () => {
      const operationWithVars: GraphQLOperation = {
        ...mockOperation,
        variables: [
          { name: 'id', type: 'ID!', nullable: false },
          { name: 'limit', type: 'Int', nullable: true },
        ],
      };

      const signature = formatOperationSignature(operationWithVars);

      expect(signature).toContain('query GetUser');
      expect(signature).toContain('$id: ID!');
      expect(signature).toContain('$limit: Int');
    });
  });

  describe('getRootFieldNames', () => {
    it('should return only root-level field names', () => {
      const rootNames = getRootFieldNames(mockOperation);

      expect(rootNames).toEqual(['user']);
      expect(rootNames).toHaveLength(1);
    });

    it('should return multiple root field names', () => {
      const multiRootOp: GraphQLOperation = {
        ...mockOperation,
        selections: [
          { name: 'user', graphqlType: 'User', nullable: false, isList: false, children: [] },
          { name: 'posts', graphqlType: 'Post', nullable: false, isList: true, children: [] },
          { name: 'comments', graphqlType: 'Comment', nullable: false, isList: true, children: [] },
        ],
      };

      const rootNames = getRootFieldNames(multiRootOp);

      expect(rootNames).toEqual(['user', 'posts', 'comments']);
      expect(rootNames).toHaveLength(3);
    });
  });

  describe('Field Aliasing', () => {
    it('should detect aliased fields', () => {
      const aliasedField: FieldReference = {
        name: 'email',
        alias: 'emailAddress',
        graphqlType: 'String',
        nullable: false,
        isList: false,
        children: [],
      };

      expect(isAliased(aliasedField)).toBe(true);
    });

    it('should detect non-aliased fields', () => {
      const normalField: FieldReference = {
        name: 'email',
        graphqlType: 'String',
        nullable: false,
        isList: false,
        children: [],
      };

      expect(isAliased(normalField)).toBe(false);
    });

    it('should get effective name for aliased field', () => {
      const aliasedField: FieldReference = {
        name: 'email',
        alias: 'emailAddress',
        graphqlType: 'String',
        nullable: false,
        isList: false,
        children: [],
      };

      expect(getEffectiveFieldName(aliasedField)).toBe('emailAddress');
    });

    it('should get effective name for non-aliased field', () => {
      const normalField: FieldReference = {
        name: 'email',
        graphqlType: 'String',
        nullable: false,
        isList: false,
        children: [],
      };

      expect(getEffectiveFieldName(normalField)).toBe('email');
    });
  });

  describe('usesVariable', () => {
    it('should detect variable usage', () => {
      const operationWithVar: GraphQLOperation = {
        ...mockOperation,
        variables: [{ name: 'userId', type: 'ID!', nullable: false }],
      };

      expect(usesVariable(operationWithVar, 'userId')).toBe(true);
    });

    it('should detect non-usage', () => {
      expect(usesVariable(mockOperation, 'nonExistent')).toBe(false);
    });
  });

  describe('FragmentRegistry', () => {
    it('should create fragment registry', () => {
      const registry = new FragmentRegistry();

      expect(registry).toBeDefined();
    });

    it('should clear fragments', () => {
      const registry = new FragmentRegistry();

      registry.clear();

      expect(registry.getFragment('test')).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle fields with aliases', () => {
      const operationWithAlias: GraphQLOperation = {
        ...mockOperation,
        selections: [
          {
            name: 'user',
            graphqlType: 'User',
            nullable: false,
            isList: false,
            alias: 'currentUser',
            children: [
              {
                name: 'email',
                graphqlType: 'String',
                nullable: false,
                isList: false,
                alias: 'emailAddress',
                children: [],
              },
            ],
          },
        ],
      };

      const paths = extractFieldPaths(operationWithAlias);

      // Should use actual field name, not alias
      expect(paths).toContain('user');
      expect(paths).toContain('user.email');
    });

    it('should handle empty operations', () => {
      const emptyOperation: GraphQLOperation = {
        ...mockOperation,
        selections: [],
      };

      expect(extractFieldPaths(emptyOperation)).toHaveLength(0);
      expect(getRootFieldNames(emptyOperation)).toHaveLength(0);
      expect(calculateComplexity(emptyOperation)).toBe(0);
    });

    it('should handle operations with many selections', () => {
      const manySelections: FieldReference[] = Array.from({ length: 100 }, (_, i) => ({
        name: `field${i}`,
        graphqlType: 'String',
        nullable: false,
        isList: false,
        children: [],
      }));

      const largeOperation: GraphQLOperation = {
        ...mockOperation,
        selections: manySelections,
      };

      const paths = extractFieldPaths(largeOperation);

      expect(paths).toHaveLength(100);
    });
  });
});
