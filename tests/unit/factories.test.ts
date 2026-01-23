// tests/unit/factories.test.ts
import { describe, it, expect } from 'vitest';
import { EmployeeFactory } from '../helpers/factories';

describe('EmployeeFactory', () => {
	describe('create', () => {
		it('creates employee with generated data', () => {
			const employee = EmployeeFactory.create();

			expect(employee.id).toBeTruthy();
			expect(employee.email.value).toMatch(/@/);
			expect(employee.fullName).toBeTruthy();
			expect(employee.isActive).toBe(true);
		});

		it('allows overriding email', () => {
			const employee = EmployeeFactory.create({
				email: 'test@example.com'
			});

			expect(employee.email.value).toBe('test@example.com');
		});

		it('allows overriding name', () => {
			const employee = EmployeeFactory.create({
				firstName: 'Alice',
				lastName: 'Smith'
			});

			expect(employee.fullName).toBe('Alice Smith');
		});
	});

	describe('createMany', () => {
		it('creates multiple employees', () => {
			const employees = EmployeeFactory.createMany(5);

			expect(employees).toHaveLength(5);
			expect(employees[0].id).not.toBe(employees[1].id);
		});
	});

	describe('createInactive', () => {
		it('creates inactive employee', () => {
			const employee = EmployeeFactory.createInactive();

			expect(employee.isActive).toBe(false);
		});
	});
});
