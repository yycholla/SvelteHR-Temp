// src/domain/Department/DepartmentHierarchy.ts
import { Result } from '$domain/Result';
import { BusinessRuleError } from '$domain/errors';

/**
 * Value object representing a department's position in the organizational hierarchy.
 *
 * Enforces business rules:
 * - Root departments have no parent
 * - Child departments must reference a valid parent
 * - Ancestor chain must not contain circular references
 * - Ancestor chain is ordered from immediate parent to root
 *
 * Immutable once created.
 */
export class DepartmentHierarchy {
	private constructor(
		public readonly parentId: string | null,
		public readonly ancestorIds: readonly string[]
	) {}

	/**
	 * Factory method to create a root department (no parent).
	 *
	 * @returns Result containing DepartmentHierarchy for root department
	 */
	static createRoot(): Result<DepartmentHierarchy, BusinessRuleError> {
		return Result.ok(new DepartmentHierarchy(null, []));
	}

	/**
	 * Factory method to create a child department with parent.
	 *
	 * @param parentId - The parent department UUID
	 * @param ancestorIds - Ordered list of ancestor IDs (parent to root)
	 * @returns Result containing DepartmentHierarchy or BusinessRuleError
	 */
	static createChild(
		parentId: string,
		ancestorIds: string[]
	): Result<DepartmentHierarchy, BusinessRuleError> {
		// Validation: Parent ID required for child departments
		if (!parentId || parentId.trim().length === 0) {
			return Result.error(
				new BusinessRuleError('parentIdRequired', 'Parent ID is required for child departments')
			);
		}

		// Validation: Parent must be first in ancestor chain
		if (ancestorIds.length > 0 && ancestorIds[0] !== parentId) {
			return Result.error(
				new BusinessRuleError(
					'invalidAncestorChain',
					'Parent ID must be first element in ancestor chain'
				)
			);
		}

		// Validation: Prevent circular references
		const uniqueAncestors = new Set(ancestorIds);
		if (uniqueAncestors.size !== ancestorIds.length) {
			return Result.error(
				new BusinessRuleError(
					'circularReference',
					'Ancestor chain contains duplicate IDs (circular reference detected)'
				)
			);
		}

		// Validation: Prevent self-referencing (will be checked at Department entity level)
		// This is a defensive check in case someone tries to include current department ID
		// Note: Current department ID is not yet known at this point, so this check
		// will be done at the entity level

		return Result.ok(new DepartmentHierarchy(parentId, Object.freeze([...ancestorIds])));
	}

	/**
	 * Check if this is a root department.
	 *
	 * @returns true if department has no parent
	 */
	isRoot(): boolean {
		return this.parentId === null;
	}

	/**
	 * Check if a department ID exists in the ancestor chain.
	 *
	 * @param departmentId - Department ID to check
	 * @returns true if ID is in ancestor chain
	 */
	hasAncestor(departmentId: string): boolean {
		return this.ancestorIds.includes(departmentId);
	}

	/**
	 * Get the depth level in the hierarchy.
	 *
	 * @returns 0 for root, 1 for direct children, 2 for grandchildren, etc.
	 */
	getDepth(): number {
		return this.ancestorIds.length;
	}

	/**
	 * Create a new hierarchy for a child of this department.
	 *
	 * @param currentDepartmentId - The ID of the current department
	 * @returns Result containing child hierarchy or BusinessRuleError
	 */
	createChildHierarchy(
		currentDepartmentId: string
	): Result<DepartmentHierarchy, BusinessRuleError> {
		// Validation: Prevent self-referencing
		if (this.hasAncestor(currentDepartmentId)) {
			return Result.error(
				new BusinessRuleError(
					'circularReference',
					'Cannot create child with ancestor that already contains current department'
				)
			);
		}

		// Build new ancestor chain: [current department, ...existing ancestors]
		const newAncestorIds = [currentDepartmentId, ...this.ancestorIds];

		return DepartmentHierarchy.createChild(currentDepartmentId, newAncestorIds);
	}

	/**
	 * Check if two hierarchies represent the same organizational position.
	 *
	 * @param other - Another DepartmentHierarchy to compare
	 * @returns true if parent and ancestors match
	 */
	equals(other: DepartmentHierarchy): boolean {
		if (this.parentId !== other.parentId) {
			return false;
		}

		if (this.ancestorIds.length !== other.ancestorIds.length) {
			return false;
		}

		return this.ancestorIds.every((id, index) => id === other.ancestorIds[index]);
	}

	/**
	 * String representation for logging/debugging.
	 */
	toString(): string {
		if (this.isRoot()) {
			return 'Root Department';
		}
		return `Child of ${this.parentId} (depth: ${this.getDepth()})`;
	}
}
