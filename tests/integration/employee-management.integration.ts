// Employee Management Integration Tests
// Tests complete workflows for employee CRUD operations
// Created: 2025-09-24

import { describe, expect, test } from 'vitest';
import {
	TestEmployee,
	TestEmployeeData,
	TestUser,
	cleanupTestData,
	createTestContext
} from '../utils/test-helpers';
import { performGraphQLMutation, performGraphQLQuery } from '../utils/graphql-test-client';

interface TestContext {
	departments: any[];
	users: any[];
	createdEmployees: TestEmployeeData[];
	authTokens: Record<string, string>;
	cleanup?: () => Promise<void>;
}

describe('Employee Management Integration Tests', () => {
	let testContext: TestContext;

	beforeAll(async () => {
		testContext = await createTestContext();
	});

	afterAll(async () => {
		await cleanupTestData(testContext);
	});

	describe('Employee Creation Workflow', () => {
		test('should create employee with complete workflow', async () => {
			// Arrange: HR Manager user
			const hrManager = await TestUser.createManager();

			const newEmployeeData = {
				firstName: 'Jane',
				lastName: 'Smith',
				email: 'jane.smith@company.com',
				role: 'EMPLOYEE',
				departmentId: testContext.departments.engineering.id,
				hireDate: '2024-09-24T08:00:00Z',
				managerId: testContext.users.manager.id
			};

			// Act: Create employee via GraphQL mutation
			const createEmployeeMutation = `
        mutation CreateEmployee($input: CreateEmployeeInput!) {
          createEmployee(input: $input) {
            id
            firstName
            lastName
            email
            role
            department {
              id
              name
            }
            manager {
              id
              firstName
              lastName
            }
            status
            hireDate
            createdAt
            updatedAt
          }
        }
      `;

			const response = await performGraphQLMutation(
				createEmployeeMutation,
				{ input: newEmployeeData },
				hrManager.token
			);

			// Assert: Employee created successfully
			expect(response.errors).toBeUndefined();
			expect(response.data.createEmployee).toMatchObject({
				firstName: 'Jane',
				lastName: 'Smith',
				email: 'jane.smith@company.com',
				role: 'EMPLOYEE',
				department: {
					id: testContext.departments.engineering.id,
					name: 'Engineering'
				},
				manager: {
					id: testContext.users.manager.id
				},
				status: 'ACTIVE',
				hireDate: '2024-09-24T08:00:00Z'
			});

			expect(response.data.createEmployee.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
			expect(new Date(response.data.createEmployee.createdAt)).toBeInstanceOf(Date);
			expect(new Date(response.data.createEmployee.updatedAt)).toBeInstanceOf(Date);

			// Store for cleanup
			testContext.createdEmployees.push(response.data.createEmployee.id);
		});

		test('should reject employee creation with invalid data', async () => {
			const hrManager = await TestUser.createManager();

			const invalidEmployeeData = {
				firstName: '', // Empty first name
				lastName: 'Test',
				email: 'invalid-email', // Invalid email format
				role: 'INVALID_ROLE', // Invalid role
				departmentId: 'invalid-uuid', // Invalid department ID
				hireDate: 'invalid-date' // Invalid date format
			};

			const createEmployeeMutation = `
        mutation CreateEmployee($input: CreateEmployeeInput!) {
          createEmployee(input: $input) {
            id
          }
        }
      `;

			const response = await performGraphQLMutation(
				createEmployeeMutation,
				{ input: invalidEmployeeData },
				hrManager.token
			);

			// Assert: Should return validation errors
			expect(response.errors).toBeDefined();
			expect(response.errors.length).toBeGreaterThan(0);
			expect(response.data?.createEmployee).toBeNull();
		});

		test('should enforce RBAC permissions for employee creation', async () => {
			const regularEmployee = await TestUser.createEmployee();

			const newEmployeeData = {
				firstName: 'Test',
				lastName: 'Employee',
				email: 'test.employee@company.com',
				role: 'EMPLOYEE',
				departmentId: testContext.departments.engineering.id,
				hireDate: '2024-09-24T08:00:00Z'
			};

			const createEmployeeMutation = `
        mutation CreateEmployee($input: CreateEmployeeInput!) {
          createEmployee(input: $input) {
            id
          }
        }
      `;

			const response = await performGraphQLMutation(
				createEmployeeMutation,
				{ input: newEmployeeData },
				regularEmployee.token
			);

			// Assert: Access denied for regular employee
			expect(response.errors).toBeDefined();
			expect(response.errors[0].message).toMatch(/access denied|forbidden|unauthorized/i);
		});
	});

	describe('Employee Query Operations', () => {
		let testEmployee: TestEmployeeData;

		beforeAll(async () => {
			testEmployee = await TestEmployee.create({
				firstName: 'Test',
				lastName: 'Employee',
				email: 'test.query@company.com',
				role: 'EMPLOYEE',
				departmentId: testContext.departments.engineering.id
			});
		});

		test('should retrieve employee list with pagination', async () => {
			const hrManager = await TestUser.createManager();

			const employeesQuery = `
        query GetEmployees($page: Int!, $limit: Int!) {
          employees(page: $page, limit: $limit) {
            data {
              id
              firstName
              lastName
              email
              role
              department {
                id
                name
              }
              status
            }
            pagination {
              page
              limit
              total
              totalPages
              hasNext
              hasPrev
            }
          }
        }
      `;

			const response = await performGraphQLQuery(
				employeesQuery,
				{ page: 1, limit: 10 },
				hrManager.token
			);

			// Assert: Valid response structure
			expect(response.errors).toBeUndefined();
			expect(response.data.employees.data).toBeInstanceOf(Array);
			expect(response.data.employees.data.length).toBeGreaterThan(0);
			expect(response.data.employees.pagination).toMatchObject({
				page: 1,
				limit: 10,
				total: expect.any(Number),
				totalPages: expect.any(Number),
				hasNext: expect.any(Boolean),
				hasPrev: false
			});

			// Assert: Employee data structure
			const firstEmployee = response.data.employees.data[0];
			expect(firstEmployee).toHaveProperty('id');
			expect(firstEmployee).toHaveProperty('firstName');
			expect(firstEmployee).toHaveProperty('lastName');
			expect(firstEmployee).toHaveProperty('email');
			expect(firstEmployee).toHaveProperty('role');
			expect(firstEmployee).toHaveProperty('department');
			expect(firstEmployee).toHaveProperty('status');
		});

		test('should retrieve single employee with full details', async () => {
			const hrManager = await TestUser.createManager();

			const employeeQuery = `
        query GetEmployee($id: ID!) {
          employee(id: $id) {
            id
            firstName
            lastName
            email
            role
            department {
              id
              name
              manager {
                id
                firstName
                lastName
              }
            }
            manager {
              id
              firstName
              lastName
            }
            directReports {
              id
              firstName
              lastName
              role
            }
            performanceRating
            status
            hireDate
            createdAt
            updatedAt
          }
        }
      `;

			const response = await performGraphQLQuery(
				employeeQuery,
				{ id: testEmployee.id },
				hrManager.token
			);

			// Assert: Complete employee data
			expect(response.errors).toBeUndefined();
			expect(response.data.employee).toMatchObject({
				id: testEmployee.id,
				firstName: 'Test',
				lastName: 'Employee',
				email: 'test.query@company.com',
				role: 'EMPLOYEE',
				status: 'ACTIVE'
			});

			expect(response.data.employee.department).toBeDefined();
			expect(response.data.employee.directReports).toBeInstanceOf(Array);
			expect(new Date(response.data.employee.hireDate)).toBeInstanceOf(Date);
			expect(new Date(response.data.employee.createdAt)).toBeInstanceOf(Date);
			expect(new Date(response.data.employee.updatedAt)).toBeInstanceOf(Date);
		});

		test('should filter employees by department', async () => {
			const manager = await TestUser.createManager();

			const filteredEmployeesQuery = `
        query GetEmployeesByDepartment($departmentId: ID!) {
          employees(filters: { departmentId: $departmentId }) {
            data {
              id
              firstName
              lastName
              department {
                id
                name
              }
            }
          }
        }
      `;

			const response = await performGraphQLQuery(
				filteredEmployeesQuery,
				{ departmentId: testContext.departments.engineering.id },
				manager.token
			);

			// Assert: All employees belong to specified department
			expect(response.errors).toBeUndefined();
			expect(response.data.employees.data).toBeInstanceOf(Array);

			for (const employee of response.data.employees.data) {
				expect(employee.department.id).toBe(testContext.departments.engineering.id);
			}
		});

		test('should enforce data access permissions based on role', async () => {
			const regularEmployee = await TestUser.createEmployee();

			const allEmployeesQuery = `
        query GetAllEmployees {
          employees {
            data {
              id
              firstName
              lastName
              email
              performanceRating
            }
          }
        }
      `;

			const response = await performGraphQLQuery(allEmployeesQuery, {}, regularEmployee.token);

			// Assert: Regular employees should have limited access
			expect(response.errors).toBeDefined();
			expect(response.errors[0].message).toMatch(/access denied|forbidden|unauthorized/i);
		});
	});

	describe('Employee Update Operations', () => {
		let testEmployee: any;

		beforeAll(async () => {
			testEmployee = await TestEmployee.create({
				firstName: 'Update',
				lastName: 'Test',
				email: 'update.test@company.com',
				role: 'EMPLOYEE',
				departmentId: testContext.departments.engineering.id
			});
		});

		test('should update employee information', async () => {
			const hrManager = await TestUser.createManager();

			const updateData = {
				firstName: 'Updated',
				lastName: 'Name',
				email: 'updated.name@company.com',
				role: 'MANAGER',
				departmentId: testContext.departments.marketing.id
			};

			const updateEmployeeMutation = `
        mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
          updateEmployee(id: $id, input: $input) {
            id
            firstName
            lastName
            email
            role
            department {
              id
              name
            }
            updatedAt
          }
        }
      `;

			const response = await performGraphQLMutation(
				updateEmployeeMutation,
				{ id: testEmployee.id, input: updateData },
				hrManager.token
			);

			// Assert: Employee updated successfully
			expect(response.errors).toBeUndefined();
			expect(response.data.updateEmployee).toMatchObject({
				id: testEmployee.id,
				firstName: 'Updated',
				lastName: 'Name',
				email: 'updated.name@company.com',
				role: 'MANAGER',
				department: {
					id: testContext.departments.marketing.id,
					name: 'Marketing'
				}
			});

			// Assert: Updated timestamp changed
			expect(new Date(response.data.updateEmployee.updatedAt)).toBeInstanceOf(Date);
			expect(response.data.updateEmployee.updatedAt).not.toBe(testEmployee.updatedAt);
		});

		test('should update employee status', async () => {
			const hrManager = await TestUser.createManager();

			const statusUpdateMutation = `
        mutation UpdateEmployeeStatus($id: ID!, $input: UpdateEmployeeInput!) {
          updateEmployee(id: $id, input: $input) {
            id
            status
            updatedAt
          }
        }
      `;

			const response = await performGraphQLMutation(
				statusUpdateMutation,
				{ id: testEmployee.id, input: { status: 'ON_LEAVE' } },
				hrManager.token
			);

			expect(response.errors).toBeUndefined();
			expect(response.data.updateEmployee.status).toBe('ON_LEAVE');
		});

		test('should prevent unauthorized updates', async () => {
			const regularEmployee = await TestUser.createEmployee();

			const updateEmployeeMutation = `
        mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
          updateEmployee(id: $id, input: $input) {
            id
          }
        }
      `;

			const response = await performGraphQLMutation(
				updateEmployeeMutation,
				{ id: testEmployee.id, input: { firstName: 'Hacked' } },
				regularEmployee.token
			);

			expect(response.errors).toBeDefined();
			expect(response.errors[0].message).toMatch(/access denied|forbidden|unauthorized/i);
		});
	});

	describe('Employee Deletion Operations', () => {
		let testEmployee: any;

		beforeEach(async () => {
			testEmployee = await TestEmployee.create({
				firstName: 'Delete',
				lastName: 'Test',
				email: 'delete.test@company.com',
				role: 'EMPLOYEE',
				departmentId: testContext.departments.engineering.id
			});
		});

		test('should soft delete employee (mark as terminated)', async () => {
			const admin = await TestUser.createAdmin();

			const deleteEmployeeMutation = `
        mutation DeleteEmployee($id: ID!) {
          deleteEmployee(id: $id)
        }
      `;

			const response = await performGraphQLMutation(
				deleteEmployeeMutation,
				{ id: testEmployee.id },
				admin.token
			);

			expect(response.errors).toBeUndefined();
			expect(response.data.deleteEmployee).toBe(true);

			// Verify employee is marked as terminated
			const employeeQuery = `
        query GetEmployee($id: ID!) {
          employee(id: $id) {
            id
            status
          }
        }
      `;

			const checkResponse = await performGraphQLQuery(
				employeeQuery,
				{ id: testEmployee.id },
				admin.token
			);

			expect(checkResponse.data.employee.status).toBe('TERMINATED');
		});

		test('should prevent deletion by non-admin users', async () => {
			const hrManager = await TestUser.createManager();

			const deleteEmployeeMutation = `
        mutation DeleteEmployee($id: ID!) {
          deleteEmployee(id: $id)
        }
      `;

			const response = await performGraphQLMutation(
				deleteEmployeeMutation,
				{ id: testEmployee.id },
				hrManager.token
			);

			expect(response.errors).toBeDefined();
			expect(response.errors[0].message).toMatch(/access denied|forbidden|unauthorized/i);
		});
	});

	describe('Performance and Load Testing', () => {
		test('should handle bulk employee operations within performance targets', async () => {
			const hrManager = await TestUser.createManager();
			const startTime = Date.now();

			// Create 50 employees in parallel
			const employeePromises = Array(50)
				.fill(null)
				.map((_, index) => {
					const createEmployeeMutation = `
          mutation CreateEmployee($input: CreateEmployeeInput!) {
            createEmployee(input: $input) {
              id
            }
          }
        `;

					return performGraphQLMutation(
						createEmployeeMutation,
						{
							input: {
								firstName: `Bulk${index}`,
								lastName: 'Test',
								email: `bulk${index}@company.com`,
								role: 'EMPLOYEE',
								departmentId: testContext.departments.engineering.id,
								hireDate: '2024-09-24T08:00:00Z'
							}
						},
						hrManager.token
					);
				});

			const results = await Promise.all(employeePromises);
			const endTime = Date.now();

			// Assert: All operations completed successfully
			expect(results.every((result) => !result.errors)).toBe(true);
			expect(results.every((result) => result.data.createEmployee.id)).toBe(true);

			// Assert: Performance target met (<200ms per operation on average)
			const averageTime = (endTime - startTime) / 50;
			expect(averageTime).toBeLessThan(200);

			// Cleanup bulk created employees
			const employeeIds = results.map((result) => result.data.createEmployee.id);
			testContext.createdEmployees.push(...employeeIds);
		});

		test('should handle large employee list queries efficiently', async () => {
			const hrManager = await TestUser.createManager();
			const startTime = Date.now();

			const employeesQuery = `
        query GetAllEmployees {
          employees(limit: 1000) {
            data {
              id
              firstName
              lastName
              email
              role
              department {
                id
                name
              }
              status
            }
            pagination {
              total
            }
          }
        }
      `;

			const response = await performGraphQLQuery(employeesQuery, {}, hrManager.token);
			const endTime = Date.now();

			// Assert: Query completed successfully
			expect(response.errors).toBeUndefined();
			expect(response.data.employees.data).toBeInstanceOf(Array);

			// Assert: Performance target met (<200ms for large queries)
			expect(endTime - startTime).toBeLessThan(200);
		});
	});
});
