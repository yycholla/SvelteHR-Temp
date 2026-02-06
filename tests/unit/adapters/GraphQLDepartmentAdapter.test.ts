// tests/unit/adapters/GraphQLDepartmentAdapter.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphQLDepartmentAdapter } from '$adapters/GraphQLDepartmentAdapter';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import { Department } from '$domain/Department';
import type { FindDepartmentsFilter } from '$domain/Department';

describe('GraphQLDepartmentAdapter', () => {
	let adapter: GraphQLDepartmentAdapter;
	let mockGraphQL: GraphQLPort;

	beforeEach(() => {
		// Mock GraphQLPort
		mockGraphQL = {
			query: vi.fn(),
			mutation: vi.fn()
		};

		adapter = new GraphQLDepartmentAdapter(mockGraphQL);
	});

	describe('findById', () => {
		it('should return department when found', async () => {
			const mockDepartment = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering',
				description: 'Software Development',
				managerId: '223e4567-e89b-12d3-a456-426614174000',
				parentDepartmentId: null,
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z',
				deletedAt: null
			};

			mockGraphQL.query = vi.fn().mockResolvedValue({
				department: mockDepartment
			});

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).not.toBeNull();
			expect(result.value?.id).toBe(mockDepartment.id);
			expect(result.value?.name.value).toBe(mockDepartment.name);
		});

		it('should return null when department not found', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				department: null
			});

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return error when GraphQL query fails', async () => {
			mockGraphQL.query = vi.fn().mockRejectedValue(new Error('Network error'));

			const result = await adapter.findById('invalid-id');

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('GRAPHQL_QUERY_ERROR');
		});
	});

	describe('findAll', () => {
		it('should return all departments', async () => {
			const mockDepartments = [
				{
					id: '123e4567-e89b-12d3-a456-426614174001',
					name: 'Engineering',
					description: 'Software Development',
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				},
				{
					id: '123e4567-e89b-12d3-a456-426614174002',
					name: 'Marketing',
					description: 'Brand and Marketing',
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				}
			];

			mockGraphQL.query = vi.fn().mockResolvedValue({
				departments: mockDepartments
			});

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value.departments).toHaveLength(2);
			expect(result.value.total).toBe(2);
		});

		it('should apply search filter', async () => {
			const mockDepartments = [
				{
					id: '123e4567-e89b-12d3-a456-426614174001',
					name: 'Engineering',
					description: 'Software Development',
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				},
				{
					id: '123e4567-e89b-12d3-a456-426614174002',
					name: 'Marketing',
					description: 'Brand and Marketing',
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				}
			];

			mockGraphQL.query = vi.fn().mockResolvedValue({
				departments: mockDepartments
			});

			const filters: FindDepartmentsFilter = {
				searchTerm: 'engineer'
			};

			const result = await adapter.findAll(filters);

			expect(result.isOk).toBe(true);
			expect(result.value.departments).toHaveLength(1);
			expect(result.value.departments[0].name).toBe('Engineering');
		});

		it('should filter root departments only', async () => {
			const mockDepartments = [
				{
					id: '123e4567-e89b-12d3-a456-426614174001',
					name: 'Engineering',
					description: null,
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				},
				{
					id: '123e4567-e89b-12d3-a456-426614174002',
					name: 'Backend Team',
					description: null,
					managerId: null,
					parentDepartmentId: '123e4567-e89b-12d3-a456-426614174001',
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				}
			];

			mockGraphQL.query = vi.fn().mockResolvedValue({
				departments: mockDepartments
			});

			const filters: FindDepartmentsFilter = {
				rootOnly: true
			};

			const result = await adapter.findAll(filters);

			expect(result.isOk).toBe(true);
			expect(result.value.departments).toHaveLength(1);
			expect(result.value.departments[0].name).toBe('Engineering');
		});
	});

	describe('findByName', () => {
		it('should find department by name at root level', async () => {
			const mockDepartments = [
				{
					id: '123e4567-e89b-12d3-a456-426614174001',
					name: 'Engineering',
					description: null,
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				}
			];

			mockGraphQL.query = vi.fn().mockResolvedValue({
				departments: mockDepartments
			});

			const result = await adapter.findByName('Engineering', null);

			expect(result.isOk).toBe(true);
			expect(result.value).not.toBeNull();
			expect(result.value?.name.value).toBe('Engineering');
		});

		it('should find department by name under parent', async () => {
			const mockDepartments = [
				{
					id: '123e4567-e89b-12d3-a456-426614174001',
					name: 'Engineering',
					description: null,
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				},
				{
					id: '123e4567-e89b-12d3-a456-426614174002',
					name: 'Backend Team',
					description: null,
					managerId: null,
					parentDepartmentId: '123e4567-e89b-12d3-a456-426614174001',
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				}
			];

			mockGraphQL.query = vi.fn().mockResolvedValue({
				departments: mockDepartments
			});

			const result = await adapter.findByName(
				'Backend Team',
				'123e4567-e89b-12d3-a456-426614174001'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).not.toBeNull();
			expect(result.value?.name.value).toBe('Backend Team');
		});

		it('should return null when name not found', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				departments: []
			});

			const result = await adapter.findByName('Nonexistent', null);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('exists', () => {
		it('should return true when department exists', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				department: {
					id: '123e4567-e89b-12d3-a456-426614174000',
					name: 'Engineering',
					description: null,
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				}
			});

			const result = await adapter.exists('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});

		it('should return false when department does not exist', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				department: null
			});

			const result = await adapter.exists('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(false);
		});
	});

	describe('isNameUnique', () => {
		it('should return true when name is unique', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				isDepartmentNameUnique: true
			});

			const result = await adapter.isNameUnique('Engineering', null);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});

		it('should return false when name already exists', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				isDepartmentNameUnique: false
			});

			const result = await adapter.isNameUnique('Engineering', null);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(false);
		});

		it('should handle excludeId parameter for updates', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				isDepartmentNameUnique: true
			});

			const result = await adapter.isNameUnique(
				'Engineering',
				null,
				'123e4567-e89b-12d3-a456-426614174000'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});
	});

	describe('getAncestors', () => {
		it('should return ancestors list', async () => {
			const mockAncestors = [
				{
					id: '123e4567-e89b-12d3-a456-426614174001',
					name: 'Engineering',
					description: null,
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				}
			];

			mockGraphQL.query = vi.fn().mockResolvedValue({
				getDepartmentAncestors: mockAncestors
			});

			const result = await adapter.getAncestors('123e4567-e89b-12d3-a456-426614174002');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].name.value).toBe('Engineering');
		});

		it('should return empty list for root department', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				getDepartmentAncestors: []
			});

			const result = await adapter.getAncestors('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('getDescendants', () => {
		it('should return descendants list', async () => {
			const mockDescendants = [
				{
					id: '123e4567-e89b-12d3-a456-426614174002',
					name: 'Backend Team',
					description: null,
					managerId: null,
					parentDepartmentId: '123e4567-e89b-12d3-a456-426614174001',
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				},
				{
					id: '123e4567-e89b-12d3-a456-426614174003',
					name: 'Frontend Team',
					description: null,
					managerId: null,
					parentDepartmentId: '123e4567-e89b-12d3-a456-426614174001',
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				}
			];

			mockGraphQL.query = vi.fn().mockResolvedValue({
				getDepartmentDescendants: mockDescendants
			});

			const result = await adapter.getDescendants('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty list when no descendants', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				getDepartmentDescendants: []
			});

			const result = await adapter.getDescendants('123e4567-e89b-12d3-a456-426614174002');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('getChildren', () => {
		it('should return immediate children only', async () => {
			const mockDepartments = [
				{
					id: '123e4567-e89b-12d3-a456-426614174001',
					name: 'Engineering',
					description: null,
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				},
				{
					id: '123e4567-e89b-12d3-a456-426614174002',
					name: 'Backend Team',
					description: null,
					managerId: null,
					parentDepartmentId: '123e4567-e89b-12d3-a456-426614174001',
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				},
				{
					id: '123e4567-e89b-12d3-a456-426614174003',
					name: 'Frontend Team',
					description: null,
					managerId: null,
					parentDepartmentId: '123e4567-e89b-12d3-a456-426614174001',
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z',
					deletedAt: null
				}
			];

			mockGraphQL.query = vi.fn().mockResolvedValue({
				departments: mockDepartments
			});

			const result = await adapter.getChildren('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});
	});

	describe('getEmployeeCount', () => {
		it('should return employee count', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				countEmployeesByDepartment: 42
			});

			const result = await adapter.getEmployeeCount('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(42);
		});

		it('should return 0 for empty department', async () => {
			mockGraphQL.query = vi.fn().mockResolvedValue({
				countEmployeesByDepartment: 0
			});

			const result = await adapter.getEmployeeCount('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(0);
		});
	});

	describe('save', () => {
		it('should create new department', async () => {
			const departmentResult = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering',
				description: 'Software Development',
				managerId: null,
				parentId: null
			});

			expect(departmentResult.isOk).toBe(true);
			const department = departmentResult.value;

			const mockCreatedDepartment = {
				id: department.id,
				name: department.name.value,
				description: department.description,
				managerId: null,
				parentDepartmentId: null,
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z',
				deletedAt: null
			};

			mockGraphQL.mutation = vi.fn().mockResolvedValue({
				createDepartment: mockCreatedDepartment
			});

			const result = await adapter.save(department);

			expect(result.isOk).toBe(true);
			expect(result.value.name.value).toBe('Engineering');
		});

		it('should handle creation errors', async () => {
			const departmentResult = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering',
				parentId: null
			});

			expect(departmentResult.isOk).toBe(true);

			mockGraphQL.mutation = vi.fn().mockResolvedValue(null);

			const result = await adapter.save(departmentResult.value);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('GRAPHQL_MUTATION_ERROR');
		});
	});

	describe('update', () => {
		it('should update department', async () => {
			const departmentResult = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering Updated',
				description: 'Updated Description',
				managerId: null,
				parentId: null
			});

			expect(departmentResult.isOk).toBe(true);
			const department = departmentResult.value;

			const mockUpdatedDepartment = {
				id: department.id,
				name: department.name.value,
				description: department.description,
				managerId: null,
				parentDepartmentId: null,
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-02T00:00:00Z',
				deletedAt: null
			};

			mockGraphQL.mutation = vi.fn().mockResolvedValue({
				updateDepartment: mockUpdatedDepartment
			});

			const result = await adapter.update(department.id, department);

			expect(result.isOk).toBe(true);
			expect(result.value.name.value).toBe('Engineering Updated');
		});
	});

	describe('bulkUpdate', () => {
		it('should update multiple departments atomically', async () => {
			const dept1Result = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Engineering',
				parentId: null
			});

			const dept2Result = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174002',
				name: 'Marketing',
				parentId: null
			});

			expect(dept1Result.isOk).toBe(true);
			expect(dept2Result.isOk).toBe(true);

			const updates: Array<[string, Department]> = [
				[dept1Result.value.id, dept1Result.value],
				[dept2Result.value.id, dept2Result.value]
			];

			const mockUpdatedDepartments = [
				{
					id: '123e4567-e89b-12d3-a456-426614174001',
					name: 'Engineering',
					description: null,
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-02T00:00:00Z',
					deletedAt: null
				},
				{
					id: '123e4567-e89b-12d3-a456-426614174002',
					name: 'Marketing',
					description: null,
					managerId: null,
					parentDepartmentId: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-02T00:00:00Z',
					deletedAt: null
				}
			];

			mockGraphQL.mutation = vi.fn().mockResolvedValue({
				bulkUpdateDepartments: mockUpdatedDepartments
			});

			const result = await adapter.bulkUpdate(updates);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should handle errors in bulk update', async () => {
			const dept1Result = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Engineering',
				parentId: null
			});

			expect(dept1Result.isOk).toBe(true);

			mockGraphQL.mutation = vi.fn().mockResolvedValue(null);

			const result = await adapter.bulkUpdate([[dept1Result.value.id, dept1Result.value]]);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('GRAPHQL_MUTATION_ERROR');
		});
	});

	describe('delete', () => {
		it('should soft delete department', async () => {
			mockGraphQL.mutation = vi.fn().mockResolvedValue({
				deleteDepartment: true
			});

			const result = await adapter.delete('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
		});

		it('should handle deletion errors', async () => {
			mockGraphQL.mutation = vi.fn().mockResolvedValue(null);

			const result = await adapter.delete('invalid-id');

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('GRAPHQL_MUTATION_ERROR');
		});
	});
});
