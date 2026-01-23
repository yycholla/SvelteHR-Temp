/**
 * Integration Tests for Employee Create Form Route
 *
 * Tests the integration between EmployeeService and MockEmployeeRepository
 * for the employee create form route (/dashboard/employees/new).
 *
 * These tests verify that:
 * - Employee creation works with valid data
 * - Validation errors are caught and reported correctly
 * - Duplicate email detection works
 * - All domain validation rules are enforced
 * - Edge cases are handled properly
 *
 * Note: These tests use the service layer directly. After route migration,
 * we'll add tests for the actual form action.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { EmployeeFactory } from '../../../helpers/factories';
import { MockEmployeeRepository } from '$adapters/MockEmployeeRepository';
import { EmployeeService } from '$services/EmployeeService';
import type { CreateEmployeeData } from '$domain';

describe('Employee Create Form Integration Tests', () => {
	let repository: MockEmployeeRepository;
	let service: EmployeeService;

	beforeEach(() => {
		repository = new MockEmployeeRepository();
		service = new EmployeeService(repository);
	});

	describe('POST /employees/new - Happy Path', () => {
		it('creates new employee with valid data', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'newemployee@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				jobTitle: 'Software Engineer',
				phone: '+12345678901'
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.email.value).toBe('newemployee@example.com');
			expect(result.value.name.first).toBe('John');
			expect(result.value.name.last).toBe('Doe');
			expect(result.value.jobTitle).toBe('Software Engineer');
			expect(result.value.phone).toBe('+12345678901');
			expect(repository.count()).toBe(1);
		});

		it('creates employee with minimal required fields', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'minimal@example.com',
				firstName: 'Jane',
				lastName: 'Smith',
				hireDate: '2024-02-01',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.email.value).toBe('minimal@example.com');
			expect(result.value.name.first).toBe('Jane');
			expect(result.value.name.last).toBe('Smith');
			expect(result.value.departmentId).toBeNull();
			expect(result.value.jobTitle).toBeNull();
			expect(result.value.phone).toBeNull();
		});

		it('creates employee with all optional fields populated', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'complete@example.com',
				firstName: 'Alice',
				lastName: 'Johnson',
				hireDate: '2024-03-01',
				departmentId: '123e4567-e89b-12d3-a456-426614174002',
				jobTitle: 'Senior Developer',
				phone: '+19876543210'
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.departmentId).toBe('123e4567-e89b-12d3-a456-426614174002');
			expect(result.value.jobTitle).toBe('Senior Developer');
			expect(result.value.phone).toBe('+19876543210');
		});

		it('normalizes email to lowercase', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'UPPERCASE@EXAMPLE.COM',
				firstName: 'Test',
				lastName: 'User',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.email.value).toBe('uppercase@example.com');
		});

		it('trims whitespace from names', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'test@example.com',
				firstName: '  John  ',
				lastName: '  Doe  ',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.name.first).toBe('John');
			expect(result.value.name.last).toBe('Doe');
		});
	});

	describe('POST /employees/new - Validation Errors', () => {
		it('rejects invalid email format', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'not-an-email',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMAIL');
		});

		it('rejects empty email', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: '',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMAIL');
		});

		it('rejects email without domain', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'user@',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMAIL');
		});

		it('rejects invalid phone number format - too short', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: '123' // Too short
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('invalid_format');
		});

		it('rejects invalid phone number format - letters', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: '+1234ABCDEFG'
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('invalid_format');
		});

		it('rejects future hire date', async () => {
			// Arrange
			const futureDate = new Date();
			futureDate.setFullYear(futureDate.getFullYear() + 1);

			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: futureDate.toISOString(),
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_HIRE_DATE');
		});

		it('rejects invalid hire date format', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: 'not-a-date',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_HIRE_DATE');
		});

		it('rejects empty first name', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: '',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect((result.error.context as any)?.rule).toBe('required');
		});

		it('rejects whitespace-only first name', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: '   ',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect((result.error.context as any)?.rule).toBe('required');
		});

		it('rejects empty last name', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: '',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect((result.error.context as any)?.rule).toBe('required');
		});

		it('rejects first name exceeding max length', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'A'.repeat(101),
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect((result.error.context as any)?.rule).toBe('max_length');
		});

		it('rejects last name exceeding max length', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'B'.repeat(101),
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect((result.error.context as any)?.rule).toBe('max_length');
		});

		it('rejects invalid employee ID format', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: 'not-a-uuid',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('invalid_uuid');
		});

		it('rejects invalid department ID format', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: 'not-a-uuid',
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('invalid_uuid');
		});
	});

	describe('POST /employees/new - Duplicate Detection', () => {
		it('rejects duplicate email address', async () => {
			// Arrange
			const existingEmployee = EmployeeFactory.create({
				email: 'existing@example.com'
			});
			await repository.save(existingEmployee);

			const duplicateData: CreateEmployeeData = {
				id: '223e4567-e89b-12d3-a456-426614174000',
				email: 'existing@example.com',
				firstName: 'Jane',
				lastName: 'Smith',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(duplicateData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('EMPLOYEE_ALREADY_EXISTS');
			expect(repository.count()).toBe(1); // Only original employee
		});

		it('detects duplicate when email case matches existing employee', async () => {
			// Arrange
			const existingEmployee = EmployeeFactory.create({
				email: 'existing@example.com'
			});
			await repository.save(existingEmployee);

			const duplicateData: CreateEmployeeData = {
				id: '223e4567-e89b-12d3-a456-426614174000',
				email: 'existing@example.com', // Exact match (already lowercase)
				firstName: 'Jane',
				lastName: 'Smith',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(duplicateData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('EMPLOYEE_ALREADY_EXISTS');
			expect(repository.count()).toBe(1);
		});

		it('allows same name but different email', async () => {
			// Arrange
			const existingEmployee = EmployeeFactory.create({
				email: 'john.doe1@example.com',
				firstName: 'John',
				lastName: 'Doe'
			});
			await repository.save(existingEmployee);

			const newEmployeeData: CreateEmployeeData = {
				id: '223e4567-e89b-12d3-a456-426614174000',
				email: 'john.doe2@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(newEmployeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(repository.count()).toBe(2);
		});
	});

	describe('POST /employees/new - Job Title Validation', () => {
		it('handles very long job title', async () => {
			// Arrange
			const longTitle = 'A'.repeat(100); // Max is 100
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: longTitle,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.jobTitle).toBe(longTitle);
		});

		it('rejects job title exceeding max length', async () => {
			// Arrange
			const tooLongTitle = 'A'.repeat(101);
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: tooLongTitle,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('max_length');
		});

		it('converts empty job title string to null', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: '',
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.jobTitle).toBeNull();
		});

		it('trims whitespace from job title', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: '  Senior Developer  ',
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.jobTitle).toBe('Senior Developer');
		});
	});

	describe('POST /employees/new - Edge Cases', () => {
		it('creates employee hired today', async () => {
			// Arrange
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'newtoday@example.com',
				firstName: 'New',
				lastName: 'Employee',
				hireDate: today,
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.hireDate.value).toEqual(today);
		});

		it('creates employee hired in the past', async () => {
			// Arrange
			const pastDate = new Date('2020-01-01');

			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'past@example.com',
				firstName: 'Past',
				lastName: 'Employee',
				hireDate: pastDate,
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.hireDate.value).toEqual(pastDate);
		});

		it('handles international phone numbers', async () => {
			// Arrange - UK phone number
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'uk@example.com',
				firstName: 'John',
				lastName: 'Smith',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: '+447700900123'
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.phone).toBe('+447700900123');
		});

		it('converts empty phone string to null', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'valid@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: ''
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.phone).toBeNull();
		});

		it('handles special characters in names', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'special@example.com',
				firstName: "O'Connor",
				lastName: 'Smith-Jones',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.name.first).toBe("O'Connor");
			expect(result.value.name.last).toBe('Smith-Jones');
		});

		it('creates active employee by default', async () => {
			// Arrange
			const employeeData: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				email: 'active@example.com',
				firstName: 'Active',
				lastName: 'Employee',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result = await service.createEmployee(employeeData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.isActive).toBe(true);
			expect(result.value.status).toBe('active');
		});
	});

	describe('POST /employees/new - Multiple Create Scenarios', () => {
		it('creates multiple employees with unique emails', async () => {
			// Arrange
			const employee1Data: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174001',
				email: 'employee1@example.com',
				firstName: 'Alice',
				lastName: 'Smith',
				hireDate: '2024-01-15',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			const employee2Data: CreateEmployeeData = {
				id: '123e4567-e89b-12d3-a456-426614174002',
				email: 'employee2@example.com',
				firstName: 'Bob',
				lastName: 'Jones',
				hireDate: '2024-01-16',
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			// Act
			const result1 = await service.createEmployee(employee1Data);
			const result2 = await service.createEmployee(employee2Data);

			// Assert
			expect(result1.isOk).toBe(true);
			expect(result2.isOk).toBe(true);
			expect(repository.count()).toBe(2);
		});

		it('maintains data integrity across multiple creates', async () => {
			// Arrange & Act
			const employees = [];
			for (let i = 0; i < 5; i++) {
				const data: CreateEmployeeData = {
					id: `123e4567-e89b-12d3-a456-42661417400${i}`,
					email: `employee${i}@example.com`,
					firstName: `First${i}`,
					lastName: `Last${i}`,
					hireDate: '2024-01-15',
					departmentId: null,
					jobTitle: null,
					phone: null
				};
				const result = await service.createEmployee(data);
				expect(result.isOk).toBe(true);
				employees.push(result.value);
			}

			// Assert - All employees are unique and correctly stored
			expect(repository.count()).toBe(5);
			const emails = employees.map((e) => e.email.value);
			const uniqueEmails = new Set(emails);
			expect(uniqueEmails.size).toBe(5);
		});
	});
});
