/**
 * GraphQL Contract Tests: Employee Management Operations
 * 
 * CRITICAL: These tests MUST FAIL initially (TDD RED phase)
 * Tests validate Employee GraphQL schema contracts before implementation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GraphQLClient, type GraphQLResponse, authOperations } from '../../lib/graphql/client';

// Real GraphQL client - will connect to actual GelDB endpoint
const graphqlClient = new GraphQLClient();

// Authentication token for contract tests
let contractTestAuthToken: string;

// Employee Management GraphQL Operations
const EMPLOYEES_QUERY = `
	query Employees(
		$page: Int = 1
		$limit: Int = 20
		$search: String
		$department: ID
		$status: EmployeeStatus
		$sortBy: EmployeeSortField = LAST_NAME
		$sortOrder: SortOrder = ASC
	) {
		employees(
			page: $page
			limit: $limit
			search: $search
			department: $department
			status: $status
			sortBy: $sortBy
			sortOrder: $sortOrder
		) {
			employees {
				id
				employeeId
				user {
					id
					email
					firstName
					lastName
				}
				department {
					id
					name
				}
				position
				status
				hireDate
				createdAt
				updatedAt
			}
			total
			page
			limit
			hasNextPage
			hasPreviousPage
		}
	}
`;

const EMPLOYEE_QUERY = `
	query Employee($id: ID!) {
		employee(id: $id) {
			id
			employeeId
			user {
				id
				email
				firstName
				lastName
				isActive
			}
			department {
				id
				name
				description
			}
			position
			manager {
				id
				employeeId
				user {
					firstName
					lastName
				}
			}
			directReports {
				id
				employeeId
				user {
					firstName
					lastName
				}
				position
			}
			hireDate
			status
			salary
			phone
			address
			createdAt
			updatedAt
		}
	}
`;

const EMPLOYEE_BY_EMPLOYEE_ID_QUERY = `
	query EmployeeByEmployeeId($employeeId: String!) {
		employeeByEmployeeId(employeeId: $employeeId) {
			id
			employeeId
			user {
				id
				email
				firstName
				lastName
			}
			department {
				id
				name
			}
			position
			status
		}
	}
`;

const MY_PROFILE_QUERY = `
	query MyProfile {
		myProfile {
			id
			employeeId
			user {
				id
				email
				firstName
				lastName
			}
			department {
				id
				name
			}
			position
			manager {
				id
				user {
					firstName
					lastName
				}
			}
			hireDate
			status
			phone
			address
		}
	}
`;

const CREATE_EMPLOYEE_MUTATION = `
	mutation CreateEmployee($input: CreateEmployeeInput!) {
		createEmployee(input: $input) {
			id
			employeeId
			user {
				id
				email
				firstName
				lastName
			}
			department {
				id
				name
			}
			position
			hireDate
			status
			createdAt
			updatedAt
		}
	}
`;

const UPDATE_EMPLOYEE_MUTATION = `
	mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
		updateEmployee(id: $id, input: $input) {
			id
			employeeId
			user {
				firstName
				lastName
			}
			department {
				id
				name
			}
			position
			salary
			phone
			address
			updatedAt
		}
	}
`;

const UPDATE_MY_PROFILE_MUTATION = `
	mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
		updateMyProfile(input: $input) {
			id
			employeeId
			phone
			address
			updatedAt
		}
	}
`;

const DEACTIVATE_EMPLOYEE_MUTATION = `
	mutation DeactivateEmployee($id: ID!, $reason: String) {
		deactivateEmployee(id: $id, reason: $reason) {
			id
			employeeId
			status
			updatedAt
		}
	}
`;

const REACTIVATE_EMPLOYEE_MUTATION = `
	mutation ReactivateEmployee($id: ID!) {
		reactivateEmployee(id: $id) {
			id
			employeeId
			status
			updatedAt
		}
	}
`;

// Test data types
interface CreateEmployeeInput {
	email: string;
	firstName: string;
	lastName: string;
	employeeId: string;
	departmentId: string;
	position: string;
	managerId?: string;
	hireDate: string;
	salary?: number;
	phone?: string;
	address?: string;
}

interface UpdateEmployeeInput {
	firstName?: string;
	lastName?: string;
	departmentId?: string;
	position?: string;
	managerId?: string;
	salary?: number;
	phone?: string;
	address?: string;
}

interface UpdateMyProfileInput {
	phone?: string;
	address?: string;
}

describe('GraphQL Contract: Employee Management Operations', () => {
	let createdEmployeeId: string | null = null;
	let testDepartmentId: string = 'dept-123';

	beforeAll(async () => {
		console.log('🚨 Starting GraphQL Employee Contract Tests - Expected to FAIL initially');
		
		// Set up authentication for contract tests
		try {
			const loginResponse = await authOperations.login('admin@mountainhr.com', 'admin123');
			if (loginResponse.data?.login && !loginResponse.errors) {
				contractTestAuthToken = loginResponse.data.login.token;
				console.log('✅ Contract test authentication setup complete');
			} else {
				throw new Error('Contract test login failed');
			}
		} catch (error) {
			console.error('❌ Contract test authentication setup failed:', error);
			throw error;
		}
	});

	afterAll(async () => {
		// Cleanup
		createdEmployeeId = null;
	});

	describe('Employees Query Contract', () => {
		it('should return paginated employee list', async () => {
			// Contract test: employees query must return proper EmployeePage structure
			const variables = {
				page: 1,
				limit: 10,
				sortBy: 'LAST_NAME',
				sortOrder: 'ASC'
			};

			// This MUST FAIL until backend implements GraphQL employees query
			const response = await graphqlClient.authenticatedRequest(EMPLOYEES_QUERY, variables, contractTestAuthToken);

			// Contract expectations for EmployeePage
			expect(response.data).toBeDefined();
			expect(response.data.employees).toBeDefined();
			expect(Array.isArray(response.data.employees.employees)).toBe(true);
			expect(response.data.employees.total).toBeTypeOf('number');
			expect(response.data.employees.page).toBe(1);
			expect(response.data.employees.limit).toBe(10);
			expect(response.data.employees.hasNextPage).toBeTypeOf('boolean');
			expect(response.data.employees.hasPreviousPage).toBeTypeOf('boolean');

			// Validate employee structure if any employees returned
			if (response.data.employees.employees.length > 0) {
				const employee = response.data.employees.employees[0];
				expect(employee.id).toBeTypeOf('string');
				expect(employee.employeeId).toBeTypeOf('string');
				expect(employee.user).toBeDefined();
				expect(employee.user.id).toBeTypeOf('string');
				expect(employee.user.email).toBeTypeOf('string');
				expect(employee.user.firstName).toBeTypeOf('string');
				expect(employee.user.lastName).toBeTypeOf('string');
				expect(employee.department).toBeDefined();
				expect(employee.department.id).toBeTypeOf('string');
				expect(employee.department.name).toBeTypeOf('string');
				expect(employee.position).toBeTypeOf('string');
				expect(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'].includes(employee.status)).toBe(true);
			}
		});

		it('should support filtering by department', async () => {
			const variables = {
				department: testDepartmentId,
				page: 1,
				limit: 10
			};

			// This MUST FAIL until backend implements department filtering
			const response = await graphqlClient.authenticatedRequest(EMPLOYEES_QUERY, variables, contractTestAuthToken);

			expect(response.data).toBeDefined();
			expect(response.data.employees.employees).toBeDefined();

			// All returned employees should be from the specified department
			if (response.data.employees.employees.length > 0) {
				response.data.employees.employees.forEach((employee: any) => {
					expect(employee.department.id).toBe(testDepartmentId);
				});
			}
		});

		it('should support search functionality', async () => {
			const variables = {
				search: 'john',
				page: 1,
				limit: 10
			};

			// This MUST FAIL until backend implements search functionality
			const response = await graphqlClient.authenticatedRequest(EMPLOYEES_QUERY, variables, contractTestAuthToken);

			expect(response.data).toBeDefined();
			expect(response.data.employees).toBeDefined();

			// Results should contain search term in relevant fields
			if (response.data.employees.employees.length > 0) {
				const hasMatchInResults = response.data.employees.employees.some((employee: any) => {
					const searchTerm = 'john'.toLowerCase();
					return (
						employee.user.firstName.toLowerCase().includes(searchTerm) ||
						employee.user.lastName.toLowerCase().includes(searchTerm) ||
						employee.employeeId.toLowerCase().includes(searchTerm)
					);
				});
				expect(hasMatchInResults).toBe(true);
			}
		});

		it('should require authentication', async () => {
			// Contract test: employees query should require @hasPermission
			// This MUST FAIL until backend implements permission checking
			const response = await graphqlClient.request(EMPLOYEES_QUERY, {});

			expect(response.errors).toBeDefined();
			expect(response.errors.length).toBeGreaterThan(0);
			expect(response.errors[0].message).toMatch(/permission|unauthorized|forbidden/i);
		});
	});

	describe('Employee Query Contract', () => {
		it('should return single employee by ID', async () => {
			const employeeId = 'emp-123';

			// This MUST FAIL until backend implements employee query
			const response = await graphqlClient.request(EMPLOYEE_QUERY, {
				id: employeeId
			});

			expect(response.data).toBeDefined();
			expect(response.data.employee).toBeDefined();
			expect(response.data.employee.id).toBe(employeeId);
			expect(response.data.employee.employeeId).toBeTypeOf('string');

			// Validate complete employee structure
			const employee = response.data.employee;
			expect(employee.user).toBeDefined();
			expect(employee.department).toBeDefined();
			expect(employee.position).toBeTypeOf('string');
			expect(employee.hireDate).toBeTypeOf('string');
			expect(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'].includes(employee.status)).toBe(true);

			// Manager should be null or valid Employee
			if (employee.manager) {
				expect(employee.manager.id).toBeTypeOf('string');
				expect(employee.manager.user.firstName).toBeTypeOf('string');
			}

			// Direct reports should be array
			expect(Array.isArray(employee.directReports)).toBe(true);
			
			// Salary should be accessible if user has permission
			if (employee.salary !== null) {
				expect(employee.salary).toBeTypeOf('number');
			}
		});

		it('should return null for non-existent employee', async () => {
			const nonExistentId = 'emp-nonexistent';

			// This MUST FAIL until backend implements proper null handling
			const response = await graphqlClient.request(EMPLOYEE_QUERY, {
				id: nonExistentId
			});

			expect(response.data).toBeDefined();
			expect(response.data.employee).toBeNull();
		});
	});

	describe('Employee By Employee ID Query Contract', () => {
		it('should find employee by employeeId', async () => {
			const employeeId = 'EMP001';

			// This MUST FAIL until backend implements employeeByEmployeeId query
			const response = await graphqlClient.request(EMPLOYEE_BY_EMPLOYEE_ID_QUERY, {
				employeeId
			});

			expect(response.data).toBeDefined();
			expect(response.data.employeeByEmployeeId).toBeDefined();
			expect(response.data.employeeByEmployeeId.employeeId).toBe(employeeId);
			expect(response.data.employeeByEmployeeId.user).toBeDefined();
			expect(response.data.employeeByEmployeeId.department).toBeDefined();
		});
	});

	describe('My Profile Query Contract', () => {
		it('should return current user employee profile', async () => {
			// Contract test: myProfile should return authenticated user's employee data
			// This MUST FAIL until backend implements @auth directive

			const response = await graphqlClient.authenticatedRequest(MY_PROFILE_QUERY, {}, contractTestAuthToken);

			expect(response.data).toBeDefined();
			expect(response.data.myProfile).toBeDefined();

			const profile = response.data.myProfile;
			expect(profile.id).toBeTypeOf('string');
			expect(profile.employeeId).toBeTypeOf('string');
			expect(profile.user).toBeDefined();
			expect(profile.department).toBeDefined();
			expect(profile.position).toBeTypeOf('string');
		});

		it('should require authentication for myProfile', async () => {
			// Contract test: myProfile should fail without authentication
			// This MUST FAIL until backend implements proper auth checking
			const response = await graphqlClient.request(MY_PROFILE_QUERY);

			expect(response.errors).toBeDefined();
			expect(response.errors[0].message).toMatch(/auth|unauthorized|token/i);
		});
	});

	describe('Create Employee Mutation Contract', () => {
		it('should create new employee with valid input', async () => {
			const createInput: CreateEmployeeInput = {
				email: 'newemployee@company.com',
				firstName: 'John',
				lastName: 'Doe',
				employeeId: 'EMP002',
				departmentId: testDepartmentId,
				position: 'Software Engineer',
				hireDate: '2024-01-01',
				salary: 75000,
				phone: '+1-555-0123',
				address: '123 Main St, City, ST 12345'
			};

			// This MUST FAIL until backend implements createEmployee mutation
			const response = await graphqlClient.authenticatedRequest(CREATE_EMPLOYEE_MUTATION, {
				input: createInput
			}, contractTestAuthToken);

			expect(response.data).toBeDefined();
			expect(response.data.createEmployee).toBeDefined();

			const employee = response.data.createEmployee;
			expect(employee.id).toBeTypeOf('string');
			expect(employee.employeeId).toBe(createInput.employeeId);
			expect(employee.user.email).toBe(createInput.email);
			expect(employee.user.firstName).toBe(createInput.firstName);
			expect(employee.user.lastName).toBe(createInput.lastName);
			expect(employee.department.id).toBe(createInput.departmentId);
			expect(employee.position).toBe(createInput.position);
			expect(employee.status).toBe('ACTIVE');

			// Store for cleanup
			createdEmployeeId = employee.id;
		});

		it('should validate required fields', async () => {
			const invalidInput = {
				email: '', // Required
				firstName: '', // Required
				lastName: '', // Required
				employeeId: '', // Required
				departmentId: '', // Required
				position: '', // Required
				hireDate: '' // Required
			};

			// This MUST FAIL until backend implements input validation
			const response = await graphqlClient.request(CREATE_EMPLOYEE_MUTATION, {
				input: invalidInput
			});

			expect(response.errors).toBeDefined();
			expect(response.errors.length).toBeGreaterThan(0);
			expect(response.errors[0].message).toMatch(/validation|required|invalid/i);
		});

		it('should require write permission', async () => {
			const validInput: CreateEmployeeInput = {
				email: 'test@company.com',
				firstName: 'Test',
				lastName: 'User',
				employeeId: 'EMP003',
				departmentId: testDepartmentId,
				position: 'Tester',
				hireDate: '2024-01-01'
			};

			// This MUST FAIL until backend implements @hasPermission directive
			const response = await graphqlClient.request(CREATE_EMPLOYEE_MUTATION, {
				input: validInput
			});

			expect(response.errors).toBeDefined();
			expect(response.errors[0].message).toMatch(/permission|forbidden|unauthorized/i);
		});
	});

	describe('Update Employee Mutation Contract', () => {
		it('should update employee with valid input', async () => {
			const employeeId = 'emp-123';
			const updateInput: UpdateEmployeeInput = {
				firstName: 'UpdatedFirst',
				lastName: 'UpdatedLast',
				position: 'Senior Engineer',
				salary: 85000,
				phone: '+1-555-9999'
			};

			// This MUST FAIL until backend implements updateEmployee mutation
			const response = await graphqlClient.request(UPDATE_EMPLOYEE_MUTATION, {
				id: employeeId,
				input: updateInput
			});

			expect(response.data).toBeDefined();
			expect(response.data.updateEmployee).toBeDefined();

			const employee = response.data.updateEmployee;
			expect(employee.id).toBe(employeeId);
			expect(employee.user.firstName).toBe(updateInput.firstName);
			expect(employee.user.lastName).toBe(updateInput.lastName);
			expect(employee.position).toBe(updateInput.position);
			expect(employee.phone).toBe(updateInput.phone);
		});
	});

	describe('Update My Profile Mutation Contract', () => {
		it('should update own profile with limited fields', async () => {
			const updateInput: UpdateMyProfileInput = {
				phone: '+1-555-1111',
				address: '456 New St, City, ST 54321'
			};

			// This MUST FAIL until backend implements updateMyProfile mutation
			const response = await graphqlClient.request(UPDATE_MY_PROFILE_MUTATION, {
				input: updateInput
			});

			expect(response.data).toBeDefined();
			expect(response.data.updateMyProfile).toBeDefined();

			const profile = response.data.updateMyProfile;
			expect(profile.phone).toBe(updateInput.phone);
			expect(profile.address).toBe(updateInput.address);
		});
	});

	describe('Employee Status Mutations Contract', () => {
		it('should deactivate employee', async () => {
			const employeeId = 'emp-123';
			const reason = 'End of contract';

			// This MUST FAIL until backend implements deactivateEmployee mutation
			const response = await graphqlClient.request(DEACTIVATE_EMPLOYEE_MUTATION, {
				id: employeeId,
				reason
			});

			expect(response.data).toBeDefined();
			expect(response.data.deactivateEmployee).toBeDefined();
			expect(response.data.deactivateEmployee.status).toBe('INACTIVE');
		});

		it('should reactivate employee', async () => {
			const employeeId = 'emp-123';

			// This MUST FAIL until backend implements reactivateEmployee mutation
			const response = await graphqlClient.request(REACTIVATE_EMPLOYEE_MUTATION, {
				id: employeeId
			});

			expect(response.data).toBeDefined();
			expect(response.data.reactivateEmployee).toBeDefined();
			expect(response.data.reactivateEmployee.status).toBe('ACTIVE');
		});
	});

	describe('GraphQL Schema Validation', () => {
		it('should enforce EmployeeStatus enum values', async () => {
			const variables = {
				status: 'INVALID_STATUS', // Should cause validation error
				page: 1,
				limit: 10
			};

			// This MUST FAIL until backend implements proper enum validation
			const response = await graphqlClient.authenticatedRequest(EMPLOYEES_QUERY, variables, contractTestAuthToken);

			expect(response.errors).toBeDefined();
			expect(response.errors[0].message).toMatch(/enum|invalid|validation/i);
		});

		it('should enforce EmployeeSortField enum values', async () => {
			const variables = {
				sortBy: 'INVALID_SORT_FIELD',
				page: 1,
				limit: 10
			};

			// This MUST FAIL until backend implements sort field validation
			const response = await graphqlClient.authenticatedRequest(EMPLOYEES_QUERY, variables, contractTestAuthToken);

			expect(response.errors).toBeDefined();
			expect(response.errors[0].message).toMatch(/enum|invalid|validation/i);
		});

		it('should validate ID format requirements', async () => {
			const invalidId = 'not-a-valid-id-format';

			// This MUST FAIL until backend implements ID validation
			const response = await graphqlClient.request(EMPLOYEE_QUERY, {
				id: invalidId
			});

			expect(response.errors).toBeDefined();
			expect(response.errors[0].message).toMatch(/invalid|id|format/i);
		});
	});
});

// Export for potential integration with other contract tests
export {
	EMPLOYEES_QUERY,
	EMPLOYEE_QUERY,
	CREATE_EMPLOYEE_MUTATION,
	UPDATE_EMPLOYEE_MUTATION,
	type CreateEmployeeInput,
	type UpdateEmployeeInput,
	type UpdateMyProfileInput
};