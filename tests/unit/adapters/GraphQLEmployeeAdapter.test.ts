import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphQLEmployeeAdapter } from '$adapters/GraphQLEmployeeAdapter';
import { EmployeeFactory } from '../../helpers/factories';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

describe('GraphQLEmployeeAdapter', () => {
	let adapter: GraphQLEmployeeAdapter;
	let mockGraphQL: GraphQLPort;

	beforeEach(() => {
		// Mock GraphQLPort
		mockGraphQL = {
			query: vi.fn(),
			mutation: vi.fn()
		};

		adapter = new GraphQLEmployeeAdapter(mockGraphQL);
	});

	describe('findById', () => {
		it('returns employee when found', async () => {
			const employee = EmployeeFactory.create();

			// Mock GraphQL response
			mockGraphQL.query = vi.fn().mockResolvedValue({
				user: {
					id: employee.id,
					email: employee.email.value,
					firstName: employee.name.first,
					lastName: employee.name.last,
					hireDate: employee.hireDate.value.toISOString(),
					departmentId: employee.departmentId,
					jobTitle: employee.jobTitle,
					phone: employee.phone,
					isActive: employee.isActive
				}
			});

			const result = await adapter.findById(employee.id);

			expect(result).not.toBeNull();
			expect(result!.id).toBe(employee.id);
			expect(result!.email.value).toBe(employee.email.value);
		});

		it('returns null when not found', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({ user: null });

			const result = await adapter.findById('nonexistent');

			expect(result).toBeNull();
		});

		it('throws on GraphQL error', async () => {
			mockGraphQL.query = vi.fn().mockRejectedValue(new Error('Network error'));

			await expect(adapter.findById('test-id')).rejects.toThrow('Network error');
		});

		it('correctly maps inactive employee status', async () => {
			const employee = EmployeeFactory.createInactive();

			mockGraphQL.query = vi.fn().mockResolvedValue({
				user: {
					id: employee.id,
					email: employee.email.value,
					firstName: employee.name.first,
					lastName: employee.name.last,
					hireDate: employee.hireDate.value.toISOString(),
					departmentId: employee.departmentId,
					jobTitle: employee.jobTitle,
					phone: employee.phone,
					isActive: false
				}
			});

			const result = await adapter.findById(employee.id);

			expect(result).not.toBeNull();
			expect(result!.isActive).toBe(false);
		});

		it('returns null when GraphQL returns invalid employee data (resilient boundary)', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				user: {
					id: 'test-id',
					email: 'invalid-email', // Invalid email format
					firstName: 'John',
					lastName: 'Doe',
					hireDate: '2024-01-01',
					departmentId: null,
					jobTitle: null,
					phone: null,
					isActive: true
				}
			});

			// Adapter should skip invalid records instead of throwing
			const result = await adapter.findById('test-id');
			expect(result).toBeNull();
		});

		it('returns null when hire date is in the future (data integrity boundary)', async () => {
			const employee = EmployeeFactory.create();
			const futureDate = new Date();
			futureDate.setFullYear(futureDate.getFullYear() + 1);

			mockGraphQL.query = vi.fn().mockResolvedValue({
				user: {
					id: employee.id,
					email: employee.email.value,
					firstName: employee.name.first,
					lastName: employee.name.last,
					hireDate: futureDate.toISOString(), // Future date - should cause null return
					departmentId: employee.departmentId,
					jobTitle: employee.jobTitle,
					phone: employee.phone,
					isActive: true
				}
			});

			const result = await adapter.findById(employee.id);
			expect(result).toBeNull();
		});

		it('sanitizes invalid phone numbers to null (data integrity boundary)', async () => {
			const employee = EmployeeFactory.create();

			mockGraphQL.query = vi.fn().mockResolvedValue({
				user: {
					id: employee.id,
					email: employee.email.value,
					firstName: employee.name.first,
					lastName: employee.name.last,
					hireDate: employee.hireDate.value.toISOString(),
					departmentId: employee.departmentId,
					jobTitle: employee.jobTitle,
					phone: '1805 E Overland Rd, Boise, ID 83705', // Address, not phone
					isActive: true
				}
			});

			const result = await adapter.findById(employee.id);
			// Employee should be created but phone should be null
			expect(result).not.toBeNull();
			expect(result!.phone).toBeNull();
		});

		it('accepts valid phone numbers', async () => {
			const employee = EmployeeFactory.create();

			mockGraphQL.query = vi.fn().mockResolvedValue({
				user: {
					id: employee.id,
					email: employee.email.value,
					firstName: employee.name.first,
					lastName: employee.name.last,
					hireDate: employee.hireDate.value.toISOString(),
					departmentId: employee.departmentId,
					jobTitle: employee.jobTitle,
					phone: '+12085551234',
					isActive: true
				}
			});

			const result = await adapter.findById(employee.id);
			expect(result).not.toBeNull();
			expect(result!.phone).toBe('+12085551234');
		});
	});

	describe('findByEmail', () => {
		it('returns employee with matching email', async () => {
			const employee = EmployeeFactory.create({ email: 'test@example.com' });

			// Note: Now uses userByEmail query
			mockGraphQL.query = vi.fn().mockResolvedValue({
				userByEmail: {
					id: employee.id,
					email: employee.email.value,
					firstName: employee.name.first,
					lastName: employee.name.last,
					hireDate: employee.hireDate.value.toISOString(),
					departmentId: employee.departmentId,
					jobTitle: employee.jobTitle,
					phone: employee.phone,
					isActive: employee.isActive,
					roles: []
				}
			});

			const result = await adapter.findByEmail('test@example.com');

			expect(result).not.toBeNull();
			expect(result!.email.value).toBe('test@example.com');
		});

		it('returns null when not found', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({ userByEmail: null });

			const result = await adapter.findByEmail('nonexistent@example.com');

			expect(result).toBeNull();
		});

		it('filters case-insensitively', async () => {
			const employee = EmployeeFactory.create({ email: 'TEST@EXAMPLE.COM' });

			mockGraphQL.query = vi.fn().mockResolvedValue({
				userByEmail: {
					id: employee.id,
					email: 'TEST@EXAMPLE.COM',
					firstName: employee.name.first,
					lastName: employee.name.last,
					hireDate: employee.hireDate.value.toISOString(),
					departmentId: employee.departmentId,
					jobTitle: employee.jobTitle,
					phone: employee.phone,
					isActive: employee.isActive,
					roles: []
				}
			});

			// Should find with lowercase query
			const result = await adapter.findByEmail('test@example.com');

			expect(result).not.toBeNull();
			expect(result!.email.value).toBe('test@example.com'); // Value object normalizes to lowercase
		});
	});

	describe('save', () => {
		it('creates employee via GraphQL mutation', async () => {
			const employee = EmployeeFactory.create();

			mockGraphQL.mutation = vi.fn().mockResolvedValue({
				users: {
					createUser: {
						id: employee.id,
						email: employee.email.value,
						firstName: employee.name.first,
						lastName: employee.name.last,
						hireDate: employee.hireDate.value.toISOString(),
						departmentId: employee.departmentId,
						jobTitle: employee.jobTitle,
						phone: employee.phone,
						isActive: employee.isActive
					}
				}
			});

			const result = await adapter.save(employee);

			expect(result.id).toBe(employee.id);
			expect(mockGraphQL.mutation).toHaveBeenCalled();
		});

		it('throws on GraphQL error', async () => {
			const employee = EmployeeFactory.create();

			mockGraphQL.mutation = vi.fn().mockRejectedValue(new Error('Database error'));

			await expect(adapter.save(employee)).rejects.toThrow('Database error');
		});

		it('throws when mutation returns no data', async () => {
			const employee = EmployeeFactory.create();

			mockGraphQL.mutation = vi.fn().mockResolvedValue(null);

			await expect(adapter.save(employee)).rejects.toThrow('Create user mutation returned no data');
		});
	});

	describe('update', () => {
		it('updates employee via GraphQL mutation', async () => {
			const employee = EmployeeFactory.create();

			mockGraphQL.mutation = vi.fn().mockResolvedValue({
				users: {
					updateUser: {
						id: employee.id,
						email: employee.email.value,
						firstName: employee.name.first,
						lastName: employee.name.last,
						hireDate: employee.hireDate.value.toISOString(),
						departmentId: employee.departmentId,
						jobTitle: employee.jobTitle,
						phone: employee.phone,
						isActive: employee.isActive
					}
				}
			});

			const result = await adapter.update(employee.id, employee);

			expect(result.id).toBe(employee.id);
			expect(mockGraphQL.mutation).toHaveBeenCalled();
		});

		it('throws on ID mismatch', async () => {
			const employee = EmployeeFactory.create();

			await expect(adapter.update('different-id', employee)).rejects.toThrow('ID mismatch');
		});

		it('throws on GraphQL error', async () => {
			const employee = EmployeeFactory.create();

			mockGraphQL.mutation = vi.fn().mockRejectedValue(new Error('Update failed'));

			await expect(adapter.update(employee.id, employee)).rejects.toThrow('Update failed');
		});

		it('throws when mutation returns no data', async () => {
			const employee = EmployeeFactory.create();

			mockGraphQL.mutation = vi.fn().mockResolvedValue(null);

			await expect(adapter.update(employee.id, employee)).rejects.toThrow(
				'Update user mutation returned no data'
			);
		});
	});

	describe('delete', () => {
		it('deletes employee via GraphQL mutation', async () => {
			mockGraphQL.mutation = vi.fn().mockResolvedValue({ deleteUser: true });

			await adapter.delete('test-id');

			expect(mockGraphQL.mutation).toHaveBeenCalled();
		});

		it('throws on GraphQL error', async () => {
			mockGraphQL.mutation = vi.fn().mockRejectedValue(new Error('Delete failed'));

			await expect(adapter.delete('test-id')).rejects.toThrow('Delete failed');
		});
	});

	describe('findAll', () => {
		it('returns all employees', async () => {
			const employees = EmployeeFactory.createMany(2);

			// Note: Backend uses simple users array, filtering done client-side
			mockGraphQL.query = vi.fn().mockResolvedValue({
				users: employees.map((emp) => ({
					id: emp.id,
					email: emp.email.value,
					firstName: emp.name.first,
					lastName: emp.name.last,
					hireDate: emp.hireDate.value.toISOString(),
					departmentId: emp.departmentId,
					jobTitle: emp.jobTitle,
					phone: emp.phone,
					isActive: emp.isActive,
					roles: []
				}))
			});

			const result = await adapter.findAll();

			expect(result.employees).toHaveLength(2);
			expect(result.total).toBe(2);
		});

		it('filters by departmentId (client-side)', async () => {
			const deptId1 = '550e8400-e29b-41d4-a716-446655440001';
			const deptId2 = '550e8400-e29b-41d4-a716-446655440002';
			const emp1 = EmployeeFactory.create({ departmentId: deptId1 });
			const emp2 = EmployeeFactory.create({ departmentId: deptId2 });

			const allUsers = [
				{
					id: emp1.id,
					email: emp1.email.value,
					firstName: emp1.name.first,
					lastName: emp1.name.last,
					hireDate: emp1.hireDate.value.toISOString(),
					departmentId: deptId1,
					jobTitle: emp1.jobTitle,
					phone: emp1.phone,
					isActive: emp1.isActive,
					roles: []
				},
				{
					id: emp2.id,
					email: emp2.email.value,
					firstName: emp2.name.first,
					lastName: emp2.name.last,
					hireDate: emp2.hireDate.value.toISOString(),
					departmentId: deptId2,
					jobTitle: emp2.jobTitle,
					phone: emp2.phone,
					isActive: emp2.isActive,
					roles: []
				}
			];

			mockGraphQL.query = vi.fn().mockResolvedValue({ users: allUsers });

			const result = await adapter.findAll({ departmentId: deptId1 });

			expect(result.employees).toHaveLength(1);
			expect(result.employees[0].departmentId).toBe(deptId1);
		});

		it('filters by isActive (client-side)', async () => {
			const activeEmp = EmployeeFactory.create();
			const inactiveEmp = EmployeeFactory.createInactive();

			const allUsers = [
				{
					id: activeEmp.id,
					email: activeEmp.email.value,
					firstName: activeEmp.name.first,
					lastName: activeEmp.name.last,
					hireDate: activeEmp.hireDate.value.toISOString(),
					departmentId: activeEmp.departmentId,
					jobTitle: activeEmp.jobTitle,
					phone: activeEmp.phone,
					isActive: true,
					roles: []
				},
				{
					id: inactiveEmp.id,
					email: inactiveEmp.email.value,
					firstName: inactiveEmp.name.first,
					lastName: inactiveEmp.name.last,
					hireDate: inactiveEmp.hireDate.value.toISOString(),
					departmentId: inactiveEmp.departmentId,
					jobTitle: inactiveEmp.jobTitle,
					phone: inactiveEmp.phone,
					isActive: false,
					roles: []
				}
			];

			mockGraphQL.query = vi.fn().mockResolvedValue({ users: allUsers });

			const result = await adapter.findAll({ isActive: true });

			expect(result.employees).toHaveLength(1);
			expect(result.employees[0].isActive).toBe(true);
		});

		it('filters by searchTerm (client-side)', async () => {
			const johnDoe = EmployeeFactory.create({
				firstName: 'John',
				lastName: 'Doe',
				email: 'john.doe@example.com'
			});
			const janeSmith = EmployeeFactory.create({
				firstName: 'Jane',
				lastName: 'Smith',
				email: 'jane.smith@example.com'
			});

			const allUsers = [
				{
					id: johnDoe.id,
					email: johnDoe.email.value,
					firstName: 'John',
					lastName: 'Doe',
					hireDate: johnDoe.hireDate.value.toISOString(),
					departmentId: johnDoe.departmentId,
					jobTitle: johnDoe.jobTitle,
					phone: johnDoe.phone,
					isActive: johnDoe.isActive,
					roles: []
				},
				{
					id: janeSmith.id,
					email: janeSmith.email.value,
					firstName: 'Jane',
					lastName: 'Smith',
					hireDate: janeSmith.hireDate.value.toISOString(),
					departmentId: janeSmith.departmentId,
					jobTitle: janeSmith.jobTitle,
					phone: janeSmith.phone,
					isActive: janeSmith.isActive,
					roles: []
				}
			];

			mockGraphQL.query = vi.fn().mockImplementation((query, variables) => {
				const searchTerm = variables.filter?.searchTerm?.toLowerCase() || '';
				const filtered = allUsers.filter((user) => {
					const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
					const email = user.email.toLowerCase();
					return fullName.includes(searchTerm) || email.includes(searchTerm);
				});
				return { users: filtered };
			});

			const result = await adapter.findAll({ searchTerm: 'john' });

			expect(result.employees).toHaveLength(1);
			expect(result.employees[0].fullName).toContain('John');
		});

		it('applies pagination (client-side)', async () => {
			const employees = EmployeeFactory.createMany(5);

			const allUsers = employees.map((emp) => ({
				id: emp.id,
				email: emp.email.value,
				firstName: emp.name.first,
				lastName: emp.name.last,
				hireDate: emp.hireDate.value.toISOString(),
				departmentId: emp.departmentId,
				jobTitle: emp.jobTitle,
				phone: emp.phone,
				isActive: emp.isActive,
				roles: []
			}));

			mockGraphQL.query = vi.fn().mockResolvedValue({ users: allUsers });

			const result = await adapter.findAll({ limit: 2, offset: 1 });

			expect(result.employees).toHaveLength(2);
			// Adapter returns total as employees.length after mapping all received users (5)
			expect(result.total).toBe(5);
			expect(result.limit).toBe(2);
			expect(result.offset).toBe(1);
		});

		it('throws on GraphQL error', async () => {
			mockGraphQL.query = vi.fn().mockRejectedValue(new Error('Query failed'));

			await expect(adapter.findAll()).rejects.toThrow('Query failed');
		});
	});

	describe('exists', () => {
		it('returns true when employee exists', async () => {
			const employee = EmployeeFactory.create();

			mockGraphQL.query = vi.fn().mockResolvedValue({
				user: {
					id: employee.id,
					email: employee.email.value,
					firstName: employee.name.first,
					lastName: employee.name.last,
					hireDate: employee.hireDate.value.toISOString(),
					departmentId: employee.departmentId,
					jobTitle: employee.jobTitle,
					phone: employee.phone,
					isActive: employee.isActive
				}
			});

			const result = await adapter.exists(employee.id);

			expect(result).toBe(true);
		});

		it('returns false when employee does not exist', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({ user: null });

			const result = await adapter.exists('nonexistent');

			expect(result).toBe(false);
		});
	});
});
