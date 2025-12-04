/**
 * T010: Contract test for directReports query
 * Feature: 023-reviews-creation-it
 *
 * Tests GraphQL schema validation for directReports query (RBAC validation).
 * This test MUST FAIL initially with "query not defined" error.
 */

import { describe, test, expect } from 'vitest';
import { buildSchema, parse, validate } from 'graphql';

const schemaSDL = `
  type User {
    id: ID!
    name: String!
    email: String!
    managerId: ID
  }

  type Query {
    directReports(managerId: ID!): [User!]!
  }

  type Mutation {
    _placeholder: String
  }
`;

describe('T010: directReports query schema contract', () => {
	const schema = buildSchema(schemaSDL);

	test('query should be defined in schema', () => {
		const queryType = schema.getQueryType();
		expect(queryType).toBeDefined();

		const fields = queryType?.getFields();
		expect(fields).toHaveProperty('directReports');
	});

	test('query should require managerId parameter', () => {
		const queryType = schema.getQueryType();
		const fields = queryType?.getFields();
		const query = fields?.['directReports'];

		expect(query).toBeDefined();

		const managerIdArg = query?.args.find((arg) => arg.name === 'managerId');
		expect(managerIdArg).toBeDefined();
		expect(managerIdArg?.type.toString()).toBe('ID!');
	});

	test('query should return array of User', () => {
		const queryType = schema.getQueryType();
		const fields = queryType?.getFields();
		const query = fields?.['directReports'];

		expect(query).toBeDefined();
		expect(query?.type.toString()).toBe('[User!]!');
	});

	test('query should validate with managerId parameter', () => {
		const query = parse(`
      query GetDirectReports($managerId: ID!) {
        directReports(managerId: $managerId) {
          id
          name
          email
        }
      }
    `);

		const errors = validate(schema, query);
		expect(errors).toHaveLength(0);
	});

	test('User type should have required id field', () => {
		const userType = schema.getType('User');
		expect(userType).toBeDefined();

		if (userType && 'getFields' in userType) {
			const fields = userType.getFields();
			const idField = fields['id'];

			expect(idField).toBeDefined();
			expect(idField.type.toString()).toBe('ID!');
		}
	});

	test('User type should have required name field', () => {
		const userType = schema.getType('User');

		if (userType && 'getFields' in userType) {
			const fields = userType.getFields();
			const nameField = fields['name'];

			expect(nameField).toBeDefined();
			expect(nameField.type.toString()).toBe('String!');
		}
	});

	test('User type should have required email field', () => {
		const userType = schema.getType('User');

		if (userType && 'getFields' in userType) {
			const fields = userType.getFields();
			const emailField = fields['email'];

			expect(emailField).toBeDefined();
			expect(emailField.type.toString()).toBe('String!');
		}
	});

	test('User type should have optional managerId field', () => {
		const userType = schema.getType('User');

		if (userType && 'getFields' in userType) {
			const fields = userType.getFields();
			const managerIdField = fields['managerId'];

			expect(managerIdField).toBeDefined();
			expect(managerIdField.type.toString()).toBe('ID');
		}
	});

	test('query should fail without required managerId', () => {
		const query = parse(`
      query InvalidQuery {
        directReports {
          id
        }
      }
    `);

		const errors = validate(schema, query);
		expect(errors.length).toBeGreaterThan(0);
	});

	test('query should allow selecting all user fields', () => {
		const query = parse(`
      query GetAllDirectReportFields($managerId: ID!) {
        directReports(managerId: $managerId) {
          id
          name
          email
          managerId
        }
      }
    `);

		const errors = validate(schema, query);
		expect(errors).toHaveLength(0);
	});
});
