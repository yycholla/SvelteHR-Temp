// tests/unit/services/DepartmentService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DepartmentService } from '$services/DepartmentService';
import type { DepartmentRepository } from '$services/ports/DepartmentRepository';
import {
	Department,
	type CreateDepartmentData,
	type FindDepartmentsResult
} from '$domain/Department';
import {
	DepartmentNotFoundError,
	DepartmentAlreadyExistsError,
	DepartmentDeletionError,
	CircularDepartmentReferenceError,
	Result,
	type DomainError
} from '$domain';

// Mock implementation of DepartmentRepository for testing
class MockDepartmentRepository implements DepartmentRepository {
	private departments: Map<string, Department> = new Map();

	async findById(id: string): Promise<Result<Department | null, DomainError>> {
		return Result.ok(this.departments.get(id) ?? null);
	}

	async findAll(): Promise<Result<FindDepartmentsResult, DomainError>> {
		const departments = Array.from(this.departments.values());
		return Result.ok({
			departments: departments.map((d) => this.toDTO(d)),
			total: departments.length,
			limit: 100,
			offset: 0
		});
	}

	async findByName(
		name: string,
		parentId: string | null
	): Promise<Result<Department | null, DomainError>> {
		const dept = Array.from(this.departments.values()).find(
			(d) => d.name.value.toLowerCase() === name.toLowerCase() && d.parentId === parentId
		);
		return Result.ok(dept ?? null);
	}

	async exists(id: string): Promise<Result<boolean, DomainError>> {
		return Result.ok(this.departments.has(id));
	}

	async isNameUnique(
		name: string,
		parentId: string | null,
		excludeId?: string
	): Promise<Result<boolean, DomainError>> {
		const existing = Array.from(this.departments.values()).find(
			(d) =>
				d.name.value.toLowerCase() === name.toLowerCase() &&
				d.parentId === parentId &&
				d.id !== excludeId
		);
		return Result.ok(!existing);
	}

	async getAncestors(departmentId: string): Promise<Result<Department[], DomainError>> {
		const dept = this.departments.get(departmentId);
		if (!dept) return Result.ok([]);

		const ancestors: Department[] = [];
		for (const ancestorId of dept.ancestorIds) {
			const ancestor = this.departments.get(ancestorId);
			if (ancestor) ancestors.push(ancestor);
		}
		return Result.ok(ancestors);
	}

	async getDescendants(departmentId: string): Promise<Result<Department[], DomainError>> {
		const descendants = Array.from(this.departments.values()).filter((d) =>
			d.ancestorIds.includes(departmentId)
		);
		return Result.ok(descendants);
	}

	async getChildren(departmentId: string): Promise<Result<Department[], DomainError>> {
		const children = Array.from(this.departments.values()).filter(
			(d) => d.parentId === departmentId
		);
		return Result.ok(children);
	}

	async getEmployeeCount(departmentId: string): Promise<Result<number, DomainError>> {
		const dept = this.departments.get(departmentId);
		return Result.ok(dept?.employeeCount ?? 0);
	}

	async save(department: Department): Promise<Result<Department, DomainError>> {
		this.departments.set(department.id, department);
		return Result.ok(department);
	}

	async update(id: string, department: Department): Promise<Result<Department, DomainError>> {
		this.departments.set(id, department);
		return Result.ok(department);
	}

	async bulkUpdate(
		updates: Array<[string, Department]>
	): Promise<Result<Department[], DomainError>> {
		const updated: Department[] = [];
		for (const [id, dept] of updates) {
			this.departments.set(id, dept);
			updated.push(dept);
		}
		return Result.ok(updated);
	}

	async delete(id: string): Promise<Result<void, DomainError>> {
		const dept = this.departments.get(id);
		if (dept) {
			const deletedResult = dept.delete();
			if (deletedResult.isOk) {
				this.departments.set(id, deletedResult.value);
			}
		}
		return Result.ok(undefined);
	}

	private toDTO(dept: Department): any {
		return {
			id: dept.id,
			name: dept.name.value,
			parentId: dept.parentId,
			ancestorIds: dept.ancestorIds,
			managerId: dept.managerId,
			description: dept.description,
			employeeCount: dept.employeeCount,
			isDeleted: dept.isDeleted,
			depth: dept.depth
		};
	}

	// Test helper
	clear() {
		this.departments.clear();
	}
}

