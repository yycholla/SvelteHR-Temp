import { describe, expect, it } from 'vitest';
import { DepartmentHierarchy } from './DepartmentHierarchy';

describe('DepartmentHierarchy', () => {
	describe('createRoot', () => {
		it('creates a root department with no parent', () => {
			const result = DepartmentHierarchy.createRoot();

			expect(result.isOk).toBe(true);
			expect(result.value.parentId).toBeNull();
			expect(result.value.ancestorIds).toEqual([]);
		});

		it('creates immutable ancestor array', () => {
			const result = DepartmentHierarchy.createRoot();
			const hierarchy = result.value;

			expect(Object.isFrozen(hierarchy.ancestorIds)).toBe(true);
		});
	});

	describe('createChild', () => {
		it('creates a child department with parent ID', () => {
			const parentId = '123e4567-e89b-12d3-a456-426614174000';
			const result = DepartmentHierarchy.createChild(parentId, [parentId]);

			expect(result.isOk).toBe(true);
			expect(result.value.parentId).toBe(parentId);
			expect(result.value.ancestorIds).toEqual([parentId]);
		});

		it('creates a grandchild with full ancestor chain', () => {
			const grandparentId = '123e4567-e89b-12d3-a456-426614174000';
			const parentId = '223e4567-e89b-12d3-a456-426614174000';
			const ancestorIds = [parentId, grandparentId];

			const result = DepartmentHierarchy.createChild(parentId, ancestorIds);

			expect(result.isOk).toBe(true);
			expect(result.value.parentId).toBe(parentId);
			expect(result.value.ancestorIds).toEqual(ancestorIds);
		});

		it('creates immutable ancestor array', () => {
			const parentId = '123e4567-e89b-12d3-a456-426614174000';
			const result = DepartmentHierarchy.createChild(parentId, [parentId]);
			const hierarchy = result.value;

			expect(Object.isFrozen(hierarchy.ancestorIds)).toBe(true);
		});

		it('returns BusinessRuleError with empty parent ID', () => {
			const result = DepartmentHierarchy.createChild('', []);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('BusinessRuleError');
			expect(result.error.message).toContain('Parent ID is required');
		});

		it('returns BusinessRuleError with whitespace-only parent ID', () => {
			const result = DepartmentHierarchy.createChild('   ', []);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('BusinessRuleError');
			expect(result.error.message).toContain('Parent ID is required');
		});

		it('returns BusinessRuleError when parent not first in ancestor chain', () => {
			const parentId = '123e4567-e89b-12d3-a456-426614174000';
			const grandparentId = '223e4567-e89b-12d3-a456-426614174000';

			// Wrong order: grandparent should come after parent
			const result = DepartmentHierarchy.createChild(parentId, [grandparentId, parentId]);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('BusinessRuleError');
			expect(result.error.message).toContain('Parent ID must be first element');
		});

		it('returns BusinessRuleError with circular reference in ancestors', () => {
			const departmentId = '123e4567-e89b-12d3-a456-426614174000';

			// Duplicate ID in ancestor chain (circular reference)
			const result = DepartmentHierarchy.createChild(departmentId, [departmentId, departmentId]);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('BusinessRuleError');
			expect(result.error.message.toLowerCase()).toContain('circular reference');
		});
	});

	describe('isRoot', () => {
		it('returns true for root department', () => {
			const hierarchy = DepartmentHierarchy.createRoot().value;

			expect(hierarchy.isRoot()).toBe(true);
		});

		it('returns false for child department', () => {
			const parentId = '123e4567-e89b-12d3-a456-426614174000';
			const hierarchy = DepartmentHierarchy.createChild(parentId, [parentId]).value;

			expect(hierarchy.isRoot()).toBe(false);
		});
	});

	describe('hasAncestor', () => {
		it('returns true when ID is in ancestor chain', () => {
			const grandparentId = '123e4567-e89b-12d3-a456-426614174000';
			const parentId = '223e4567-e89b-12d3-a456-426614174000';
			const hierarchy = DepartmentHierarchy.createChild(parentId, [parentId, grandparentId]).value;

			expect(hierarchy.hasAncestor(grandparentId)).toBe(true);
			expect(hierarchy.hasAncestor(parentId)).toBe(true);
		});

		it('returns false when ID is not in ancestor chain', () => {
			const parentId = '123e4567-e89b-12d3-a456-426614174000';
			const otherId = '323e4567-e89b-12d3-a456-426614174000';
			const hierarchy = DepartmentHierarchy.createChild(parentId, [parentId]).value;

			expect(hierarchy.hasAncestor(otherId)).toBe(false);
		});

		it('returns false for root department', () => {
			const hierarchy = DepartmentHierarchy.createRoot().value;
			const anyId = '123e4567-e89b-12d3-a456-426614174000';

			expect(hierarchy.hasAncestor(anyId)).toBe(false);
		});
	});

	describe('getDepth', () => {
		it('returns 0 for root department', () => {
			const hierarchy = DepartmentHierarchy.createRoot().value;

			expect(hierarchy.getDepth()).toBe(0);
		});

		it('returns 1 for direct child', () => {
			const parentId = '123e4567-e89b-12d3-a456-426614174000';
			const hierarchy = DepartmentHierarchy.createChild(parentId, [parentId]).value;

			expect(hierarchy.getDepth()).toBe(1);
		});

		it('returns 2 for grandchild', () => {
			const grandparentId = '123e4567-e89b-12d3-a456-426614174000';
			const parentId = '223e4567-e89b-12d3-a456-426614174000';
			const hierarchy = DepartmentHierarchy.createChild(parentId, [parentId, grandparentId]).value;

			expect(hierarchy.getDepth()).toBe(2);
		});

		it('returns correct depth for deeply nested hierarchy', () => {
			const ids = [
				'123e4567-e89b-12d3-a456-426614174000',
				'223e4567-e89b-12d3-a456-426614174001',
				'323e4567-e89b-12d3-a456-426614174002',
				'423e4567-e89b-12d3-a456-426614174003',
				'523e4567-e89b-12d3-a456-426614174004'
			];
			const hierarchy = DepartmentHierarchy.createChild(ids[0], ids).value;

			expect(hierarchy.getDepth()).toBe(5);
		});
	});

	describe('createChildHierarchy', () => {
		it('creates child hierarchy with current department as parent', () => {
			const rootId = '123e4567-e89b-12d3-a456-426614174000';
			const parentHierarchy = DepartmentHierarchy.createRoot().value;

			const result = parentHierarchy.createChildHierarchy(rootId);

			expect(result.isOk).toBe(true);
			expect(result.value.parentId).toBe(rootId);
			expect(result.value.ancestorIds).toEqual([rootId]);
		});

		it('creates grandchild with full ancestor chain', () => {
			const grandparentId = '123e4567-e89b-12d3-a456-426614174000';
			const parentId = '223e4567-e89b-12d3-a456-426614174000';
			const parentHierarchy = DepartmentHierarchy.createChild(grandparentId, [grandparentId]).value;

			const result = parentHierarchy.createChildHierarchy(parentId);

			expect(result.isOk).toBe(true);
			expect(result.value.parentId).toBe(parentId);
			expect(result.value.ancestorIds).toEqual([parentId, grandparentId]);
		});

		it('returns BusinessRuleError for circular reference', () => {
			const rootId = '123e4567-e89b-12d3-a456-426614174000';
			const childId = '223e4567-e89b-12d3-a456-426614174000';

			// Create child of root
			const childHierarchy = DepartmentHierarchy.createChild(rootId, [rootId]).value;

			// Try to make root a child of its own descendant (circular!)
			const result = childHierarchy.createChildHierarchy(rootId);

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('BusinessRuleError');
			expect(result.error.message).toContain('circular reference');
		});
	});

	describe('equals', () => {
		it('returns true for identical root hierarchies', () => {
			const hierarchy1 = DepartmentHierarchy.createRoot().value;
			const hierarchy2 = DepartmentHierarchy.createRoot().value;

			expect(hierarchy1.equals(hierarchy2)).toBe(true);
		});

		it('returns true for identical child hierarchies', () => {
			const parentId = '123e4567-e89b-12d3-a456-426614174000';
			const hierarchy1 = DepartmentHierarchy.createChild(parentId, [parentId]).value;
			const hierarchy2 = DepartmentHierarchy.createChild(parentId, [parentId]).value;

			expect(hierarchy1.equals(hierarchy2)).toBe(true);
		});

		it('returns false for different parent IDs', () => {
			const parentId1 = '123e4567-e89b-12d3-a456-426614174000';
			const parentId2 = '223e4567-e89b-12d3-a456-426614174000';

			const hierarchy1 = DepartmentHierarchy.createChild(parentId1, [parentId1]).value;
			const hierarchy2 = DepartmentHierarchy.createChild(parentId2, [parentId2]).value;

			expect(hierarchy1.equals(hierarchy2)).toBe(false);
		});

		it('returns false for different ancestor chains', () => {
			const grandparentId = '123e4567-e89b-12d3-a456-426614174000';
			const parentId = '223e4567-e89b-12d3-a456-426614174000';

			const hierarchy1 = DepartmentHierarchy.createChild(parentId, [parentId]).value;
			const hierarchy2 = DepartmentHierarchy.createChild(parentId, [parentId, grandparentId]).value;

			expect(hierarchy1.equals(hierarchy2)).toBe(false);
		});

		it('returns false comparing root to child', () => {
			const parentId = '123e4567-e89b-12d3-a456-426614174000';
			const rootHierarchy = DepartmentHierarchy.createRoot().value;
			const childHierarchy = DepartmentHierarchy.createChild(parentId, [parentId]).value;

			expect(rootHierarchy.equals(childHierarchy)).toBe(false);
		});
	});

	describe('toString', () => {
		it('returns "Root Department" for root', () => {
			const hierarchy = DepartmentHierarchy.createRoot().value;

			expect(hierarchy.toString()).toBe('Root Department');
		});

		it('returns parent ID and depth for child', () => {
			const parentId = '123e4567-e89b-12d3-a456-426614174000';
			const hierarchy = DepartmentHierarchy.createChild(parentId, [parentId]).value;

			expect(hierarchy.toString()).toContain(parentId);
			expect(hierarchy.toString()).toContain('depth: 1');
		});

		it('returns correct depth for grandchild', () => {
			const grandparentId = '123e4567-e89b-12d3-a456-426614174000';
			const parentId = '223e4567-e89b-12d3-a456-426614174000';
			const hierarchy = DepartmentHierarchy.createChild(parentId, [parentId, grandparentId]).value;

			expect(hierarchy.toString()).toContain('depth: 2');
		});
	});
});
