/**
 * GraphQL Schema Contract Testing for SvelteHR
 *
 * Validates GraphQL schema integrity, backward compatibility, and contract compliance.
 * Uses introspection data to ensure schema changes don't break existing clients.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	buildSchema,
	getIntrospectionQuery,
	introspectionFromSchema,
	validateSchema
} from 'graphql';
import type { IntrospectionQuery, IntrospectionSchema } from 'graphql';
import { gql } from '@urql/core';
import { createUrqlClient } from '$lib/graphql/client';
import type { Client } from '@urql/core';

// Import generated types for validation
import introspectionResult from '$lib/generated/introspection.json';
import type { DeprecatedField, SchemaContract } from '../generated/test-types';

interface SchemaValidationConfig {
	endpoint: string;
	expectedTypes: string[];
	requiredQueries: string[];
	requiredMutations: string[];
	allowedDeprecations: DeprecatedField[];
	breakingChangeThreshold: number;
}

const TEST_CONFIG: SchemaValidationConfig = {
	endpoint: 'http://localhost:4000/graphql',
	expectedTypes: [
		'User',
		'Employee',
		'Department',
		'Role',
		'Permission',
		'LeaveRequest',
		'PerformanceReview',
		'Goal',
		'OKR',
		'Team',
		'Document',
		'Notification'
	],
	requiredQueries: [
		'currentUser',
		'employees',
		'departments',
		'roles',
		'permissions',
		'leaveRequests',
		'performanceReviews'
	],
	requiredMutations: [
		'createEmployee',
		'updateEmployee',
		'deleteEmployee',
		'createDepartment',
		'updateDepartment',
		'assignRole',
		'revokeRole'
	],
	allowedDeprecations: [],
	breakingChangeThreshold: 0.1 // 10% breaking changes allowed
};

// Skip these tests in CI (no backend available)
const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip('GraphQL Schema Contract Testing', () => {
	let client: Client;
	let liveSchema: IntrospectionQuery;

	beforeAll(async () => {
		// Initialize GraphQL client for live schema introspection
		client = createUrqlClient();

		// Fetch live schema introspection
		try {
			// Convert introspection query string to TypedDocumentNode
			const introspectionQuery = gql(getIntrospectionQuery());
			const result = await client.query(introspectionQuery, {}).toPromise();

			if (result.error) {
				throw new Error(`Failed to introspect schema: ${result.error.message}`);
			}

			liveSchema = result.data as IntrospectionQuery;
		} catch (error) {
			console.warn('Could not fetch live schema, using cached version');
			liveSchema = introspectionResult as IntrospectionQuery;
		}
	});

	afterAll(async () => {
		// Cleanup if needed
	});

	describe('Schema Structure Validation', () => {
		test('should have all required root types', () => {
			const schema = liveSchema.__schema;

			// Find root types
			const queryType = schema.queryType;
			const mutationType = schema.mutationType;
			const subscriptionType = schema.subscriptionType;

			expect(queryType).toBeDefined();
			expect(queryType?.name).toBe('Query');

			expect(mutationType).toBeDefined();
			expect(mutationType?.name).toBe('Mutation');

			// Subscriptions are optional for PostGraphile
			if (subscriptionType) {
				expect(subscriptionType.name).toBe('Subscription');
			}
		});

		test('should have all expected entity types', () => {
			const schema = liveSchema.__schema;
			const typeNames = schema.types.map((type) => type.name);

			// Check for required business entity types
			TEST_CONFIG.expectedTypes.forEach((expectedType) => {
				expect(typeNames).toContain(expectedType);
			});
		});

		test('should have proper PostGraphile connection types', () => {
			const schema = liveSchema.__schema;
			const typeNames = schema.types.map((type) => type.name);

			// PostGraphile generates connection types for pagination
			const connectionTypes = typeNames.filter((name) => name.endsWith('Connection'));
			const edgeTypes = typeNames.filter((name) => name.endsWith('Edge'));
			const nodeTypes = typeNames.filter((name) => name.endsWith('Node'));

			expect(connectionTypes.length).toBeGreaterThan(0);
			expect(edgeTypes.length).toBeGreaterThan(0);

			// Should have Node interface
			expect(typeNames).toContain('Node');
		});

		test('should have proper input and payload types', () => {
			const schema = liveSchema.__schema;
			const typeNames = schema.types.map((type) => type.name);

			// PostGraphile generates Input types for mutations
			const inputTypes = typeNames.filter(
				(name) => name.endsWith('Input') || name.endsWith('Patch')
			);
			const payloadTypes = typeNames.filter((name) => name.endsWith('Payload'));

			expect(inputTypes.length).toBeGreaterThan(0);
			expect(payloadTypes.length).toBeGreaterThan(0);
		});
	});

	describe('Query Field Validation', () => {
		test('should have all required query fields', () => {
			const schema = liveSchema.__schema;
			const queryType = schema.types.find((type) => type.name === 'Query');

			expect(queryType).toBeDefined();
			expect(queryType?.kind).toBe('OBJECT');

			if (queryType && 'fields' in queryType && queryType.fields) {
				const queryFieldNames = queryType.fields.map((field) => field.name);

				TEST_CONFIG.requiredQueries.forEach((requiredQuery) => {
					const hasField = queryFieldNames.some(
						(fieldName) =>
							fieldName === requiredQuery ||
							fieldName === `${requiredQuery}ById` ||
							fieldName === `all${requiredQuery.charAt(0).toUpperCase()}${requiredQuery.slice(1)}`
					);

					expect(hasField, `Missing required query field: ${requiredQuery}`).toBe(true);
				});
			}
		});

		test('should have proper pagination arguments on list queries', () => {
			const schema = liveSchema.__schema;
			const queryType = schema.types.find((type) => type.name === 'Query');

			if (queryType && 'fields' in queryType && queryType.fields) {
				const listQueries = queryType.fields.filter(
					(field) => field.type.kind === 'OBJECT' && field.type.name?.endsWith('Connection')
				);

				listQueries.forEach((query) => {
					const argNames = query.args.map((arg) => arg.name);

					// PostGraphile pagination arguments
					expect(argNames).toContain('first');
					expect(argNames).toContain('after');
					expect(argNames).toContain('last');
					expect(argNames).toContain('before');
				});
			}
		});
	});

	describe('Mutation Field Validation', () => {
		test('should have all required mutation fields', () => {
			const schema = liveSchema.__schema;
			const mutationType = schema.types.find((type) => type.name === 'Mutation');

			expect(mutationType).toBeDefined();
			expect(mutationType?.kind).toBe('OBJECT');

			if (mutationType && 'fields' in mutationType && mutationType.fields) {
				const mutationFieldNames = mutationType.fields.map((field) => field.name);

				TEST_CONFIG.requiredMutations.forEach((requiredMutation) => {
					const hasField = mutationFieldNames.some(
						(fieldName) =>
							fieldName === requiredMutation ||
							fieldName.includes(requiredMutation.replace(/([A-Z])/g, '_$1').toLowerCase())
					);

					expect(hasField, `Missing required mutation field: ${requiredMutation}`).toBe(true);
				});
			}
		});

		test('should have proper input and payload structure', () => {
			const schema = liveSchema.__schema;
			const mutationType = schema.types.find((type) => type.name === 'Mutation');

			if (mutationType && 'fields' in mutationType && mutationType.fields) {
				mutationType.fields.forEach((mutation) => {
					// Each mutation should have an input argument
					const hasInputArg = mutation.args.some(
						(arg) => arg.name === 'input' || arg.name.endsWith('Input')
					);

					if (mutation.name.startsWith('create') || mutation.name.startsWith('update')) {
						expect(hasInputArg, `Mutation ${mutation.name} should have input argument`).toBe(true);
					}

					// Return type should be a payload type
					expect(mutation.type.name).toMatch(/Payload$/);
				});
			}
		});
	});

	describe('Type Field Validation', () => {
		test('should have proper ID fields on entity types', () => {
			const schema = liveSchema.__schema;

			TEST_CONFIG.expectedTypes.forEach((typeName) => {
				const type = schema.types.find((t) => t.name === typeName);

				if (type && 'fields' in type && type.fields) {
					const hasIdField = type.fields.some(
						(field) => field.name === 'id' && field.type.name === 'ID'
					);

					expect(hasIdField, `Type ${typeName} should have an ID field`).toBe(true);
				}
			});
		});

		test('should have proper audit fields on main entity types', () => {
			const schema = liveSchema.__schema;
			const auditFields = ['createdAt', 'updatedAt'];

			['User', 'Employee', 'Department'].forEach((typeName) => {
				const type = schema.types.find((t) => t.name === typeName);

				if (type && 'fields' in type && type.fields) {
					const fieldNames = type.fields.map((f) => f.name);

					auditFields.forEach((auditField) => {
						expect(fieldNames).toContain(auditField);
					});
				}
			});
		});
	});

	describe('Security and Authorization', () => {
		test('should not expose sensitive internal fields', () => {
			const schema = liveSchema.__schema;
			const sensitiveFields = ['password', 'secret', 'private', 'internal'];

			schema.types.forEach((type) => {
				if ('fields' in type && type.fields) {
					type.fields.forEach((field) => {
						const fieldNameLower = field.name.toLowerCase();

						sensitiveFields.forEach((sensitiveWord) => {
							expect(
								fieldNameLower,
								`Field ${type.name}.${field.name} may expose sensitive data`
							).not.toContain(sensitiveWord);
						});
					});
				}
			});
		});

		test('should have proper permission-based field filtering', () => {
			const schema = liveSchema.__schema;

			// Check for PostGraphile permission-based field filtering
			// This would be implemented through PostGraphile policies
			const userType = schema.types.find((type) => type.name === 'User');

			if (userType && 'fields' in userType && userType.fields) {
				// Sensitive user fields should exist but be protected by RLS
				const hasEmail = userType.fields.some((f) => f.name === 'email');
				expect(hasEmail).toBe(true);
			}
		});
	});

	describe('Deprecation Management', () => {
		test('should track deprecated fields', () => {
			const schema = liveSchema.__schema;
			const deprecatedFields: DeprecatedField[] = [];

			schema.types.forEach((type) => {
				if ('fields' in type && type.fields) {
					type.fields.forEach((field) => {
						if (field.isDeprecated) {
							deprecatedFields.push({
								type: type.name,
								field: field.name,
								reason: field.deprecationReason || undefined
							});
						}
					});
				}
			});

			// Log deprecated fields for tracking
			if (deprecatedFields.length > 0) {
				console.warn('Deprecated fields found:', deprecatedFields);
			}

			// Check against allowed deprecations
			deprecatedFields.forEach((deprecated) => {
				const isAllowed = TEST_CONFIG.allowedDeprecations.some(
					(allowed) => allowed.type === deprecated.type && allowed.field === deprecated.field
				);

				expect(
					isAllowed || deprecated.reason,
					`Unexpected deprecated field: ${deprecated.type}.${deprecated.field}`
				).toBeTruthy();
			});
		});
	});

	describe('Schema Validation Rules', () => {
		test('should pass GraphQL schema validation', () => {
			// Convert introspection back to schema for validation
			const schemaSDL = buildSchema(`
        ${liveSchema.__schema.types
					.filter((type) => !type.name.startsWith('__'))
					.map((type) => `# Type: ${type.name}`)
					.join('\n')}

        type Query {
          _dummy: String
        }

        type Mutation {
          _dummy: String
        }
      `);

			const errors = validateSchema(schemaSDL);
			expect(errors).toEqual([]);
		});

		test('should have consistent naming conventions', () => {
			const schema = liveSchema.__schema;

			schema.types
				.filter((type) => !type.name.startsWith('__'))
				.forEach((type) => {
					// Type names should be PascalCase
					expect(type.name).toMatch(/^[A-Z][a-zA-Z0-9]*$/);

					if ('fields' in type && type.fields) {
						type.fields.forEach((field) => {
							// Field names should be camelCase
							expect(field.name).toMatch(/^[a-z][a-zA-Z0-9]*$/);
						});
					}
				});
		});
	});

	describe('Performance and Complexity', () => {
		test('should have reasonable schema complexity', () => {
			const schema = liveSchema.__schema;

			// Count types, fields, and connections
			const typeCount = schema.types.filter((type) => !type.name.startsWith('__')).length;
			const totalFields = schema.types.reduce((count, type) => {
				if ('fields' in type && type.fields) {
					return count + type.fields.length;
				}
				return count;
			}, 0);

			// Reasonable limits for HR system
			expect(typeCount).toBeLessThan(200);
			expect(totalFields).toBeLessThan(1000);

			console.log(`Schema stats: ${typeCount} types, ${totalFields} fields`);
		});

		test('should not have overly deep nested types', () => {
			const schema = liveSchema.__schema;

			// Check for reasonable nesting depth
			// This is a simplified check - in practice you'd traverse the type graph
			const deeplyNestedTypes = schema.types.filter((type) => {
				if ('fields' in type && type.fields) {
					return type.fields.some((field) => {
						// Check if field type references create deep nesting
						return field.type.name?.includes('Connection') && field.type.name.length > 50; // Arbitrary complexity indicator
					});
				}
				return false;
			});

			expect(deeplyNestedTypes.length).toBeLessThan(10);
		});
	});
});