describe('DepartmentService', () => {
	let service: DepartmentService;
	let repository: MockDepartmentRepository;

	beforeEach(() => {
		repository = new MockDepartmentRepository();
		service = new DepartmentService(repository);
	});

	describe('getDepartmentById', () => {
		it('returns department when found', async () => {
			// Arrange
			const deptData: CreateDepartmentData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			};
			const dept = Department.create(deptData).value;
			await repository.save(dept);

			// Act
			const result = await service.getDepartmentById(dept.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(dept.id);
			expect(result.value.name.value).toBe('Engineering');
		});

		it('returns DepartmentNotFoundError when not found', async () => {
			// Act
			const result = await service.getDepartmentById('nonexistent-id');

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DepartmentNotFoundError);
		});
	});

	describe('getDepartments', () => {
		it('returns all departments', async () => {
			// Arrange
			const dept1 = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			const dept2 = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Marketing'
			}).value;
			await repository.save(dept1);
			await repository.save(dept2);

			// Act
			const result = await service.getDepartments();

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.departments).toHaveLength(2);
			expect(result.value.total).toBe(2);
		});
	});

	describe('createDepartment', () => {
		it('creates root department with unique name', async () => {
			// Arrange
			const data: CreateDepartmentData = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering',
				description: 'Software development team'
			};

			// Act
			const result = await service.createDepartment(data);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.name.value).toBe('Engineering');
			expect(result.value.isRoot).toBe(true);
		});

		it('creates child department with parent', async () => {
			// Arrange
			const parent = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			await repository.save(parent);

			const childData: CreateDepartmentData = {
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Backend Team',
				parentId: parent.id
			};

			// Act
			const result = await service.createDepartment(childData);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.name.value).toBe('Backend Team');
			expect(result.value.parentId).toBe(parent.id);
			expect(result.value.ancestorIds).toEqual([parent.id]);
			expect(result.value.depth).toBe(1);
		});

		it('returns DepartmentAlreadyExistsError for duplicate name', async () => {
			// Arrange
			const existing = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			await repository.save(existing);

			const duplicateData: CreateDepartmentData = {
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Engineering' // Duplicate!
			};

			// Act
			const result = await service.createDepartment(duplicateData);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DepartmentAlreadyExistsError);
		});

		it('returns DepartmentNotFoundError when parent does not exist', async () => {
			// Arrange
			const data: CreateDepartmentData = {
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Backend Team',
				parentId: 'nonexistent-parent-id'
			};

			// Act
			const result = await service.createDepartment(data);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DepartmentNotFoundError);
		});
	});

	describe('updateDepartment', () => {
		it('updates department name', async () => {
			// Arrange
			const dept = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			await repository.save(dept);

			// Act
			const result = await service.updateDepartment(dept.id, {
				name: 'Product Engineering'
			});

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.name.value).toBe('Product Engineering');
		});

		it('updates description', async () => {
			// Arrange
			const dept = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			await repository.save(dept);

			// Act
			const result = await service.updateDepartment(dept.id, {
				description: 'New description'
			});

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.description).toBe('New description');
		});

		it('updates manager', async () => {
			// Arrange
			const dept = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			await repository.save(dept);

			const managerId = '223e4567-e89b-12d3-a456-426614174000';

			// Act
			const result = await service.updateDepartment(dept.id, {
				managerId
			});

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.managerId).toBe(managerId);
		});

		it('returns DepartmentAlreadyExistsError when new name conflicts', async () => {
			// Arrange
			const dept1 = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			const dept2 = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Marketing'
			}).value;
			await repository.save(dept1);
			await repository.save(dept2);

			// Act - Try to rename dept2 to conflict with dept1
			const result = await service.updateDepartment(dept2.id, {
				name: 'Engineering'
			});

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DepartmentAlreadyExistsError);
		});

		it('allows updating name to same value (case-insensitive)', async () => {
			// Arrange
			const dept = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			await repository.save(dept);

			// Act
			const result = await service.updateDepartment(dept.id, {
				name: 'engineering' // Same name, different case
			});

			// Assert
			expect(result.isOk).toBe(true);
		});
	});

	describe('moveDepartment', () => {
		it('moves root department to become child', async () => {
			// Arrange
			const parent = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			const toMove = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'API Team'
			}).value;
			await repository.save(parent);
			await repository.save(toMove);

			// Act
			const result = await service.moveDepartment(toMove.id, parent.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.parentId).toBe(parent.id);
			expect(result.value.ancestorIds).toEqual([parent.id]);
			expect(result.value.depth).toBe(1);
		});

		it('moves child to become root', async () => {
			// Arrange
			const parent = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			const child = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Backend',
				parentId: parent.id,
				ancestorIds: [parent.id]
			}).value;
			await repository.save(parent);
			await repository.save(child);

			// Act
			const result = await service.moveDepartment(child.id, null);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value.isRoot).toBe(true);
			expect(result.value.parentId).toBeNull();
			expect(result.value.depth).toBe(0);
		});

		it('updates descendants when moving department', async () => {
			// Arrange
			const grandparent = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			const parent = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Backend',
				parentId: grandparent.id,
				ancestorIds: [grandparent.id]
			}).value;
			const child = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174002',
				name: 'API Team',
				parentId: parent.id,
				ancestorIds: [parent.id, grandparent.id]
			}).value;

			await repository.save(grandparent);
			await repository.save(parent);
			await repository.save(child);

			// Act - Move parent to root
			const result = await service.moveDepartment(parent.id, null);

			// Assert
			expect(result.isOk).toBe(true);

			// Check child's ancestor chain was updated
			const childResult = await service.getDepartmentById(child.id);
			expect(childResult.value.ancestorIds).toEqual([parent.id]); // grandparent removed
		});

		it('returns CircularDepartmentReferenceError when moving to self', async () => {
			// Arrange
			const dept = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			await repository.save(dept);

			// Act
			const result = await service.moveDepartment(dept.id, dept.id);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CircularDepartmentReferenceError);
		});

		it('returns CircularDepartmentReferenceError when moving to descendant', async () => {
			// Arrange
			const parent = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			const child = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Backend',
				parentId: parent.id,
				ancestorIds: [parent.id]
			}).value;
			await repository.save(parent);
			await repository.save(child);

			// Act - Try to move parent under its own child (circular!)
			const result = await service.moveDepartment(parent.id, child.id);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CircularDepartmentReferenceError);
		});
	});

	describe('deleteDepartment', () => {
		it('deletes department with no children or employees', async () => {
			// Arrange
			const dept = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering',
				employeeCount: 0
			}).value;
			await repository.save(dept);

			// Act
			const result = await service.deleteDepartment(dept.id);

			// Assert
			expect(result.isOk).toBe(true);

			// Verify it's marked as deleted
			const checkResult = await service.getDepartmentById(dept.id);
			expect(checkResult.value.isDeleted).toBe(true);
		});

		it('returns DepartmentDeletionError when department has children', async () => {
			// Arrange
			const parent = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering',
				employeeCount: 0
			}).value;
			const child = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Backend',
				parentId: parent.id,
				ancestorIds: [parent.id]
			}).value;
			await repository.save(parent);
			await repository.save(child);

			// Act
			const result = await service.deleteDepartment(parent.id);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DepartmentDeletionError);
			expect(result.error.message).toContain('child department');
		});

		it('returns DepartmentDeletionError when department has employees', async () => {
			// Arrange
			const dept = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering',
				employeeCount: 5 // Has employees!
			}).value;
			await repository.save(dept);

			// Act
			const result = await service.deleteDepartment(dept.id);

			// Assert
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DepartmentDeletionError);
			expect(result.error.message).toContain('employee');
		});
	});

	describe('getDepartmentAncestors', () => {
		it('returns ancestors from parent to root', async () => {
			// Arrange
			const grandparent = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Company'
			}).value;
			const parent = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Engineering',
				parentId: grandparent.id,
				ancestorIds: [grandparent.id]
			}).value;
			const child = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174002',
				name: 'Backend',
				parentId: parent.id,
				ancestorIds: [parent.id, grandparent.id]
			}).value;

			await repository.save(grandparent);
			await repository.save(parent);
			await repository.save(child);

			// Act
			const result = await service.getDepartmentAncestors(child.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(result.value[0].id).toBe(parent.id);
			expect(result.value[1].id).toBe(grandparent.id);
		});

		it('returns empty array for root department', async () => {
			// Arrange
			const root = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			await repository.save(root);

			// Act
			const result = await service.getDepartmentAncestors(root.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('getDepartmentDescendants', () => {
		it('returns all descendants recursively', async () => {
			// Arrange
			const root = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Engineering'
			}).value;
			const child1 = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174001',
				name: 'Backend',
				parentId: root.id,
				ancestorIds: [root.id]
			}).value;
			const child2 = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174002',
				name: 'Frontend',
				parentId: root.id,
				ancestorIds: [root.id]
			}).value;
			const grandchild = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174003',
				name: 'API Team',
				parentId: child1.id,
				ancestorIds: [child1.id, root.id]
			}).value;

			await repository.save(root);
			await repository.save(child1);
			await repository.save(child2);
			await repository.save(grandchild);

			// Act
			const result = await service.getDepartmentDescendants(root.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(3); // 2 children + 1 grandchild
		});

		it('returns empty array for leaf department', async () => {
			// Arrange
			const leaf = Department.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'API Team'
			}).value;
			await repository.save(leaf);

			// Act
			const result = await service.getDepartmentDescendants(leaf.id);

			// Assert
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});
});
