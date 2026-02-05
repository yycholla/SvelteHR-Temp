import { describe, expect, it } from 'vitest';
import { Department } from './Department';
import { faker } from '@faker-js/faker';

describe('Department', () => {
	describe('create', () => {
		it('returns Ok with valid root department', () => {
			const validData = {
				id: faker.string.uuid(),
				name: 'Engineering',
				parentId: null,
				managerId: faker.string.uuid(),
				description: 'Software development team',
				employeeCount: 10
			};

			const result = Department.create(validData);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(validData.id);
			expect(result.value.name.value).toBe(validData.name);
			expect(result.value.isRoot).toBe(true);
			expect(result.value.parentId).toBeNull();
			expect(result.value.depth).toBe(0);
			expect(result.value.employeeCount).toBe(10);
		});

		it('returns Ok with valid child department', () => {
			const parentId = faker.string.uuid();
			const validData = {
				id: faker.string.uuid(),
				name: 'Backend Team',
				parentId,
				ancestorIds: [parentId],
				managerId: null,
				description: null
			};

			const result = Department.create(validData);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(validData.id);
			expect(result.value.name.value).toBe('Backend Team');
			expect(result.value.isRoot).toBe(false);
			expect(result.value.parentId).toBe(parentId);
			expect(result.value.depth).toBe(1);
		});

		it('returns Ok with grandchild department', () => {
			const grandparentId = faker.string.uuid();
			const parentId = faker.string.uuid();
			const validData = {
				id: faker.string.uuid(),
				name: 'API Team',
				parentId,
				ancestorIds: [parentId, grandparentId]
			};

			const result = Department.create(validData);

			expect(result.isOk).toBe(true);
			expect(result.value.depth).toBe(2);
			expect(result.value.ancestorIds).toEqual([parentId, grandparentId]);
		});

		it('returns DomainError with invalid ID format', () => {
			const invalidData = {
				id: 'not-a-uuid',
				name: 'Engineering'
			};

			const result = Department.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_UUID');
		});

		it('returns ValidationError with empty name', () => {
			const invalidData = {
				id: faker.string.uuid(),
				name: ''
			};

			const result = Department.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
			expect(result.error.message).toContain('cannot be empty');
		});

		it('returns ValidationError with name exceeding max length', () => {
			const invalidData = {
				id: faker.string.uuid(),
				name: 'A'.repeat(101)
			};

			const result = Department.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
		});

		it('returns CircularDepartmentReferenceError with self-referencing parent', () => {
			const departmentId = faker.string.uuid();
			const invalidData = {
				id: departmentId,
				name: 'Engineering',
				parentId: departmentId // Self-reference!
			};

			const result = Department.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('CircularDepartmentReferenceError');
		});

		it('returns CircularDepartmentReferenceError when ID is in ancestor chain', () => {
			const departmentId = faker.string.uuid();
			const parentId = faker.string.uuid();
			const invalidData = {
				id: departmentId,
				name: 'Engineering',
				parentId,
				ancestorIds: [parentId, departmentId] // Department in its own ancestry!
			};

			const result = Department.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('CircularDepartmentReferenceError');
		});

		it('returns DomainError with invalid parent ID format', () => {
			const invalidData = {
				id: faker.string.uuid(),
				name: 'Engineering',
				parentId: 'not-a-uuid'
			};

			const result = Department.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_UUID');
		});

		it('returns DomainError with invalid manager ID format', () => {
			const invalidData = {
				id: faker.string.uuid(),
				name: 'Engineering',
				managerId: 'not-a-uuid'
			};

			const result = Department.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_UUID');
		});

		it('returns DomainError with description exceeding max length', () => {
			const invalidData = {
				id: faker.string.uuid(),
				name: 'Engineering',
				description: 'A'.repeat(501)
			};

			const result = Department.create(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('MAX_LENGTH');
		});

		it('sets null for empty description', () => {
			const validData = {
				id: faker.string.uuid(),
				name: 'Engineering',
				description: '   ' // Whitespace only
			};

			const result = Department.create(validData);

			expect(result.isOk).toBe(true);
			expect(result.value.description).toBeNull();
		});

		it('defaults employeeCount to 0', () => {
			const validData = {
				id: faker.string.uuid(),
				name: 'Engineering'
			};

			const result = Department.create(validData);

			expect(result.isOk).toBe(true);
			expect(result.value.employeeCount).toBe(0);
		});

		it('defaults isDeleted to false', () => {
			const validData = {
				id: faker.string.uuid(),
				name: 'Engineering'
			};

			const result = Department.create(validData);

			expect(result.isOk).toBe(true);
			expect(result.value.isDeleted).toBe(false);
		});
	});

	describe('rename', () => {
		it('returns updated department with new name', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const result = department.rename('Product Engineering');

			expect(result.isOk).toBe(true);
			expect(result.value.name.value).toBe('Product Engineering');
			expect(result.value.id).toBe(department.id);
		});

		it('returns same instance when name is unchanged (case-insensitive)', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const result = department.rename('engineering');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(department);
		});

		it('returns ValidationError with invalid name', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const result = department.rename('');

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('ValidationError');
		});

		it('preserves other properties', () => {
			const managerId = faker.string.uuid();
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering',
				managerId,
				description: 'Dev team',
				employeeCount: 15
			}).value;

			const result = department.rename('New Engineering');

			expect(result.isOk).toBe(true);
			expect(result.value.managerId).toBe(managerId);
			expect(result.value.description).toBe('Dev team');
			expect(result.value.employeeCount).toBe(15);
		});
	});

	describe('move', () => {
		it('moves department to new parent', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'API Team'
			}).value;

			const newParentId = faker.string.uuid();
			const result = department.move(newParentId, [newParentId]);

			expect(result.isOk).toBe(true);
			expect(result.value.parentId).toBe(newParentId);
			expect(result.value.isRoot).toBe(false);
			expect(result.value.depth).toBe(1);
		});

		it('converts child to root department', () => {
			const parentId = faker.string.uuid();
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Backend Team',
				parentId,
				ancestorIds: [parentId]
			}).value;

			const result = department.move(null, []);

			expect(result.isOk).toBe(true);
			expect(result.value.isRoot).toBe(true);
			expect(result.value.parentId).toBeNull();
			expect(result.value.depth).toBe(0);
		});

		it('returns CircularDepartmentReferenceError when moving to self', () => {
			const departmentId = faker.string.uuid();
			const department = Department.create({
				id: departmentId,
				name: 'Engineering'
			}).value;

			const result = department.move(departmentId, [departmentId]);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('CircularDepartmentReferenceError');
		});

		it('returns CircularDepartmentReferenceError when department in ancestor chain', () => {
			const departmentId = faker.string.uuid();
			const parentId = faker.string.uuid();
			const department = Department.create({
				id: departmentId,
				name: 'Engineering'
			}).value;

			// Try to create circular reference
			const result = department.move(parentId, [parentId, departmentId]);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('CircularDepartmentReferenceError');
		});

		it('preserves other properties', () => {
			const managerId = faker.string.uuid();
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'API Team',
				managerId,
				employeeCount: 5
			}).value;

			const newParentId = faker.string.uuid();
			const result = department.move(newParentId, [newParentId]);

			expect(result.isOk).toBe(true);
			expect(result.value.name.value).toBe('API Team');
			expect(result.value.managerId).toBe(managerId);
			expect(result.value.employeeCount).toBe(5);
		});
	});

	describe('updateDescription', () => {
		it('updates description', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const result = department.updateDescription('Software development team');

			expect(result.isOk).toBe(true);
			expect(result.value.description).toBe('Software development team');
		});

		it('clears description with null', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering',
				description: 'Old description'
			}).value;

			const result = department.updateDescription(null);

			expect(result.isOk).toBe(true);
			expect(result.value.description).toBeNull();
		});

		it('sets null for whitespace-only description', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const result = department.updateDescription('   ');

			expect(result.isOk).toBe(true);
			expect(result.value.description).toBeNull();
		});

		it('returns DomainError with description exceeding max length', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const result = department.updateDescription('A'.repeat(501));

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('MAX_LENGTH');
		});
	});

	describe('setManager', () => {
		it('assigns manager', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const managerId = faker.string.uuid();
			const result = department.setManager(managerId);

			expect(result.isOk).toBe(true);
			expect(result.value.managerId).toBe(managerId);
		});

		it('clears manager with null', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering',
				managerId: faker.string.uuid()
			}).value;

			const result = department.setManager(null);

			expect(result.isOk).toBe(true);
			expect(result.value.managerId).toBeNull();
		});

		it('returns DomainError with invalid manager ID format', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const result = department.setManager('not-a-uuid');

			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_UUID');
		});
	});

	describe('updateEmployeeCount', () => {
		it('updates employee count', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering',
				employeeCount: 10
			}).value;

			const updated = department.updateEmployeeCount(25);

			expect(updated.employeeCount).toBe(25);
		});

		it('clamps negative counts to 0', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const updated = department.updateEmployeeCount(-5);

			expect(updated.employeeCount).toBe(0);
		});
	});

	describe('delete', () => {
		it('marks department as deleted', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const result = department.delete();

			expect(result.isOk).toBe(true);
			expect(result.value.isDeleted).toBe(true);
		});

		it('returns DepartmentDeletionError when already deleted', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering',
				isDeleted: true
			}).value;

			const result = department.delete();

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('DepartmentDeletionError');
		});

		it('preserves other properties', () => {
			const managerId = faker.string.uuid();
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering',
				managerId,
				employeeCount: 10
			}).value;

			const result = department.delete();

			expect(result.isOk).toBe(true);
			expect(result.value.name.value).toBe('Engineering');
			expect(result.value.managerId).toBe(managerId);
			expect(result.value.employeeCount).toBe(10);
		});
	});

	describe('toString', () => {
		it('returns string representation for root department', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering'
			}).value;

			const str = department.toString();

			expect(str).toContain('Engineering');
			expect(str).toContain('Root');
		});

		it('returns string representation for child department', () => {
			const parentId = faker.string.uuid();
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Backend Team',
				parentId,
				ancestorIds: [parentId]
			}).value;

			const str = department.toString();

			expect(str).toContain('Backend Team');
			expect(str).toContain(parentId);
		});

		it('indicates deleted status', () => {
			const department = Department.create({
				id: faker.string.uuid(),
				name: 'Engineering',
				isDeleted: true
			}).value;

			const str = department.toString();

			expect(str).toContain('deleted');
		});
	});
});
