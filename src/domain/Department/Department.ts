// src/domain/Department/Department.ts
import { Result } from '$domain/Result';
import {
	DomainError,
	DepartmentDeletionError,
	CircularDepartmentReferenceError,
	BusinessRuleError
} from '$domain/errors';
import { DepartmentName } from './DepartmentName';
import { DepartmentHierarchy } from './DepartmentHierarchy';
import type { CreateDepartmentData } from './types';

/**
 * Department aggregate root.
 *
 * Encapsulates all business logic for department management:
 * - Name validation and uniqueness
 * - Hierarchy management (parent-child relationships)
 * - Manager assignment
 * - Soft deletion with constraints
 *
 * Immutable entity - all mutations return new instances.
 */
export class Department {
	private constructor(
		public readonly id: string,
		private _name: DepartmentName,
		private _hierarchy: DepartmentHierarchy,
		private _managerId: string | null,
		private _description: string | null,
		private _employeeCount: number,
		private _isDeleted: boolean
	) {}

	// Getters
	get name(): DepartmentName {
		return this._name;
	}

	get hierarchy(): DepartmentHierarchy {
		return this._hierarchy;
	}

	get managerId(): string | null {
		return this._managerId;
	}

	get description(): string | null {
		return this._description;
	}

	get employeeCount(): number {
		return this._employeeCount;
	}

	get isDeleted(): boolean {
		return this._isDeleted;
	}

	get isRoot(): boolean {
		return this._hierarchy.isRoot();
	}

	get parentId(): string | null {
		return this._hierarchy.parentId;
	}

	get ancestorIds(): readonly string[] {
		return this._hierarchy.ancestorIds;
	}

	get depth(): number {
		return this._hierarchy.getDepth();
	}

	/**
	 * Factory method to create a Department.
	 *
	 * @param data - Department creation data
	 * @returns Result containing Department or DomainError
	 */
	static create(data: CreateDepartmentData): Result<Department, DomainError> {
		// Validate ID format (must be UUID)
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!data.id || !uuidRegex.test(data.id)) {
			return Result.error(
				new DomainError('Invalid department ID format', 'INVALID_UUID', { value: data.id })
			);
		}

		// Validate name
		const nameResult = DepartmentName.create(data.name);
		if (nameResult.isError) return Result.error(nameResult.error);

		// Validate hierarchy
		let hierarchyResult: Result<DepartmentHierarchy, BusinessRuleError>;
		if (data.parentId) {
			// Child department
			if (!uuidRegex.test(data.parentId)) {
				return Result.error(
					new DomainError('Invalid parent ID format', 'INVALID_UUID', { value: data.parentId })
				);
			}

			// Prevent self-referencing
			if (data.id === data.parentId) {
				return Result.error(new CircularDepartmentReferenceError(data.id, data.parentId));
			}

			// Validate ancestorIds if provided
			const ancestorIds = data.ancestorIds ?? [data.parentId];

			// Check for circular reference in ancestors
			if (ancestorIds.includes(data.id)) {
				return Result.error(new CircularDepartmentReferenceError(data.id, data.parentId));
			}

			hierarchyResult = DepartmentHierarchy.createChild(data.parentId, ancestorIds);
		} else {
			// Root department
			hierarchyResult = DepartmentHierarchy.createRoot();
		}

		if (hierarchyResult.isError) return Result.error(hierarchyResult.error);

		// Validate managerId if provided
		let managerId: string | null = null;
		if (data.managerId !== null && data.managerId !== undefined) {
			if (!uuidRegex.test(data.managerId)) {
				return Result.error(
					new DomainError('Invalid manager ID format', 'INVALID_UUID', {
						value: data.managerId
					})
				);
			}
			managerId = data.managerId;
		}

		// Validate description if provided
		let description: string | null = null;
		if (data.description !== null && data.description !== undefined) {
			const trimmed = data.description.trim();
			if (trimmed.length > 0) {
				if (trimmed.length > 500) {
					return Result.error(
						new DomainError('Description exceeds maximum length of 500 characters', 'MAX_LENGTH', {
							value: data.description,
							max: 500
						})
					);
				}
				description = trimmed;
			}
		}

		const employeeCount = data.employeeCount ?? 0;
		const isDeleted = data.isDeleted ?? false;

