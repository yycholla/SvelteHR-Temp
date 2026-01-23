import { describe, it, expect, beforeEach } from 'vitest';
import {
	createMockUser,
	createMockEmployee,
	createMockDepartment
} from '$lib/utils/test-helpers/factories';
import type { User } from '$lib/types/domain/user';
import type { Employee } from '$lib/types/contracts/employee';
import type { Department } from '$lib/types/domain/department';

describe('Test Factories', () => {
	describe('createMockUser', () => {
		it('generates valid user with required fields', () => {
			const user: User = createMockUser();

			expect(user.id).toBeDefined();
			expect(typeof user.id).toBe('string');
			expect(user.email).toContain('@');
			expect(user.email).toContain('test.com');
			expect(user.first_name).toBeDefined();
			expect(user.last_name).toBeDefined();
			expect(user.firstName).toBeDefined();
			expect(user.lastName).toBeDefined();
			expect(user.is_active).toBe(true);
			expect(user.isActive).toBe(true);
			expect(user.created_at).toBeDefined();
		});

		it('generates unique IDs for each user', () => {
			const user1: User = createMockUser();
			const user2: User = createMockUser();
			const user3: User = createMockUser();

			expect(user1.id).not.toBe(user2.id);
			expect(user2.id).not.toBe(user3.id);
			expect(user1.id).not.toBe(user3.id);
		});

		it('generates unique emails for each user', () => {
			const user1: User = createMockUser();
			const user2: User = createMockUser();

			expect(user1.email).not.toBe(user2.email);
		});

		it('accepts overrides for all fields', () => {
			const customUser: User = createMockUser({
				email: 'custom@example.com',
				firstName: 'John',
				lastName: 'Doe',
				isActive: false
			});

			expect(customUser.email).toBe('custom@example.com');
			expect(customUser.firstName).toBe('John');
			expect(customUser.lastName).toBe('Doe');
			expect(customUser.isActive).toBe(false);
		});

		it('accepts partial overrides', () => {
			const user: User = createMockUser({ email: 'test@example.com' });

			expect(user.email).toBe('test@example.com');
			expect(user.firstName).toBe('Test');
			expect(user.lastName).toBe('User');
			expect(user.isActive).toBe(true);
		});

		it('preserves unique ID even with overrides', () => {
			const user1: User = createMockUser({ email: 'same@test.com' });
			const user2: User = createMockUser({ email: 'same@test.com' });

			expect(user1.id).not.toBe(user2.id);
		});
	});

	describe('createMockEmployee', () => {
		it('generates valid employee with required fields', () => {
			const employee: Employee = createMockEmployee();

			expect(employee.id).toBeDefined();
			expect(typeof employee.id).toBe('string');
			expect(employee.email).toContain('@');
			expect(employee.email).toContain('test.com');
			expect(employee.displayName).toBeDefined();
			expect(employee.role).toBeDefined();
			expect(employee.department).toBeDefined();
			expect(employee.startDate).toBeDefined();
			expect(employee.isActive).toBe(true);
		});

		it('generates unique IDs for each employee', () => {
			const emp1: Employee = createMockEmployee();
			const emp2: Employee = createMockEmployee();
			const emp3: Employee = createMockEmployee();

			expect(emp1.id).not.toBe(emp2.id);
			expect(emp2.id).not.toBe(emp3.id);
			expect(emp1.id).not.toBe(emp3.id);
		});

		it('generates unique emails for each employee', () => {
			const emp1: Employee = createMockEmployee();
			const emp2: Employee = createMockEmployee();

			expect(emp1.email).not.toBe(emp2.email);
		});

		it('accepts overrides for all fields', () => {
			const customEmployee: Employee = createMockEmployee({
				email: 'john.doe@company.com',
				displayName: 'John Doe',
				role: 'manager',
				department: 'Sales',
				startDate: '2021-06-15',
				isActive: false,
				contactInfo: {
					phone: '+1234567890'
				}
			});

			expect(customEmployee.email).toBe('john.doe@company.com');
			expect(customEmployee.displayName).toBe('John Doe');
			expect(customEmployee.role).toBe('manager');
			expect(customEmployee.department).toBe('Sales');
			expect(customEmployee.startDate).toBe('2021-06-15');
			expect(customEmployee.contactInfo?.phone).toBe('+1234567890');
			expect(customEmployee.isActive).toBe(false);
		});

		it('accepts partial overrides', () => {
			const employee: Employee = createMockEmployee({
				role: 'Product Manager'
			});

			expect(employee.role).toBe('Product Manager');
			expect(employee.displayName).toBe('Test Employee');
			expect(employee.department).toBe('Engineering');
			expect(employee.startDate).toBe(new Date('2020-01-15').toISOString());
		});

		it('has default start date', () => {
			const employee: Employee = createMockEmployee();

			expect(employee.startDate).toBe(new Date('2020-01-15').toISOString());
		});
	});

	describe('createMockDepartment', () => {
		it('generates valid department with required fields', () => {
			const department: Department = createMockDepartment();

			expect(department.id).toBeDefined();
			expect(typeof department.id).toBe('string');
			expect(department.name).toBeDefined();
			expect(department.name).toContain('Department');
			expect(department.code).toBeDefined();
			expect(department.description).toBeDefined();
			expect(department.childDepartments).toEqual([]);
			expect(department.employees).toEqual([]);
			expect(department.employeeCount).toBe(0);
			expect(department.isActive).toBe(true);
			expect(department.createdAt).toBeDefined();
			expect(department.updatedAt).toBeDefined();
		});

		it('generates unique IDs for each department', () => {
			const dept1: Department = createMockDepartment();
			const dept2: Department = createMockDepartment();
			const dept3: Department = createMockDepartment();

			expect(dept1.id).not.toBe(dept2.id);
			expect(dept2.id).not.toBe(dept3.id);
			expect(dept1.id).not.toBe(dept3.id);
		});

		it('generates unique names for each department', () => {
			const dept1: Department = createMockDepartment();
			const dept2: Department = createMockDepartment();

			expect(dept1.name).not.toBe(dept2.name);
		});

		it('accepts overrides for all fields', () => {
			const customDept: Department = createMockDepartment({
				name: 'Engineering',
				code: 'ENG',
				description: 'Software Engineering Department',
				managerId: 'user-123'
			});

			expect(customDept.name).toBe('Engineering');
			expect(customDept.code).toBe('ENG');
			expect(customDept.description).toBe('Software Engineering Department');
			expect(customDept.managerId).toBe('user-123');
		});

		it('accepts partial overrides', () => {
			const department: Department = createMockDepartment({
				name: 'Sales'
			});

			expect(department.name).toBe('Sales');
			expect(department.description).toBe('Test department');
			expect(department.managerId).toBeUndefined();
		});
	});

	describe('Factory independence', () => {
		it('each factory maintains its own unique ID sequence', () => {
			const user: User = createMockUser();
			const employee: Employee = createMockEmployee();
			const department: Department = createMockDepartment();

			// All should have different IDs
			expect(user.id).not.toBe(employee.id);
			expect(employee.id).not.toBe(department.id);
			expect(user.id).not.toBe(department.id);

			// All should start with 'test-' prefix
			expect(user.id).toContain('test-');
			expect(employee.id).toContain('test-');
			expect(department.id).toContain('test-');
		});

		it('factories can be called in any order', () => {
			const dept1: Department = createMockDepartment();
			const user1: User = createMockUser();
			const emp1: Employee = createMockEmployee();
			const dept2: Department = createMockDepartment();
			const user2: User = createMockUser();

			const ids = [dept1.id, user1.id, emp1.id, dept2.id, user2.id];
			const uniqueIds = new Set(ids);

			expect(uniqueIds.size).toBe(5);
		});
	});
});
