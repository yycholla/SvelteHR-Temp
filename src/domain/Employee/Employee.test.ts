import { describe, expect, it } from 'vitest';
import { Employee } from './Employee';
import { EmployeeFactory } from '../../../tests/helpers/factories';
import { faker } from '@faker-js/faker';

describe('Employee', () => {
	describe('create', () => {
		it('returns Ok with valid data', () => {
			const validData = {
				id: faker.string.uuid(),
				email: faker.internet.email(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				hireDate: faker.date.past({ years: 2 }),
				departmentId: faker.string.uuid(),
				jobTitle: faker.person.jobTitle(),
				phone: '+12085551234'
			};

			const result = Employee.create(validData);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(validData.id);
			expect(result.value.email.value).toBe(validData.email.toLowerCase());
			expect(result.value.name.first).toBe(validData.firstName);
			expect(result.value.name.last).toBe(validData.lastName);
			expect(result.value.isActive).toBe(true);
		});

		it('returns InvalidEmailError with invalid email', () => {
			const invalidData = {
				id: faker.string.uuid(),
				email: 'invalid-email-format', // Missing @ and domain
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				hireDate: faker.date.past({ years: 2 }),
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			const result = Employee.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('InvalidEmailError');
		});

		it('returns InvalidHireDateError with future hire date', () => {
			const futureDate = new Date();
			futureDate.setFullYear(futureDate.getFullYear() + 1);

			const invalidData = {
				id: faker.string.uuid(),
				email: faker.internet.email(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				hireDate: futureDate,
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			const result = Employee.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('InvalidHireDateError');
		});

		it('returns ValidationError with empty first name', () => {
			const invalidData = {
				id: faker.string.uuid(),
				email: faker.internet.email(),
				firstName: '', // Empty first name
				lastName: faker.person.lastName(),
				hireDate: faker.date.past({ years: 2 }),
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			const result = Employee.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
		});

		it('returns ValidationError with empty last name', () => {
			const invalidData = {
				id: faker.string.uuid(),
				email: faker.internet.email(),
				firstName: faker.person.firstName(),
				lastName: '', // Empty last name
				hireDate: faker.date.past({ years: 2 }),
				departmentId: null,
				jobTitle: null,
				phone: null
			};

			const result = Employee.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
		});
	});

	describe('deactivate', () => {
		it('sets status to inactive', () => {
			const employee = EmployeeFactory.create();

			expect(employee.isActive).toBe(true);

			const result = employee.deactivate();

			expect(result.isOk).toBe(true);
			expect(employee.isActive).toBe(false);
			expect(employee.status).toBe('inactive');
		});

		it('returns error when already inactive', () => {
			const employee = EmployeeFactory.create();
			employee.deactivate(); // First deactivation

			const result = employee.deactivate(); // Second deactivation attempt

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('EmployeeDeactivationError');
			expect(result.error.message).toContain('already inactive');
		});
	});

	describe('changeDepartment', () => {
		it('updates department', () => {
			const employee = EmployeeFactory.create();
			const originalDepartment = employee.departmentId;
			const newDepartmentId = faker.string.uuid();

			const result = employee.changeDepartment(newDepartmentId);

			expect(result.isOk).toBe(true);
			expect(employee.departmentId).toBe(newDepartmentId);
			expect(employee.departmentId).not.toBe(originalDepartment);
		});

		it('returns error with invalid department ID', () => {
			const employee = EmployeeFactory.create();
			const invalidDepartmentId = 'not-a-valid-uuid';

			const result = employee.changeDepartment(invalidDepartmentId);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('DomainError');
			expect(result.error.code).toBe('invalid_uuid');
		});
	});

	describe('fullName', () => {
		it('returns concatenated first and last name', () => {
			const employee = EmployeeFactory.create({
				firstName: 'John',
				lastName: 'Doe'
			});

			expect(employee.fullName).toBe('John Doe');
		});
	});

	describe('isActive', () => {
		it('returns true for active employees', () => {
			const employee = EmployeeFactory.create();

			expect(employee.isActive).toBe(true);
		});

		it('returns false for inactive employees', () => {
			const employee = EmployeeFactory.createInactive();

			expect(employee.isActive).toBe(false);
		});
	});

	describe('getters', () => {
		it('return correct values', () => {
			const testDate = new Date('2020-01-15');
			testDate.setHours(0, 0, 0, 0); // Normalize to midnight

			const data = {
				id: faker.string.uuid(),
				email: 'test@example.com',
				firstName: 'John',
				lastName: 'Doe',
				hireDate: testDate,
				departmentId: faker.string.uuid(),
				jobTitle: 'Software Engineer',
				phone: '+12085551234'
			};

			const result = Employee.create(data);
			expect(result.isOk).toBe(true);

			const employee = result.value;

			expect(employee.id).toBe(data.id);
			expect(employee.email.value).toBe(data.email);
			expect(employee.name.first).toBe(data.firstName);
			expect(employee.name.last).toBe(data.lastName);
			// HireDate normalizes to midnight, so compare the time values
			expect(employee.hireDate.value.getTime()).toBe(testDate.getTime());
			expect(employee.departmentId).toBe(data.departmentId);
			expect(employee.jobTitle).toBe(data.jobTitle);
			expect(employee.phone).toBe(data.phone);
			expect(employee.status).toBe('active');
		});
	});

	describe('immutability', () => {
		it('does not mutate unexpectedly', () => {
			const employee = EmployeeFactory.create();

			const originalId = employee.id;
			const originalEmail = employee.email.value;
			const originalFirstName = employee.name.first;
			const originalLastName = employee.name.last;
			const originalHireDate = employee.hireDate.value.toISOString();
			const originalStatus = employee.status;

			// Perform some operations
			const newDeptId = faker.string.uuid();
			employee.changeDepartment(newDeptId);

			// Immutable properties should not change
			expect(employee.id).toBe(originalId);
			expect(employee.email.value).toBe(originalEmail);
			expect(employee.name.first).toBe(originalFirstName);
			expect(employee.name.last).toBe(originalLastName);
			expect(employee.hireDate.value.toISOString()).toBe(originalHireDate);
			expect(employee.status).toBe(originalStatus);

			// Mutable property should change
			expect(employee.departmentId).toBe(newDeptId);
		});
	});

	describe('status transitions', () => {
		it('allows valid status transitions', () => {
			const employee = EmployeeFactory.create();

			// Active -> Inactive
			expect(employee.isActive).toBe(true);
			const deactivateResult = employee.deactivate();
			expect(deactivateResult.isOk).toBe(true);
			expect(employee.isActive).toBe(false);

			// Inactive -> Active
			const activateResult = employee.activate();
			expect(activateResult.isOk).toBe(true);
			expect(employee.isActive).toBe(true);

			// Active -> Inactive (again)
			const secondDeactivateResult = employee.deactivate();
			expect(secondDeactivateResult.isOk).toBe(true);
			expect(employee.isActive).toBe(false);
		});
	});

	describe('updateFirstName', () => {
		it('should update first name with valid value', () => {
			const employee = EmployeeFactory.create({ firstName: 'John', lastName: 'Doe' });
			const result = employee.updateFirstName('Jane');

			expect(result.isOk).toBe(true);
			expect(employee.name.first).toBe('Jane');
			expect(employee.name.last).toBe('Doe'); // unchanged
		});

		it('should reject invalid first name (too short)', () => {
			const employee = EmployeeFactory.create();
			const result = employee.updateFirstName('');

			expect(result.isError).toBe(true);
		});
	});

	describe('updateLastName', () => {
		it('should update last name with valid value', () => {
			const employee = EmployeeFactory.create({ firstName: 'John', lastName: 'Doe' });
			const result = employee.updateLastName('Smith');

			expect(result.isOk).toBe(true);
			expect(employee.name.last).toBe('Smith');
			expect(employee.name.first).toBe('John'); // unchanged
		});

		it('should reject empty last name', () => {
			const employee = EmployeeFactory.create();
			const result = employee.updateLastName('');

			expect(result.isError).toBe(true);
		});
	});
});
