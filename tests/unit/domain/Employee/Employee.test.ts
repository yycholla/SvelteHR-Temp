// tests/unit/domain/Employee/Employee.test.ts
import { describe, it, expect } from 'vitest';
import { Employee } from '$domain/Employee/Employee';
import type { CreateEmployeeData } from '$domain/Employee/types';

describe('Employee', () => {
	const validData: CreateEmployeeData = {
		id: '123e4567-e89b-12d3-a456-426614174000',
		email: 'john.doe@example.com',
		firstName: 'John',
		lastName: 'Doe',
		hireDate: '2020-01-15',
		departmentId: '123e4567-e89b-12d3-a456-426614174001',
		jobTitle: 'Software Engineer',
		phone: '+1234567890'
	};

	describe('create', () => {
		it('creates employee with valid data', () => {
			const result = Employee.create(validData);

			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			expect(result.value.id).toBe(validData.id);
			expect(result.value.email.value).toBe('john.doe@example.com');
			expect(result.value.name.fullName).toBe('John Doe');
			expect(result.value.isActive).toBe(true);
		});

		it('normalizes email to lowercase', () => {
			const result = Employee.create({
				...validData,
				email: 'John.Doe@EXAMPLE.COM'
			});

			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			expect(result.value.email.value).toBe('john.doe@example.com');
		});

		it('returns error for invalid email', () => {
			const result = Employee.create({
				...validData,
				email: 'not-an-email'
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMAIL');
		});

		it('returns error for empty first name', () => {
			const result = Employee.create({
				...validData,
				firstName: ''
			});

			expect(result.isError).toBe(true);
		});

		it('returns error for future hire date', () => {
			const futureDate = new Date();
			futureDate.setFullYear(futureDate.getFullYear() + 1);

			const result = Employee.create({
				...validData,
				hireDate: futureDate.toISOString()
			});

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_HIRE_DATE');
		});

		it('handles optional departmentId', () => {
			const result = Employee.create({
				...validData,
				departmentId: null
			});

			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			expect(result.value.departmentId).toBe(null);
		});

		it('handles optional jobTitle', () => {
			const result = Employee.create({
				...validData,
				jobTitle: null
			});

			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			expect(result.value.jobTitle).toBe(null);
		});

		it('returns error for invalid UUID id', () => {
			const result = Employee.create({
				...validData,
				id: 'not-a-uuid'
			});

			expect(result.isError).toBe(true);
			if (!result.isError) return; // Type guard

			expect(result.error.code).toBe('invalid_uuid');
		});

		it('returns error for invalid UUID departmentId', () => {
			const result = Employee.create({
				...validData,
				departmentId: 'not-a-uuid'
			});

			expect(result.isError).toBe(true);
			if (!result.isError) return; // Type guard

			expect(result.error.code).toBe('invalid_uuid');
		});

		it('returns error for invalid phone format', () => {
			const result = Employee.create({
				...validData,
				phone: 'invalid-phone'
			});

			expect(result.isError).toBe(true);
			if (!result.isError) return; // Type guard

			expect(result.error.code).toBe('invalid_format');
		});

		it('returns error for empty last name', () => {
			const result = Employee.create({
				...validData,
				lastName: ''
			});

			expect(result.isError).toBe(true);
		});

		it('returns error for job title too long', () => {
			const result = Employee.create({
				...validData,
				jobTitle: 'a'.repeat(101)
			});

			expect(result.isError).toBe(true);
			if (!result.isError) return; // Type guard

			expect(result.error.code).toBe('max_length');
		});

		it('converts empty string to null for optional fields', () => {
			const result = Employee.create({
				...validData,
				jobTitle: '   ',
				phone: '  '
			});

			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			expect(result.value.jobTitle).toBe(null);
			expect(result.value.phone).toBe(null);
		});
	});

	describe('fullName', () => {
		it('returns formatted full name', () => {
			const result = Employee.create(validData);

			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			expect(result.value.fullName).toBe('John Doe');
		});
	});

	describe('isActive', () => {
		it('returns true for newly created employee', () => {
			const result = Employee.create(validData);

			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			expect(result.value.isActive).toBe(true);
		});
	});

	describe('deactivate', () => {
		it('sets status to inactive', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const deactivateResult = employee.deactivate();

			expect(deactivateResult.isOk).toBe(true);
			expect(employee.isActive).toBe(false);
		});

		it('returns error when already inactive', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			employee.deactivate();
			const deactivateResult = employee.deactivate();

			expect(deactivateResult.isError).toBe(true);
			expect(deactivateResult.error.code).toBe('EMPLOYEE_DEACTIVATION_FAILED');
		});
	});

	describe('activate', () => {
		it('sets status to active', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			employee.deactivate();
			const activateResult = employee.activate();

			expect(activateResult.isOk).toBe(true);
			expect(employee.isActive).toBe(true);
		});

		it('returns error when already active', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const activateResult = employee.activate();

			expect(activateResult.isError).toBe(true);
		});
	});

	describe('changeDepartment', () => {
		it('updates department ID', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const newDeptId = '123e4567-e89b-12d3-a456-426614174099';
			const changeDeptResult = employee.changeDepartment(newDeptId);

			expect(changeDeptResult.isOk).toBe(true);
			expect(employee.departmentId).toBe(newDeptId);
		});

		it('allows setting department to null', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const changeDeptResult = employee.changeDepartment(null);

			expect(changeDeptResult.isOk).toBe(true);
			expect(employee.departmentId).toBe(null);
		});

		it('returns error for invalid UUID', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const changeDeptResult = employee.changeDepartment('not-a-uuid');

			expect(changeDeptResult.isError).toBe(true);
			expect(changeDeptResult.error.code).toBe('invalid_uuid');
		});
	});

	describe('updateJobTitle', () => {
		it('updates job title', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const updateResult = employee.updateJobTitle('Senior Engineer');

			expect(updateResult.isOk).toBe(true);
			expect(employee.jobTitle).toBe('Senior Engineer');
		});

		it('allows setting to null', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const updateResult = employee.updateJobTitle(null);

			expect(updateResult.isOk).toBe(true);
			expect(employee.jobTitle).toBe(null);
		});

		it('returns error for job title exceeding max length', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const longTitle = 'a'.repeat(101);
			const updateResult = employee.updateJobTitle(longTitle);

			expect(updateResult.isError).toBe(true);
			expect(updateResult.error.code).toBe('max_length');
		});

		it('normalizes empty string to null', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const updateResult = employee.updateJobTitle('   ');

			expect(updateResult.isOk).toBe(true);
			expect(employee.jobTitle).toBe(null);
		});
	});

	describe('updatePhone', () => {
		it('updates phone', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const updateResult = employee.updatePhone('+15551234567');

			expect(updateResult.isOk).toBe(true);
			expect(employee.phone).toBe('+15551234567');
		});

		it('allows setting to null', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const updateResult = employee.updatePhone(null);

			expect(updateResult.isOk).toBe(true);
			expect(employee.phone).toBe(null);
		});

		it('returns error for invalid phone format', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const updateResult = employee.updatePhone('invalid-phone');

			expect(updateResult.isError).toBe(true);
			expect(updateResult.error.code).toBe('invalid_format');
		});

		it('normalizes empty string to null', () => {
			const result = Employee.create(validData);
			expect(result.isOk).toBe(true);
			if (!result.isOk) return; // Type guard

			const employee = result.value;
			const updateResult = employee.updatePhone('   ');

			expect(updateResult.isOk).toBe(true);
			expect(employee.phone).toBe(null);
		});
	});
});
