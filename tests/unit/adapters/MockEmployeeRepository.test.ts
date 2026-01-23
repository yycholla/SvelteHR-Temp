// tests/unit/adapters/MockEmployeeRepository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MockEmployeeRepository } from '$adapters/MockEmployeeRepository';
import { EmployeeFactory } from '../../helpers/factories';

describe('MockEmployeeRepository', () => {
	let repo: MockEmployeeRepository;

	beforeEach(() => {
		repo = new MockEmployeeRepository();
	});

	describe('save', () => {
		it('stores employee', async () => {
			const employee = EmployeeFactory.create();
			const saved = await repo.save(employee);

			expect(saved).toBe(employee);
		});
	});

	describe('findById', () => {
		it('returns employee when found', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			const found = await repo.findById(employee.id);

			expect(found).toBe(employee);
		});

		it('returns null when not found', async () => {
			const found = await repo.findById('nonexistent-id');

			expect(found).toBe(null);
		});
	});

	describe('findByEmail', () => {
		it('returns employee with matching email', async () => {
			const employee = EmployeeFactory.create({ email: 'test@example.com' });
			await repo.save(employee);

			const found = await repo.findByEmail('test@example.com');

			expect(found).toBe(employee);
		});

		it('returns null when not found', async () => {
			const found = await repo.findByEmail('nonexistent@example.com');

			expect(found).toBe(null);
		});
	});

	describe('findAll', () => {
		it('returns all employees', async () => {
			const employees = EmployeeFactory.createMany(3);
			for (const emp of employees) {
				await repo.save(emp);
			}

			const result = await repo.findAll();

			expect(result.employees).toHaveLength(3);
			expect(result.total).toBe(3);
		});

		it('filters by departmentId', async () => {
			const deptId1 = '123e4567-e89b-12d3-a456-426614174000';
			const deptId2 = '223e4567-e89b-12d3-a456-426614174000';
			const dept1 = EmployeeFactory.createWithDepartment(deptId1);
			const dept2 = EmployeeFactory.createWithDepartment(deptId2);
			await repo.save(dept1);
			await repo.save(dept2);

			const result = await repo.findAll({ departmentId: deptId1 });

			expect(result.employees).toHaveLength(1);
			expect(result.employees[0].id).toBe(dept1.id);
		});

		it('filters by isActive', async () => {
			const active = EmployeeFactory.create();
			const inactive = EmployeeFactory.createInactive();
			await repo.save(active);
			await repo.save(inactive);

			const result = await repo.findAll({ isActive: true });

			expect(result.employees).toHaveLength(1);
			expect(result.employees[0].id).toBe(active.id);
		});

		it('filters by searchTerm in name', async () => {
			const john = EmployeeFactory.create({ firstName: 'John', lastName: 'Doe' });
			const jane = EmployeeFactory.create({ firstName: 'Jane', lastName: 'Smith' });
			await repo.save(john);
			await repo.save(jane);

			const result = await repo.findAll({ searchTerm: 'john' });

			expect(result.employees).toHaveLength(1);
			expect(result.employees[0].id).toBe(john.id);
		});

		it('filters by searchTerm in email', async () => {
			const emp = EmployeeFactory.create({ email: 'unique@example.com' });
			await repo.save(emp);

			const result = await repo.findAll({ searchTerm: 'unique' });

			expect(result.employees).toHaveLength(1);
			expect(result.employees[0].id).toBe(emp.id);
		});

		it('combines multiple filters', async () => {
			const deptId = '123e4567-e89b-12d3-a456-426614174000';
			const active = EmployeeFactory.create({
				firstName: 'John',
				departmentId: deptId
			});
			const inactive = EmployeeFactory.createInactive({
				firstName: 'Jane',
				departmentId: deptId
			});
			await repo.save(active);
			await repo.save(inactive);

			const result = await repo.findAll({
				departmentId: deptId,
				isActive: true,
				searchTerm: 'john'
			});

			expect(result.employees).toHaveLength(1);
			expect(result.employees[0].id).toBe(active.id);
		});
	});

	describe('exists', () => {
		it('returns true when employee exists', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			const exists = await repo.exists(employee.id);

			expect(exists).toBe(true);
		});

		it('returns false when employee does not exist', async () => {
			const exists = await repo.exists('nonexistent-id');

			expect(exists).toBe(false);
		});
	});

	describe('update', () => {
		it('updates existing employee', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			// Modify the employee
			const updateResult = employee.updateJobTitle('Senior Developer');
			expect(updateResult.isOk).toBe(true);

			const result = await repo.update(employee.id, employee);

			expect(result.jobTitle).toBe('Senior Developer');
			expect(result.id).toBe(employee.id);
		});

		it('throws when updating non-existent employee', async () => {
			const employee = EmployeeFactory.create();

			await expect(repo.update('nonexistent-id', employee)).rejects.toThrow('not found');
		});

		it('throws when ID mismatch', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			const different = EmployeeFactory.create();

			await expect(repo.update(employee.id, different)).rejects.toThrow('ID mismatch');
		});
	});

	describe('delete', () => {
		it('removes employee', async () => {
			const employee = EmployeeFactory.create();
			await repo.save(employee);

			await repo.delete(employee.id);
			const found = await repo.findById(employee.id);

			expect(found).toBe(null);
		});
	});

	describe('findAll with advanced filtering', () => {
		describe('sorting', () => {
			it('sorts by name ascending', async () => {
				const alice = EmployeeFactory.create({ firstName: 'Alice', lastName: 'Smith' });
				const bob = EmployeeFactory.create({ firstName: 'Bob', lastName: 'Jones' });
				const charlie = EmployeeFactory.create({ firstName: 'Charlie', lastName: 'Adams' });
				await repo.save(bob);
				await repo.save(charlie);
				await repo.save(alice);

				const result = await repo.findAll({ sortBy: 'name', sortOrder: 'asc' });

				expect(result.employees[0].name.first).toBe('Alice');
				expect(result.employees[1].name.first).toBe('Bob');
				expect(result.employees[2].name.first).toBe('Charlie');
			});

			it('sorts by name descending', async () => {
				const alice = EmployeeFactory.create({ firstName: 'Alice', lastName: 'Smith' });
				const bob = EmployeeFactory.create({ firstName: 'Bob', lastName: 'Jones' });
				const charlie = EmployeeFactory.create({ firstName: 'Charlie', lastName: 'Adams' });
				await repo.save(bob);
				await repo.save(charlie);
				await repo.save(alice);

				const result = await repo.findAll({ sortBy: 'name', sortOrder: 'desc' });

				expect(result.employees[0].name.first).toBe('Charlie');
				expect(result.employees[1].name.first).toBe('Bob');
				expect(result.employees[2].name.first).toBe('Alice');
			});

			it('sorts by email ascending', async () => {
				const emp1 = EmployeeFactory.create({ email: 'charlie@example.com' });
				const emp2 = EmployeeFactory.create({ email: 'alice@example.com' });
				const emp3 = EmployeeFactory.create({ email: 'bob@example.com' });
				await repo.save(emp1);
				await repo.save(emp2);
				await repo.save(emp3);

				const result = await repo.findAll({ sortBy: 'email', sortOrder: 'asc' });

				expect(result.employees[0].email.value).toBe('alice@example.com');
				expect(result.employees[1].email.value).toBe('bob@example.com');
				expect(result.employees[2].email.value).toBe('charlie@example.com');
			});

			it('sorts by hireDate ascending (oldest first)', async () => {
				const emp1 = EmployeeFactory.create({ hireDate: new Date('2024-03-01T00:00:00Z') });
				const emp2 = EmployeeFactory.create({ hireDate: new Date('2024-01-01T00:00:00Z') });
				const emp3 = EmployeeFactory.create({ hireDate: new Date('2024-02-01T00:00:00Z') });
				await repo.save(emp1);
				await repo.save(emp2);
				await repo.save(emp3);

				const result = await repo.findAll({ sortBy: 'hireDate', sortOrder: 'asc' });

				expect(result.employees[0].hireDate.value.getTime()).toBeLessThan(
					result.employees[1].hireDate.value.getTime()
				);
				expect(result.employees[1].hireDate.value.getTime()).toBeLessThan(
					result.employees[2].hireDate.value.getTime()
				);
			});

			it('sorts by hireDate descending (newest first)', async () => {
				const emp1 = EmployeeFactory.create({ hireDate: new Date('2024-01-01T00:00:00Z') });
				const emp2 = EmployeeFactory.create({ hireDate: new Date('2024-03-01T00:00:00Z') });
				const emp3 = EmployeeFactory.create({ hireDate: new Date('2024-02-01T00:00:00Z') });
				await repo.save(emp1);
				await repo.save(emp2);
				await repo.save(emp3);

				const result = await repo.findAll({ sortBy: 'hireDate', sortOrder: 'desc' });

				expect(result.employees[0].hireDate.value.getTime()).toBeGreaterThan(
					result.employees[1].hireDate.value.getTime()
				);
				expect(result.employees[1].hireDate.value.getTime()).toBeGreaterThan(
					result.employees[2].hireDate.value.getTime()
				);
			});

			it('sorts by jobTitle ascending', async () => {
				const emp1 = EmployeeFactory.create({ jobTitle: 'Senior Engineer' });
				const emp2 = EmployeeFactory.create({ jobTitle: 'Engineer' });
				const emp3 = EmployeeFactory.create({ jobTitle: 'Manager' });
				await repo.save(emp1);
				await repo.save(emp2);
				await repo.save(emp3);

				const result = await repo.findAll({ sortBy: 'jobTitle', sortOrder: 'asc' });

				expect(result.employees[0].jobTitle).toBe('Engineer');
				expect(result.employees[1].jobTitle).toBe('Manager');
				expect(result.employees[2].jobTitle).toBe('Senior Engineer');
			});

			it('handles null jobTitle when sorting', async () => {
				const emp1 = EmployeeFactory.create({ jobTitle: 'Engineer' });
				const emp2 = EmployeeFactory.create({ jobTitle: null });
				const emp3 = EmployeeFactory.create({ jobTitle: 'Manager' });
				await repo.save(emp1);
				await repo.save(emp2);
				await repo.save(emp3);

				const result = await repo.findAll({ sortBy: 'jobTitle', sortOrder: 'asc' });

				// Null values should appear last
				expect(result.employees[2].jobTitle).toBe(null);
			});

			it('handles null jobTitle when sorting descending', async () => {
				const emp1 = EmployeeFactory.create({ jobTitle: 'Senior Engineer' });
				const emp2 = EmployeeFactory.create({ jobTitle: null });
				const emp3 = EmployeeFactory.create({ jobTitle: 'Engineer' });
				const emp4 = EmployeeFactory.create({ jobTitle: null });

				await repo.save(emp1);
				await repo.save(emp2);
				await repo.save(emp3);
				await repo.save(emp4);

				const result = await repo.findAll({ sortBy: 'jobTitle', sortOrder: 'desc' });

				// Null values should appear last even in descending order (industry standard)
				expect(result.employees[0].jobTitle).toBe('Senior Engineer');
				expect(result.employees[1].jobTitle).toBe('Engineer');
				expect(result.employees[2].jobTitle).toBe(null);
				expect(result.employees[3].jobTitle).toBe(null);
				expect(result.total).toBe(4);
			});

			it('defaults to name ascending when no sort specified', async () => {
				const bob = EmployeeFactory.create({ firstName: 'Bob', lastName: 'Smith' });
				const alice = EmployeeFactory.create({ firstName: 'Alice', lastName: 'Jones' });
				await repo.save(bob);
				await repo.save(alice);

				const result = await repo.findAll({});

				expect(result.employees[0].name.first).toBe('Alice');
				expect(result.employees[1].name.first).toBe('Bob');
			});
		});

		describe('pagination', () => {
			beforeEach(async () => {
				// Create 10 employees
				for (let i = 0; i < 10; i++) {
					const emp = EmployeeFactory.create({
						firstName: `Employee${i}`,
						email: `emp${i}@example.com`
					});
					await repo.save(emp);
				}
			});

			it('returns first page with limit', async () => {
				const result = await repo.findAll({ limit: 5, offset: 0 });

				expect(result.employees).toHaveLength(5);
				expect(result.total).toBe(10);
				expect(result.limit).toBe(5);
				expect(result.offset).toBe(0);
			});

			it('returns second page with limit and offset', async () => {
				const result = await repo.findAll({ limit: 5, offset: 5 });

				expect(result.employees).toHaveLength(5);
				expect(result.total).toBe(10);
				expect(result.limit).toBe(5);
				expect(result.offset).toBe(5);
			});

			it('returns partial results when offset exceeds total minus limit', async () => {
				const result = await repo.findAll({ limit: 5, offset: 8 });

				expect(result.employees).toHaveLength(2);
				expect(result.total).toBe(10);
			});

			it('returns empty array when offset exceeds total', async () => {
				const result = await repo.findAll({ limit: 5, offset: 20 });

				expect(result.employees).toHaveLength(0);
				expect(result.total).toBe(10);
			});

			it('returns all results when no limit specified', async () => {
				const result = await repo.findAll({});

				expect(result.employees).toHaveLength(10);
				expect(result.total).toBe(10);
				expect(result.limit).toBe(10);
				expect(result.offset).toBe(0);
			});
		});

		describe('combined filters, sorting, and pagination', () => {
			beforeEach(async () => {
				const deptId = '123e4567-e89b-12d3-a456-426614174000';
				// Create employees with varying attributes
				await repo.save(
					EmployeeFactory.create({
						firstName: 'Alice',
						lastName: 'Johnson',
						email: 'alice@example.com',
						departmentId: deptId,
						hireDate: '2024-01-01'
					})
				);
				await repo.save(
					EmployeeFactory.create({
						firstName: 'Bob',
						lastName: 'Smith',
						email: 'bob@example.com',
						departmentId: deptId,
						hireDate: '2024-02-01'
					})
				);
				await repo.save(
					EmployeeFactory.createInactive({
						firstName: 'Charlie',
						lastName: 'Davis',
						email: 'charlie@example.com',
						departmentId: deptId,
						hireDate: '2024-03-01'
					})
				);
				await repo.save(
					EmployeeFactory.create({
						firstName: 'David',
						lastName: 'Wilson',
						email: 'david@example.com',
						departmentId: '223e4567-e89b-12d3-a456-426614174000',
						hireDate: '2024-04-01'
					})
				);
			});

			it('filters, sorts, and paginates together', async () => {
				const result = await repo.findAll({
					departmentId: '123e4567-e89b-12d3-a456-426614174000',
					isActive: true,
					sortBy: 'name',
					sortOrder: 'asc',
					limit: 1,
					offset: 0
				});

				expect(result.employees).toHaveLength(1);
				expect(result.employees[0].name.first).toBe('Alice');
				expect(result.total).toBe(2); // Only 2 active in department
			});

			it('search works with sorting', async () => {
				const result = await repo.findAll({
					searchTerm: 'alice',
					sortBy: 'email',
					sortOrder: 'asc'
				});

				expect(result.employees).toHaveLength(1);
				expect(result.employees[0].email.value).toBe('alice@example.com');
			});

			it('total count reflects filtered results, not all employees', async () => {
				const result = await repo.findAll({
					isActive: false,
					limit: 10,
					offset: 0
				});

				expect(result.total).toBe(1); // Only 1 inactive employee
				expect(result.employees).toHaveLength(1);
			});
		});

		describe('result structure', () => {
			it('returns EmployeeListResult with correct structure', async () => {
				const emp = EmployeeFactory.create();
				await repo.save(emp);

				const result = await repo.findAll({});

				expect(result).toHaveProperty('employees');
				expect(result).toHaveProperty('total');
				expect(result).toHaveProperty('limit');
				expect(result).toHaveProperty('offset');
				expect(Array.isArray(result.employees)).toBe(true);
			});
		});
	});
});
