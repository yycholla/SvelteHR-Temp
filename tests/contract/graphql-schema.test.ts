/**
 * GraphQL Schema Contract Tests
 * 
 * Validates that the GraphQL schema contract matches the server implementation.
 * These tests ensure that the migration from REST to GraphQL maintains API parity.
 * 
 * CRITICAL: These tests MUST FAIL initially (TDD requirement)
 * The tests will pass once the GraphQL server implementation matches the contract.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createServerClient } from '$lib/graphql/client-factory';
import type { GraphQLResponse } from '$lib/graphql/types';

/**
 * Test configuration
 */
const TEST_CONFIG = {
	endpoint: 'http://localhost:5173/api/graphql',
	testToken: 'mock-admin-token-12345', // Admin token for full schema access
	timeout: 10000
};

/**
 * GraphQL client for contract testing
 */
let graphqlClient: ReturnType<typeof createServerClient>;

beforeAll(() => {
	graphqlClient = createServerClient(TEST_CONFIG.testToken, {
		endpoint: TEST_CONFIG.endpoint,
		timeout: TEST_CONFIG.timeout
	});
});

describe('GraphQL Schema Contract - Core Structure', () => {
	
	it('should have Query root type', async () => {
		const query = `
			query GetSchemaQueryType {
				__schema {
					queryType {
						name
						fields {
							name
							type {
								name
								kind
							}
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		
		expect(response.data?.__schema?.queryType?.name).toBe('Query');
		expect(response.data?.__schema?.queryType?.fields?.length).toBeGreaterThan(0);
		
		// Verify required query fields exist
		const fieldNames = response.data?.__schema?.queryType?.fields?.map((f: any) => f.name) || [];
		expect(fieldNames).toContain('me');
		expect(fieldNames).toContain('employees');
		expect(fieldNames).toContain('departments');
		expect(fieldNames).toContain('dashboardData');
	});

	it('should have Mutation root type', async () => {
		const query = `
			query GetSchemaMutationType {
				__schema {
					mutationType {
						name
						fields {
							name
							type {
								name
								kind
							}
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		
		expect(response.data?.__schema?.mutationType?.name).toBe('Mutation');
		expect(response.data?.__schema?.mutationType?.fields?.length).toBeGreaterThan(0);
		
		// Verify required mutation fields exist
		const fieldNames = response.data?.__schema?.mutationType?.fields?.map((f: any) => f.name) || [];
		expect(fieldNames).toContain('login');
		expect(fieldNames).toContain('createEmployee');
		expect(fieldNames).toContain('updateEmployee');
		expect(fieldNames).toContain('createDepartment');
	});

	it('should have Subscription root type', async () => {
		const query = `
			query GetSchemaSubscriptionType {
				__schema {
					subscriptionType {
						name
						fields {
							name
							type {
								name
								kind
							}
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		
		expect(response.data?.__schema?.subscriptionType?.name).toBe('Subscription');
		expect(response.data?.__schema?.subscriptionType?.fields?.length).toBeGreaterThan(0);
		
		// Verify required subscription fields exist
		const fieldNames = response.data?.__schema?.subscriptionType?.fields?.map((f: any) => f.name) || [];
		expect(fieldNames).toContain('employeeUpdates');
		expect(fieldNames).toContain('dashboardUpdates');
		expect(fieldNames).toContain('notifications');
	});
});

describe('GraphQL Schema Contract - Core Types', () => {

	it('should have Employee type with required fields', async () => {
		const query = `
			query GetEmployeeType {
				__type(name: "Employee") {
					name
					kind
					fields {
						name
						type {
							name
							kind
							ofType {
								name
								kind
							}
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const employeeType = response.data?.__type;
		
		expect(employeeType?.name).toBe('Employee');
		expect(employeeType?.kind).toBe('OBJECT');
		
		const fieldNames = employeeType?.fields?.map((f: any) => f.name) || [];
		
		// Required Employee fields from contract
		expect(fieldNames).toContain('id');
		expect(fieldNames).toContain('employee_id');
		expect(fieldNames).toContain('first_name');
		expect(fieldNames).toContain('last_name');
		expect(fieldNames).toContain('full_name');
		expect(fieldNames).toContain('email');
		expect(fieldNames).toContain('position');
		expect(fieldNames).toContain('department');
		expect(fieldNames).toContain('status');
		expect(fieldNames).toContain('hire_date');
	});

	it('should have Department type with required fields', async () => {
		const query = `
			query GetDepartmentType {
				__type(name: "Department") {
					name
					kind
					fields {
						name
						type {
							name
							kind
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const departmentType = response.data?.__type;
		
		expect(departmentType?.name).toBe('Department');
		expect(departmentType?.kind).toBe('OBJECT');
		
		const fieldNames = departmentType?.fields?.map((f: any) => f.name) || [];
		
		// Required Department fields from contract
		expect(fieldNames).toContain('id');
		expect(fieldNames).toContain('name');
		expect(fieldNames).toContain('budget_code');
		expect(fieldNames).toContain('manager');
		expect(fieldNames).toContain('employees');
		expect(fieldNames).toContain('employee_count');
		expect(fieldNames).toContain('is_active');
	});

	it('should have User type with required fields', async () => {
		const query = `
			query GetUserType {
				__type(name: "User") {
					name
					kind
					fields {
						name
						type {
							name
							kind
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const userType = response.data?.__type;
		
		expect(userType?.name).toBe('User');
		expect(userType?.kind).toBe('OBJECT');
		
		const fieldNames = userType?.fields?.map((f: any) => f.name) || [];
		
		// Required User fields from contract
		expect(fieldNames).toContain('id');
		expect(fieldNames).toContain('email');
		expect(fieldNames).toContain('name');
		expect(fieldNames).toContain('roles');
		expect(fieldNames).toContain('permissions');
		expect(fieldNames).toContain('created_at');
		expect(fieldNames).toContain('updated_at');
	});
});

describe('GraphQL Schema Contract - Enum Types', () => {

	it('should have EmployeeStatus enum with required values', async () => {
		const query = `
			query GetEmployeeStatusEnum {
				__type(name: "EmployeeStatus") {
					name
					kind
					enumValues {
						name
						description
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const enumType = response.data?.__type;
		
		expect(enumType?.name).toBe('EmployeeStatus');
		expect(enumType?.kind).toBe('ENUM');
		
		const enumValues = enumType?.enumValues?.map((v: any) => v.name) || [];
		
		// Required EmployeeStatus values from contract
		expect(enumValues).toContain('ACTIVE');
		expect(enumValues).toContain('INACTIVE');
		expect(enumValues).toContain('TERMINATED');
		expect(enumValues).toContain('ON_LEAVE');
	});

	it('should have EmploymentType enum with required values', async () => {
		const query = `
			query GetEmploymentTypeEnum {
				__type(name: "EmploymentType") {
					name
					kind
					enumValues {
						name
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const enumType = response.data?.__type;
		
		expect(enumType?.name).toBe('EmploymentType');
		expect(enumType?.kind).toBe('ENUM');
		
		const enumValues = enumType?.enumValues?.map((v: any) => v.name) || [];
		
		// Required EmploymentType values from contract
		expect(enumValues).toContain('FULL_TIME');
		expect(enumValues).toContain('PART_TIME');
		expect(enumValues).toContain('CONTRACT');
		expect(enumValues).toContain('INTERN');
	});

	it('should have WidgetType enum with required values', async () => {
		const query = `
			query GetWidgetTypeEnum {
				__type(name: "WidgetType") {
					name
					kind
					enumValues {
						name
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const enumType = response.data?.__type;
		
		expect(enumType?.name).toBe('WidgetType');
		expect(enumType?.kind).toBe('ENUM');
		
		const enumValues = enumType?.enumValues?.map((v: any) => v.name) || [];
		
		// Required WidgetType values from contract
		expect(enumValues).toContain('EMPLOYEE_COUNT');
		expect(enumValues).toContain('DEPARTMENT_STATS');
		expect(enumValues).toContain('PERFORMANCE_METRICS');
		expect(enumValues).toContain('COMPLIANCE_STATUS');
		expect(enumValues).toContain('NOTIFICATIONS');
	});
});

describe('GraphQL Schema Contract - Input Types', () => {

	it('should have CreateEmployeeInput with required fields', async () => {
		const query = `
			query GetCreateEmployeeInput {
				__type(name: "CreateEmployeeInput") {
					name
					kind
					inputFields {
						name
						type {
							name
							kind
							ofType {
								name
								kind
							}
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const inputType = response.data?.__type;
		
		expect(inputType?.name).toBe('CreateEmployeeInput');
		expect(inputType?.kind).toBe('INPUT_OBJECT');
		
		const fieldNames = inputType?.inputFields?.map((f: any) => f.name) || [];
		
		// Required CreateEmployeeInput fields from contract
		expect(fieldNames).toContain('first_name');
		expect(fieldNames).toContain('last_name');
		expect(fieldNames).toContain('email');
		expect(fieldNames).toContain('position');
		expect(fieldNames).toContain('department_id');
		expect(fieldNames).toContain('hire_date');
		expect(fieldNames).toContain('employment_type');
	});

	it('should have UpdateEmployeeInput with required fields', async () => {
		const query = `
			query GetUpdateEmployeeInput {
				__type(name: "UpdateEmployeeInput") {
					name
					kind
					inputFields {
						name
						type {
							name
							kind
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const inputType = response.data?.__type;
		
		expect(inputType?.name).toBe('UpdateEmployeeInput');
		expect(inputType?.kind).toBe('INPUT_OBJECT');
		
		const fieldNames = inputType?.inputFields?.map((f: any) => f.name) || [];
		
		// Required UpdateEmployeeInput fields from contract  
		expect(fieldNames).toContain('first_name');
		expect(fieldNames).toContain('last_name');
		expect(fieldNames).toContain('email');
		expect(fieldNames).toContain('position');
		expect(fieldNames).toContain('department_id');
		expect(fieldNames).toContain('status');
	});
});

describe('GraphQL Schema Contract - Scalar Types', () => {

	it('should have custom scalar types defined', async () => {
		const query = `
			query GetScalarTypes {
				__schema {
					types {
						name
						kind
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const types = response.data?.__schema?.types || [];
		const typeNames = types.map((t: any) => t.name);
		
		// Required custom scalar types from contract
		expect(typeNames).toContain('Date');
		expect(typeNames).toContain('DateTime'); 
		expect(typeNames).toContain('JSON');
	});
});

describe('GraphQL Schema Contract - Connection Types', () => {

	it('should have EmployeeConnection type for pagination', async () => {
		const query = `
			query GetEmployeeConnection {
				__type(name: "EmployeeConnection") {
					name
					kind
					fields {
						name
						type {
							name
							kind
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const connectionType = response.data?.__type;
		
		expect(connectionType?.name).toBe('EmployeeConnection');
		expect(connectionType?.kind).toBe('OBJECT');
		
		const fieldNames = connectionType?.fields?.map((f: any) => f.name) || [];
		
		// Required connection fields from GraphQL Cursor Connections Specification
		expect(fieldNames).toContain('nodes');
		expect(fieldNames).toContain('edges');
		expect(fieldNames).toContain('total_count');
		expect(fieldNames).toContain('page_info');
	});

	it('should have PageInfo type for cursor pagination', async () => {
		const query = `
			query GetPageInfo {
				__type(name: "PageInfo") {
					name
					kind
					fields {
						name
						type {
							name
							kind
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const pageInfoType = response.data?.__type;
		
		expect(pageInfoType?.name).toBe('PageInfo');
		expect(pageInfoType?.kind).toBe('OBJECT');
		
		const fieldNames = pageInfoType?.fields?.map((f: any) => f.name) || [];
		
		// Required PageInfo fields from GraphQL Cursor Connections Specification
		expect(fieldNames).toContain('has_next_page');
		expect(fieldNames).toContain('has_previous_page');
		expect(fieldNames).toContain('start_cursor');
		expect(fieldNames).toContain('end_cursor');
	});
});

describe('GraphQL Schema Contract - Response Types', () => {

	it('should have AuthResponse type', async () => {
		const query = `
			query GetAuthResponse {
				__type(name: "AuthResponse") {
					name
					kind
					fields {
						name
						type {
							name
							kind
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const authResponseType = response.data?.__type;
		
		expect(authResponseType?.name).toBe('AuthResponse');
		expect(authResponseType?.kind).toBe('OBJECT');
		
		const fieldNames = authResponseType?.fields?.map((f: any) => f.name) || [];
		
		// Required AuthResponse fields from contract
		expect(fieldNames).toContain('user');
		expect(fieldNames).toContain('authenticated');
		expect(fieldNames).toContain('permissions');
		expect(fieldNames).toContain('roles');
		expect(fieldNames).toContain('session');
	});

	it('should have LoginResponse type', async () => {
		const query = `
			query GetLoginResponse {
				__type(name: "LoginResponse") {
					name
					kind
					fields {
						name
						type {
							name
							kind
						}
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const loginResponseType = response.data?.__type;
		
		expect(loginResponseType?.name).toBe('LoginResponse');
		expect(loginResponseType?.kind).toBe('OBJECT');
		
		const fieldNames = loginResponseType?.fields?.map((f: any) => f.name) || [];
		
		// Required LoginResponse fields from contract
		expect(fieldNames).toContain('success');
		expect(fieldNames).toContain('user');
		expect(fieldNames).toContain('token');
		expect(fieldNames).toContain('expires_at');
		expect(fieldNames).toContain('session_id');
	});
});

/**
 * Schema validation summary test
 * This test provides an overview of schema completeness
 */
describe('GraphQL Schema Contract - Validation Summary', () => {
	
	it('should have complete schema matching contract specification', async () => {
		const query = `
			query GetCompleteSchema {
				__schema {
					queryType { name }
					mutationType { name }
					subscriptionType { name }
					types {
						name
						kind
					}
				}
			}
		`;

		const response = await graphqlClient.query<any>(query);
		const schema = response.data?.__schema;
		
		// Schema structure validation
		expect(schema?.queryType?.name).toBe('Query');
		expect(schema?.mutationType?.name).toBe('Mutation');
		expect(schema?.subscriptionType?.name).toBe('Subscription');
		
		// Type count validation (should have substantial schema)
		const types = schema?.types || [];
		const customTypes = types.filter((t: any) => 
			!t.name.startsWith('__') && // Exclude introspection types
			t.kind === 'OBJECT'
		);
		
		expect(customTypes.length).toBeGreaterThan(15); // Minimum expected types
		
		// Log schema summary for debugging
		console.log(`Schema validation summary:
		  - Query root: ✓
		  - Mutation root: ✓  
		  - Subscription root: ✓
		  - Custom object types: ${customTypes.length}
		  - Total types: ${types.length}
		`);
	});
});