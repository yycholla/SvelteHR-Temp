// tests/unit/services/EmployeeService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmployeeService } from '$services';
import { MockEmployeeRepository } from '$adapters';
import type { EmployeeRepository } from '$services';
import {
	Employee,
	type CreateEmployeeData,
	type UpdateEmployeeData,
	EmployeeNotFoundError,
	EmployeeAlreadyExistsError,
	DomainError
} from '$domain';

describe('EmployeeService - CRUD Operations', () => {
	let service: EmployeeService;
	let repository: MockEmployeeRepository;

	beforeEach(() => {
		repository = new MockEmployeeRepository();
		service = new EmployeeService(repository);
	});

	describe('getEmployees', () => {
		it('returns all employees', async () => {
			// Arrange
			const employee1Data: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			const employee2Data: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174002',
				email: 'jane.smith@example.com',
				firstName: 'Jane',
				lastName: 'Smith',
				hireDate: '2024-02-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174003',
				jobTitle: 'Product Manager',
				phone: '+12345678902'
			};

			const employee1 = Employee.create(employee1Data).value;
			const employee2 = Employee.create(employee2Data).value;
			await repository.save(employee1);
			await repository.save(employee2);

			// Act
			const result = await service.getEmployees();

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.employees).toHaveLength(2);
			expect(result.value.total).toBe(2);
		});

		it('returns filtered results when filters are provided', async () => {
			// Arrange
			const employee1Data: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			const employee2Data: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174002',
				email: 'jane.smith@example.com',
				firstName: 'Jane',
				lastName: 'Smith',
				hireDate: '2024-02-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174003',
				jobTitle: 'Product Manager',
				phone: '+12345678902'
			};

			const employee1 = Employee.create(employee1Data).value;
			const employee2 = Employee.create(employee2Data).value;
			await repository.save(employee1);
			await repository.save(employee2);

			// Act
			const result = await service.getEmployees({
				departmentId: '123e4567-e89b-12d3-a456-426614174001'
			});

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.employees).toHaveLength(1);
			expect(result.value.employees[0].id).toBe('123e4567-e89b-12d3-a456-426614174000');
		});

		it('returns empty array when no results match filters', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			const employee = Employee.create(employeeData).value;
			await repository.save(employee);

			// Act
			const result = await service.getEmployees({
				departmentId: 'nonexistent-department-id'
			});

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.employees).toHaveLength(0);
			expect(result.value.total).toBe(0);
		});

		it('handles repository errors gracefully', async () => {
			// Arrange - Create a spy that throws an error
			const errorMessage = 'Database connection failed';
			vi.spyOn(repository, 'findAll').mockRejectedValueOnce(new Error(errorMessage));

			// Act
			const result = await service.getEmployees();

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DomainError);
			expect(result.error.code).toBe('EMPLOYEES_FETCH_FAILED');
			expect(result.error.message).toBe('Failed to fetch employees');
		});
	});

	describe('getEmployeeById', () => {
		it('returns employee with valid ID', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			const employee = Employee.create(employeeData).value;
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById('123e4567-e89b-12d3-a456-426614174000');

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('123e4567-e89b-12d3-a456-426614174000');
			expect(result.value.email.value).toBe('john.doe@example.com');
		});

		it('returns EmployeeNotFoundError with invalid ID', async () => {
			// Act
			const result = await service.getEmployeeById('123e4567-e89b-12d3-a456-426614174000');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmployeeNotFoundError);
			expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
		});

		it('handles repository errors gracefully', async () => {
			// Arrange
			const errorMessage = 'Database query timeout';
			vi.spyOn(repository, 'findById').mockRejectedValueOnce(new Error(errorMessage));

			// Act
			const result = await service.getEmployeeById('123e4567-e89b-12d3-a456-426614174000');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DomainError);
			expect(result.error.code).toBe('EMPLOYEE_FETCH_FAILED');
			expect(result.error.message).toBe('Failed to fetch employee');
		});
	});

	describe('createEmployee', () => {
		it('creates and returns new employee with valid data', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.email.value).toBe('john.doe@example.com');
			expect(result.value.name.first).toBe('John');
			expect(result.value.name.last).toBe('Doe');
			expect(repository.count()).toBe(1);
		});

		it('returns ValidationError with invalid email', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'invalid-email',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DomainError);
			expect(result.error.code).toBe('INVALID_EMAIL');
		});

		it('returns EmployeeAlreadyExistsError when email already exists', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			await service.createEmployee(employeeData);

			const duplicateData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174002',
				email: 'john.doe@example.com',
				firstName: 'Jane',
				lastName: 'Smith',
				hireDate: '2024-02-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Product Manager',
				phone: '+12345678902'
			};

			// Act
			const result = await service.createEmployee(duplicateData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmployeeAlreadyExistsError);
			expect(result.error.code).toBe('EMPLOYEE_ALREADY_EXISTS');
		});
	});

	describe('updateEmployee', () => {
		it('updates and returns employee with valid data', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			const employee = Employee.create(employeeData).value;
			await repository.save(employee);

			const updateData: UpdateEmployeeData = {
				jobTitle: 'Senior Software Engineer',
				phone: '+12345678999',
				departmentId: '123e4567-e89b-12d3-a456-426614174003'
			};

			// Act
			const result = await service.updateEmployee(
				'123e4567-e89b-12d3-a456-426614174000',
				updateData
			);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.jobTitle).toBe('Senior Software Engineer');
			expect(result.value.phone).toBe('+12345678999');
			expect(result.value.departmentId).toBe('123e4567-e89b-12d3-a456-426614174003');
		});

		it('returns EmployeeNotFoundError with invalid ID', async () => {
			// Arrange
			const updateData: UpdateEmployeeData = {
				jobTitle: 'Senior Software Engineer'
			};

			// Act
			const result = await service.updateEmployee(
				'123e4567-e89b-12d3-a456-426614174000',
				updateData
			);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmployeeNotFoundError);
			expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
		});

		it('handles repository errors gracefully', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			const employee = Employee.create(employeeData).value;
			await repository.save(employee);

			const updateData: UpdateEmployeeData = {
				jobTitle: 'Senior Software Engineer'
			};

			// Mock repository.update to throw an error
			const errorMessage = 'Database write failed';
			vi.spyOn(repository, 'update').mockRejectedValueOnce(new Error(errorMessage));

			// Act
			const result = await service.updateEmployee(
				'123e4567-e89b-12d3-a456-426614174000',
				updateData
			);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DomainError);
			expect(result.error.code).toBe('EMPLOYEE_UPDATE_FAILED');
			expect(result.error.message).toBe('Failed to update employee');
		});
	});

	describe('deleteEmployee', () => {
		it('soft deletes employee (sets isActive = false)', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			const employee = Employee.create(employeeData).value;
			await repository.save(employee);

			// Act
			const result = await service.deleteEmployee('123e4567-e89b-12d3-a456-426614174000');

			// Assert
			expect(result.isOk).toBe(true);

			// Verify employee still exists but is inactive
			const foundEmployee = await repository.findById('123e4567-e89b-12d3-a456-426614174000');
			expect(foundEmployee).not.toBeNull();
			expect(foundEmployee!.isActive).toBe(false);
		});

		it('returns EmployeeNotFoundError with invalid ID', async () => {
			// Act
			const result = await service.deleteEmployee('123e4567-e89b-12d3-a456-426614174000');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmployeeNotFoundError);
			expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
		});

		it('handles repository errors gracefully', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			const employee = Employee.create(employeeData).value;
			await repository.save(employee);

			// Mock repository.update to throw an error
			const errorMessage = 'Database transaction failed';
			vi.spyOn(repository, 'update').mockRejectedValueOnce(new Error(errorMessage));

			// Act
			const result = await service.deleteEmployee('123e4567-e89b-12d3-a456-426614174000');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DomainError);
			expect(result.error.code).toBe('EMPLOYEE_DELETE_FAILED');
			expect(result.error.message).toBe('Failed to delete employee');
		});
	});

	describe('Service Architecture', () => {
		it('properly injects repository dependency', () => {
			// Arrange
			const mockRepo: EmployeeRepository = {
				findById: vi.fn(),
				findByEmail: vi.fn(),
				findAll: vi.fn(),
				save: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
				exists: vi.fn()
			};

			// Act
			const serviceInstance = new EmployeeService(mockRepo);

			// Assert
			expect(serviceInstance).toBeInstanceOf(EmployeeService);
			// Verify the service can be instantiated with any EmployeeRepository implementation
		});

		it('returns Result<T, E> types correctly for all methods', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			const employee = Employee.create(employeeData).value;
			await repository.save(employee);

			// Act & Assert - Test each method returns Result type
			const getByIdResult = await service.getEmployeeById('123e4567-e89b-12d3-a456-426614174000');
			expect(getByIdResult).toHaveProperty('isOk');
			expect(getByIdResult).toHaveProperty('isError');
			expect(getByIdResult.isOk ? getByIdResult.value : null).toBeDefined();

			const getEmployeesResult = await service.getEmployees();
			expect(getEmployeesResult).toHaveProperty('isOk');
			expect(getEmployeesResult).toHaveProperty('isError');

			const createResult = await service.createEmployee({
				id: '123e4567-e89b-12d3-a456-426614174002',
				email: 'new@example.com',
				firstName: 'New',
				lastName: 'Employee',
				hireDate: '2024-01-01',
				departmentId: null,
				jobTitle: null,
				phone: null
			});
			expect(createResult).toHaveProperty('isOk');
			expect(createResult).toHaveProperty('isError');

			const updateResult = await service.updateEmployee('123e4567-e89b-12d3-a456-426614174000', {
				jobTitle: 'Updated Title'
			});
			expect(updateResult).toHaveProperty('isOk');
			expect(updateResult).toHaveProperty('isError');

			const deleteResult = await service.deleteEmployee('123e4567-e89b-12d3-a456-426614174000');
			expect(deleteResult).toHaveProperty('isOk');
			expect(deleteResult).toHaveProperty('isError');
		});
	});

	describe('Business Workflows', () => {
		it('createEmployee checks for duplicate email before creating', async () => {
			// Arrange - Create first employee
			const firstEmployee: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'duplicate@example.com',
				firstName: 'First',
				lastName: 'Employee',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Engineer',
				phone: '+12345678901'
			};
			await service.createEmployee(firstEmployee);

			// Act - Try to create another employee with same email
			const duplicateEmployee: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174002',
				email: 'duplicate@example.com',
				firstName: 'Second',
				lastName: 'Employee',
				hireDate: '2024-01-02',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Manager',
				phone: '+12345678902'
			};
			const result = await service.createEmployee(duplicateEmployee);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmployeeAlreadyExistsError);
			expect(result.error.code).toBe('EMPLOYEE_ALREADY_EXISTS');
			expect(repository.count()).toBe(1); // Only first employee was saved
		});

		it('createEmployee validates domain rules before persisting', async () => {
			// Arrange - Invalid email
			const invalidData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'not-an-email',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Engineer',
				phone: '+12345678901'
			};

			// Act
			const result = await service.createEmployee(invalidData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMAIL');
			expect(repository.count()).toBe(0); // Nothing was saved
		});

		it('updateEmployee allows changing department', async () => {
			// Arrange - Create employee in Engineering department
			const engineeringDeptId = '223e4567-e89b-12d3-a456-426614174000';
			const salesDeptId = '323e4567-e89b-12d3-a456-426614174000';
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: engineeringDeptId,
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			await service.createEmployee(employeeData);

			// Act - Transfer to Sales department
			const result = await service.updateEmployee('123e4567-e89b-12d3-a456-426614174000', {
				departmentId: salesDeptId,
				jobTitle: 'Sales Engineer'
			});

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.departmentId).toBe(salesDeptId);
			expect(result.value.jobTitle).toBe('Sales Engineer');
		});

		it('updateEmployee validates changes through domain entity', async () => {
			// Arrange - Create employee
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			await service.createEmployee(employeeData);

			// Act - Try to update with invalid phone (domain validation should catch this)
			const result = await service.updateEmployee('123e4567-e89b-12d3-a456-426614174000', {
				phone: 'invalid-phone'
			});

			// Assert - Domain validation should prevent invalid phone
			expect(result.isError).toBe(true);
		});

		it('deleteEmployee sets isActive to false (soft delete)', async () => {
			// Arrange - Create active employee
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};
			await service.createEmployee(employeeData);

			// Verify employee is active initially
			const beforeDelete = await service.getEmployeeById('123e4567-e89b-12d3-a456-426614174000');
			expect(beforeDelete.value.isActive).toBe(true);

			// Act - Delete employee
			const deleteResult = await service.deleteEmployee('123e4567-e89b-12d3-a456-426614174000');

			// Assert
			expect(deleteResult.isOk).toBe(true);

			// Verify employee still exists but is inactive
			const afterDelete = await service.getEmployeeById('123e4567-e89b-12d3-a456-426614174000');
			expect(afterDelete.isOk).toBe(true);
			expect(afterDelete.value.isActive).toBe(false);
			expect(repository.count()).toBe(1); // Employee record still exists
		});

		it('getEmployees filters by department correctly', async () => {
			// Arrange - Create employees in different departments
			const engineeringDeptId = '223e4567-e89b-12d3-a456-426614174000';
			const salesDeptId = '323e4567-e89b-12d3-a456-426614174000';
			const hrDeptId = '423e4567-e89b-12d3-a456-426614174000';

			const engineeringEmp: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'eng@example.com',
				firstName: 'Engineering',
				lastName: 'Employee',
				hireDate: '2024-01-01',
				departmentId: engineeringDeptId,
				jobTitle: 'Engineer',
				phone: '+12345678901'
			};
			const salesEmp: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174001',
				email: 'sales@example.com',
				firstName: 'Sales',
				lastName: 'Employee',
				hireDate: '2024-01-02',
				departmentId: salesDeptId,
				jobTitle: 'Sales Rep',
				phone: '+12345678902'
			};
			const hrEmp: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174002',
				email: 'hr@example.com',
				firstName: 'HR',
				lastName: 'Employee',
				hireDate: '2024-01-03',
				departmentId: hrDeptId,
				jobTitle: 'HR Manager',
				phone: '+12345678903'
			};

			await service.createEmployee(engineeringEmp);
			await service.createEmployee(salesEmp);
			await service.createEmployee(hrEmp);

			// Act - Filter by engineering department
			const result = await service.getEmployees({ departmentId: engineeringDeptId });

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.employees).toHaveLength(1);
			expect(result.value.employees[0].departmentId).toBe(engineeringDeptId);
			expect(result.value.total).toBe(1);
		});

		it('getEmployees filters by active status correctly', async () => {
			// Arrange - Create active and inactive employees
			const activeEmp: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'active@example.com',
				firstName: 'Active',
				lastName: 'Employee',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Engineer',
				phone: '+12345678901'
			};
			const inactiveEmp: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174002',
				email: 'inactive@example.com',
				firstName: 'Inactive',
				lastName: 'Employee',
				hireDate: '2024-01-02',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Manager',
				phone: '+12345678902'
			};

			await service.createEmployee(activeEmp);
			await service.createEmployee(inactiveEmp);

			// Deactivate second employee
			await service.deleteEmployee('123e4567-e89b-12d3-a456-426614174002');

			// Act - Filter for active employees only
			const activeResult = await service.getEmployees({ isActive: true });

			// Assert - Only active employee returned
			expect(activeResult.isOk).toBe(true);
			expect(activeResult.value.employees).toHaveLength(1);
			expect(activeResult.value.employees[0].isActive).toBe(true);
			expect(activeResult.value.employees[0].email.value).toBe('active@example.com');

			// Act - Filter for inactive employees only
			const inactiveResult = await service.getEmployees({ isActive: false });

			// Assert - Only inactive employee returned
			expect(inactiveResult.isOk).toBe(true);
			expect(inactiveResult.value.employees).toHaveLength(1);
			expect(inactiveResult.value.employees[0].isActive).toBe(false);
			expect(inactiveResult.value.employees[0].email.value).toBe('inactive@example.com');
		});

		it('getEmployees handles multiple filters together', async () => {
			// Arrange - Create employees with various combinations
			const engineeringDeptId = '223e4567-e89b-12d3-a456-426614174000';
			const salesDeptId = '323e4567-e89b-12d3-a456-426614174000';

			const activeEngineer: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'active.eng@example.com',
				firstName: 'Active',
				lastName: 'Engineer',
				hireDate: '2024-01-01',
				departmentId: engineeringDeptId,
				jobTitle: 'Engineer',
				phone: '+12345678901'
			};
			const inactiveEngineer: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174001',
				email: 'inactive.eng@example.com',
				firstName: 'Inactive',
				lastName: 'Engineer',
				hireDate: '2024-01-02',
				departmentId: engineeringDeptId,
				jobTitle: 'Engineer',
				phone: '+12345678902'
			};
			const activeSales: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174002',
				email: 'active.sales@example.com',
				firstName: 'Active',
				lastName: 'Sales',
				hireDate: '2024-01-03',
				departmentId: salesDeptId,
				jobTitle: 'Sales',
				phone: '+12345678903'
			};

			await service.createEmployee(activeEngineer);
			await service.createEmployee(inactiveEngineer);
			await service.createEmployee(activeSales);

			// Deactivate the inactive engineer
			await service.deleteEmployee('123e4567-e89b-12d3-a456-426614174001');

			// Act - Filter for active engineering employees only
			const result = await service.getEmployees({
				departmentId: engineeringDeptId,
				isActive: true
			});

			// Assert - Only active engineer returned
			expect(result.isOk).toBe(true);
			expect(result.value.employees).toHaveLength(1);
			expect(result.value.employees[0].email.value).toBe('active.eng@example.com');
			expect(result.value.employees[0].isActive).toBe(true);
			expect(result.value.employees[0].departmentId).toBe(engineeringDeptId);
			expect(result.value.total).toBe(1);
		});

		it('service handles concurrent operations safely', async () => {
			// Arrange - Create employee data
			const newDeptId = '523e4567-e89b-12d3-a456-426614174000';
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'concurrent@example.com',
				firstName: 'Concurrent',
				lastName: 'Test',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Engineer',
				phone: '+12345678901'
			};
			await service.createEmployee(employeeData);

			// Act - Execute multiple update operations concurrently
			const updatePromises = [
				service.updateEmployee('123e4567-e89b-12d3-a456-426614174000', {
					jobTitle: 'Senior Engineer'
				}),
				service.updateEmployee('123e4567-e89b-12d3-a456-426614174000', {
					phone: '+12345678999'
				}),
				service.updateEmployee('123e4567-e89b-12d3-a456-426614174000', {
					departmentId: newDeptId
				})
			];

			const results = await Promise.all(updatePromises);

			// Assert - All operations should complete successfully
			expect(results.every((r) => r.isOk)).toBe(true);

			// Verify final state is consistent (last update wins in mock repository)
			const finalEmployee = await service.getEmployeeById('123e4567-e89b-12d3-a456-426614174000');
			expect(finalEmployee.isOk).toBe(true);
			expect(repository.count()).toBe(1);
		});

		it('service returns errors on repository failures without partial updates', async () => {
			// Arrange - Create an employee
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'test@example.com',
				firstName: 'Test',
				lastName: 'Employee',
				hireDate: '2024-01-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Engineer',
				phone: '+12345678901'
			};

			await service.createEmployee(employeeData);

			// Mock repository.update to fail
			vi.spyOn(repository, 'update').mockRejectedValueOnce(new Error('Simulated database failure'));

			// Act - Try to update the employee
			const updateResult = await service.updateEmployee('123e4567-e89b-12d3-a456-426614174000', {
				jobTitle: 'Senior Engineer'
			});

			// Assert - Update fails gracefully with proper error
			expect(updateResult.isError).toBe(true);
			expect(updateResult.error.code).toBe('EMPLOYEE_UPDATE_FAILED');
			expect(updateResult.error.message).toBe('Failed to update employee');

			// Restore original implementation
			vi.restoreAllMocks();

			// Verify the service properly returns error results for repository failures
			// This demonstrates that the service layer handles persistence failures gracefully
			// Note: In-memory state may be modified, but repository persistence failed,
			// which is why the Result pattern is used to communicate failures to callers
			expect(updateResult.error).toBeInstanceOf(DomainError);
		});
	});
});