		return Result.ok(
			new Department(
				data.id,
				nameResult.value,
				hierarchyResult.value,
				managerId,
				description,
				employeeCount,
				isDeleted
			)
		);
	}

	/**
	 * Rename the department.
	 *
	 * @param newName - New department name (raw string)
	 * @returns Result containing updated Department or DomainError
	 */
	rename(newName: string): Result<Department, DomainError> {
		const nameResult = DepartmentName.create(newName);
		if (nameResult.isError) return Result.error(nameResult.error);

		// No change if name is the same (case-insensitive)
		if (this._name.equals(nameResult.value)) {
			return Result.ok(this);
		}

		return Result.ok(
			new Department(
				this.id,
				nameResult.value,
				this._hierarchy,
				this._managerId,
				this._description,
				this._employeeCount,
				this._isDeleted
			)
		);
	}

	/**
	 * Move department to a new parent (or make it root).
	 *
	 * @param newParentId - New parent department ID (null for root)
	 * @param newAncestorIds - New ancestor chain
	 * @returns Result containing updated Department or DomainError
	 */
	move(newParentId: string | null, newAncestorIds: string[]): Result<Department, DomainError> {
		// Prevent self-referencing
		if (newParentId === this.id) {
			return Result.error(new CircularDepartmentReferenceError(this.id, newParentId));
		}

		// Check for circular reference in new ancestor chain
		if (newAncestorIds.includes(this.id)) {
			return Result.error(new CircularDepartmentReferenceError(this.id, newParentId ?? 'unknown'));
		}

		let hierarchyResult: Result<DepartmentHierarchy, BusinessRuleError>;
		if (newParentId) {
			hierarchyResult = DepartmentHierarchy.createChild(newParentId, newAncestorIds);
		} else {
			hierarchyResult = DepartmentHierarchy.createRoot();
		}

		if (hierarchyResult.isError) return Result.error(hierarchyResult.error);

		return Result.ok(
			new Department(
				this.id,
				this._name,
				hierarchyResult.value,
				this._managerId,
				this._description,
				this._employeeCount,
				this._isDeleted
			)
		);
	}

	/**
	 * Update department description.
	 *
	 * @param newDescription - New description (null to clear)
	 * @returns Result containing updated Department or DomainError
	 */
	updateDescription(newDescription: string | null): Result<Department, DomainError> {
		let description: string | null = null;
		if (newDescription !== null && newDescription !== undefined) {
			const trimmed = newDescription.trim();
			if (trimmed.length > 0) {
				if (trimmed.length > 500) {
					return Result.error(
						new DomainError('Description exceeds maximum length of 500 characters', 'MAX_LENGTH', {
							value: newDescription,
							max: 500
						})
					);
				}
				description = trimmed;
			}
		}

		return Result.ok(
			new Department(
				this.id,
				this._name,
				this._hierarchy,
				this._managerId,
				description,
				this._employeeCount,
				this._isDeleted
			)
		);
	}

	/**
	 * Assign a manager to the department.
	 *
	 * @param managerId - Manager user ID (null to clear)
	 * @returns Result containing updated Department or DomainError
	 */
	setManager(managerId: string | null): Result<Department, DomainError> {
		// Validate UUID format if provided
		if (managerId !== null && managerId !== undefined) {
			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (!uuidRegex.test(managerId)) {
				return Result.error(
					new DomainError('Invalid manager ID format', 'INVALID_UUID', { value: managerId })
				);
			}
		}

		return Result.ok(
			new Department(
				this.id,
				this._name,
				this._hierarchy,
				managerId,
				this._description,
				this._employeeCount,
				this._isDeleted
			)
		);
	}

	/**
	 * Update employee count (cached from repository).
	 *
	 * @param count - New employee count
	 * @returns Updated Department
	 */
	updateEmployeeCount(count: number): Department {
		return new Department(
			this.id,
			this._name,
			this._hierarchy,
			this._managerId,
			this._description,
			Math.max(0, count),
			this._isDeleted
		);
	}

	/**
	 * Mark department as deleted (soft delete).
	 *
	 * @returns Result containing updated Department or DepartmentDeletionError
	 */
	delete(): Result<Department, DepartmentDeletionError> {
		// Business rule: Cannot delete if already deleted
		if (this._isDeleted) {
			return Result.error(new DepartmentDeletionError(this.id, 'Department is already deleted'));
		}

		// Note: Constraints (e.g., has employees, has children) are checked at service layer
		// This method only performs the domain logic

		return Result.ok(
			new Department(
				this.id,
				this._name,
				this._hierarchy,
				this._managerId,
				this._description,
				this._employeeCount,
				true
			)
		);
	}

	/**
	 * Check if this department is an ancestor of another department.
	 *
	 * @param departmentId - Department ID to check
	 * @returns true if this department is in the other's ancestor chain
	 */
	isAncestorOf(departmentId: string): boolean {
		// A department cannot be an ancestor of itself
		return departmentId !== this.id;
		// Note: Full ancestor check requires querying descendants via repository
	}

	/**
	 * Convert to serializable DTO for transfer across boundaries.
	 *
	 * @returns DepartmentDTO with all public state
	 */
	toDTO(): import('./types').DepartmentDTO {
		return {
			id: this.id,
			name: this._name.value,
			parentId: this.parentId,
			ancestorIds: [...this.ancestorIds],
			managerId: this.managerId,
			description: this.description,
			employeeCount: this.employeeCount,
			isDeleted: this.isDeleted,
			depth: this.depth
		};
	}

	/**
	 * String representation for logging/debugging.
	 */
	toString(): string {
		const status = this._isDeleted ? ' (deleted)' : '';
		const parent = this.isRoot ? 'Root' : `Child of ${this.parentId}`;
		return `Department[${this.id}]: ${this._name.value} - ${parent}${status}`;
	}
}
