/**
 * Integration Tests for Employee Detail View Route
 *
 * Tests the integration between EmployeeService and MockEmployeeRepository
 * for the employee detail view route (/dashboard/employees/[id]).
 *
 * These tests verify that:
 * - Employee detail data can be loaded correctly
 * - Error cases (not found, invalid ID) are handled properly
 * - All employee fields are loaded and accessible
 * - The service layer works correctly with the repository
 *
 * Note: These tests use the service layer directly. After route migration,
 * we'll add tests for the actual load function.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { EmployeeFactory } from '../../../helpers/factories';
import { MockEmployeeRepository } from '$adapters/MockEmployeeRepository';
import { EmployeeService } from '$services/EmployeeService';

describe('Employee Detail View Integration Tests', () => {
	let repository: MockEmployeeRepository;
	let service: EmployeeService;

	beforeEach(() => {
		repository = new MockEmployeeRepository();
		service = new EmployeeService(repository);
	});

	describe('GET /dashboard/employees/[id] - Happy Path', () => {
		it('loads employee details when employee exists', async () => {
			// Arrange
			const employee = EmployeeFactory.create();
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(employee.id);
			expect(result.value.email.value).toBe(employee.email.value);
			expect(result.value.name.first).toBe(employee.name.first);
			expect(result.value.name.last).toBe(employee.name.last);
		});

		it('loads employee with all basic fields populated', async () => {
			// Arrange
			const employee = EmployeeFactory.create({
				jobTitle: 'Senior Developer',
				departmentId: '123e4567-e89b-12d3-a456-426614174001',
				phone: '+12345678901'
			});
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.jobTitle).toBe('Senior Developer');
			expect(result.value.departmentId).toBe('123e4567-e89b-12d3-a456-426614174001');
			expect(result.value.phone).toBe('+12345678901');
		});

		it('loads employee with full name computed correctly', async () => {
			// Arrange
			const employee = EmployeeFactory.create({
				firstName: 'John',
				lastName: 'Doe'
			});
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.fullName).toBe('John Doe');
		});

		it('loads employee with hire date', async () => {
			// Arrange
			const hireDate = new Date('2024-01-15');
			const employee = EmployeeFactory.create({ hireDate });
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.hireDate.value).toEqual(hireDate);
		});

		it('loads active employee with isActive flag', async () => {
			// Arrange
			const employee = EmployeeFactory.create();
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.isActive).toBe(true);
		});

		it('loads inactive employee correctly', async () => {
			// Arrange
			const employee = EmployeeFactory.createInactive();
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.isActive).toBe(false);
		});
	});

	describe('GET /dashboard/employees/[id] - Error Cases', () => {
		it('returns error when employee not found', async () => {
			// Act
			const result = await service.getEmployeeById('nonexistent-id');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
			expect(result.error.message).toContain('nonexistent-id');
		});

		it('handles empty ID string', async () => {
			// Act
			const result = await service.getEmployeeById('');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
		});

		it('handles invalid UUID format gracefully', async () => {
			// Act
			const result = await service.getEmployeeById('invalid-uuid-format');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('EMPLOYEE_NOT_FOUND');
		});

		it('handles null-like values (runtime safety check)', async () => {
			// This tests runtime behavior when data comes from untrusted sources (e.g., URL params)
			// TypeScript prevents this at compile time, but we validate runtime behavior
			const result = await service.getEmployeeById(undefined as unknown as string);

			// Assert
			expect(result.isError).toBe(true);
		});
	});

	describe('Data Consistency', () => {
		it('returns consistent data across multiple loads', async () => {
			// Arrange
			const employee = EmployeeFactory.create({
				firstName: 'Jane',
				lastName: 'Smith',
				jobTitle: 'Software Engineer'
			});
			await repository.save(employee);

			// Act
			const result1 = await service.getEmployeeById(employee.id);
			const result2 = await service.getEmployeeById(employee.id);

			// Assert
			expect(result1.isOk).toBe(true);
			expect(result2.isOk).toBe(true);
			expect(result1.value.id).toBe(result2.value.id);
			expect(result1.value.email.value).toBe(result2.value.email.value);
			expect(result1.value.fullName).toBe(result2.value.fullName);
			expect(result1.value.jobTitle).toBe(result2.value.jobTitle);
		});

		it('reflects updates to employee data on subsequent loads', async () => {
			// Arrange
			const employee = EmployeeFactory.create({
				jobTitle: 'Junior Developer'
			});
			await repository.save(employee);

			// Update employee job title
			const updateResult = employee.updateJobTitle('Lead Developer');
			expect(updateResult.isOk).toBe(true);
			await repository.update(employee.id, employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.jobTitle).toBe('Lead Developer');
		});

		it('reflects deactivation on subsequent loads', async () => {
			// Arrange
			const employee = EmployeeFactory.create();
			await repository.save(employee);

			// First load - should be active
			const result1 = await service.getEmployeeById(employee.id);
			expect(result1.isOk).toBe(true);
			expect(result1.value.isActive).toBe(true);

			// Deactivate employee
			employee.deactivate();
			await repository.update(employee.id, employee);

			// Second load - should be inactive
			const result2 = await service.getEmployeeById(employee.id);
			expect(result2.isOk).toBe(true);
			expect(result2.value.isActive).toBe(false);
		});
	});

	describe('Department Integration', () => {
		it('loads employee with department ID', async () => {
			// Arrange
			const departmentId = '123e4567-e89b-12d3-a456-426614174001';
			const employee = EmployeeFactory.createWithDepartment(departmentId);
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.departmentId).toBe(departmentId);
		});

		it('handles department change correctly', async () => {
			// Arrange
			const originalDepartment = '123e4567-e89b-12d3-a456-426614174001';
			const newDepartment = '223e4567-e89b-12d3-a456-426614174002';

			const employee = EmployeeFactory.createWithDepartment(originalDepartment);
			await repository.save(employee);

			// Change department
			const changeResult = employee.changeDepartment(newDepartment);
			expect(changeResult.isOk).toBe(true);
			await repository.update(employee.id, employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.departmentId).toBe(newDepartment);
		});
	});

	describe('Contact Information', () => {
		it('loads employee with phone number', async () => {
			// Arrange
			const phone = '+12345678901';
			const employee = EmployeeFactory.create({ phone });
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.phone).toBe(phone);
		});

		it('handles phone number updates', async () => {
			// Arrange
			const employee = EmployeeFactory.create({ phone: '+12345678901' });
			await repository.save(employee);

			// Update phone
			const newPhone = '+19876543210';
			const updateResult = employee.updatePhone(newPhone);
			expect(updateResult.isOk).toBe(true);
			await repository.update(employee.id, employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.phone).toBe(newPhone);
		});

		it('loads employee email correctly', async () => {
			// Arrange
			const email = 'john.doe@company.com';
			const employee = EmployeeFactory.create({ email });
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.email.value).toBe(email);
		});
	});

	describe('Multiple Employee Scenarios', () => {
		it('loads correct employee when multiple exist', async () => {
			// Arrange
			const employee1 = EmployeeFactory.create({ firstName: 'Alice' });
			const employee2 = EmployeeFactory.create({ firstName: 'Bob' });
			const employee3 = EmployeeFactory.create({ firstName: 'Charlie' });

			await repository.save(employee1);
			await repository.save(employee2);
			await repository.save(employee3);

			// Act
			const result = await service.getEmployeeById(employee2.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(employee2.id);
			expect(result.value.name.first).toBe('Bob');
		});

		it('loads each employee independently', async () => {
			// Arrange
			const employees = EmployeeFactory.createMany(5);
			for (const emp of employees) {
				await repository.save(emp);
			}

			// Act & Assert - Load each employee and verify
			for (const emp of employees) {
				const result = await service.getEmployeeById(emp.id);
				expect(result.isOk).toBe(true);
				expect(result.value.id).toBe(emp.id);
				expect(result.value.email.value).toBe(emp.email.value);
			}
		});
	});

	describe('Edge Cases', () => {
		it('handles employee with minimal required fields', async () => {
			// Arrange - Create employee with only required fields
			const employee = EmployeeFactory.create({
				jobTitle: undefined // Optional field
			});
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(employee.id);
			// Required fields should still be present
			expect(result.value.email).toBeDefined();
			expect(result.value.name).toBeDefined();
			expect(result.value.hireDate).toBeDefined();
		});

		it('handles employee with very long names', async () => {
			// Arrange
			const longFirstName = 'A'.repeat(100);
			const longLastName = 'B'.repeat(100);
			const employee = EmployeeFactory.create({
				firstName: longFirstName,
				lastName: longLastName
			});
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.name.first).toBe(longFirstName);
			expect(result.value.name.last).toBe(longLastName);
		});

		it('handles employee hired today', async () => {
			// Arrange
			const today = new Date();
			// Normalize to midnight for comparison (domain layer normalizes dates)
			const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
			const employee = EmployeeFactory.create({ hireDate: today });
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.hireDate.value).toEqual(normalizedToday);
		});

		it('handles employee hired in the past', async () => {
			// Arrange
			const pastDate = new Date('2020-01-01');
			const employee = EmployeeFactory.create({ hireDate: pastDate });
			await repository.save(employee);

			// Act
			const result = await service.getEmployeeById(employee.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.hireDate.value).toEqual(pastDate);
		});
	});

	describe('Performance', () => {
		it('loads employee detail efficiently', async () => {
			// Arrange
			const employee = EmployeeFactory.create();
			await repository.save(employee);

			// Act
			const startTime = performance.now();
			const result = await service.getEmployeeById(employee.id);
			const endTime = performance.now();

			// Assert
			expect(result.isOk).toBe(true);

			const duration = endTime - startTime;
			// Smoke test: ensure no major performance regression
			// Note: This is not a precision benchmark - thresholds are generous to avoid flakiness
			expect(duration).toBeLessThan(100); // 100ms is very generous for in-memory operation
		});

		it('handles concurrent loads efficiently', async () => {
			// Arrange
			const employee = EmployeeFactory.create();
			await repository.save(employee);

			// Act - Load same employee 10 times concurrently
			const promises = Array.from({ length: 10 }, () => service.getEmployeeById(employee.id));

			const startTime = performance.now();
			const results = await Promise.all(promises);
			const endTime = performance.now();

			// Assert
			expect(results).toHaveLength(10);
			results.forEach((result) => {
				expect(result.isOk).toBe(true);
				expect(result.value.id).toBe(employee.id);
			});

			const totalDuration = endTime - startTime;
			// Smoke test: concurrent loads should complete reasonably fast
			// Note: This is not a precision benchmark - threshold accounts for CI variability
			expect(totalDuration).toBeLessThan(500); // 500ms for 10 concurrent in-memory operations
		});
	});
});
