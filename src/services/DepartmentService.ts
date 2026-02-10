// src/services/DepartmentService.ts
import {
	Department,
	type CreateDepartmentData,
	type DepartmentDTO,
	type FindDepartmentsFilter,
	type FindDepartmentsResult
} from '$domain/Department';
import {
	DomainError,
	DepartmentNotFoundError,
	DepartmentAlreadyExistsError,
	DepartmentDeletionError,
	CircularDepartmentReferenceError,
	Result
} from '$domain';
import type { DepartmentRepository } from './ports/DepartmentRepository';

/**
 * Application service for managing departments.
 * Orchestrates domain logic and repository operations.
 */
export class DepartmentService {
	constructor(private readonly departmentRepository: DepartmentRepository) {}

	/**
	 * Get a department by ID.
	 *
	 * @param id - Department UUID
	 * @returns Result containing Department or error
	 */
	async getDepartmentById(id: string): Promise<Result<Department, DomainError>> {
		try {
			const result = await this.departmentRepository.findById(id);
			if (result.isError) {
				return Result.error(result.error);
			}

			if (!result.value) {
				return Result.error(new DepartmentNotFoundError(id));
			}

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch department', 'DEPARTMENT_FETCH_FAILED', {
					departmentId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get departments with optional filters, sorting, and pagination.
	 *
	 * @param filters - Optional filter criteria
	 * @returns Result containing FindDepartmentsResult or error
	 */
	async getDepartments(
		filters?: FindDepartmentsFilter
	): Promise<Result<FindDepartmentsResult, DomainError>> {
		try {
			const result = await this.departmentRepository.findAll(filters);
			if (result.isError) return result;

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch departments', 'DEPARTMENTS_FETCH_FAILED', {
					filters,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get department hierarchy (ancestors from parent to root).
	 *
	 * @param departmentId - Department UUID
	 * @returns Result containing ancestor departments or error
	 */
	async getDepartmentAncestors(departmentId: string): Promise<Result<Department[], DomainError>> {
		try {
			const result = await this.departmentRepository.getAncestors(departmentId);
			if (result.isError) return result;

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch department ancestors', 'ANCESTORS_FETCH_FAILED', {
					departmentId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all descendant departments (children recursively).
	 *
	 * @param departmentId - Department UUID
	 * @returns Result containing descendant departments or error
	 */
	async getDepartmentDescendants(departmentId: string): Promise<Result<Department[], DomainError>> {
		try {
			const result = await this.departmentRepository.getDescendants(departmentId);
			if (result.isError) return result;

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch department descendants', 'DESCENDANTS_FETCH_FAILED', {
					departmentId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Create a new department.
	 *
	 * @param data - Department creation data
	 * @returns Result containing created Department or error
	 */
	async createDepartment(data: CreateDepartmentData): Promise<Result<Department, DomainError>> {
		try {
			// Check name uniqueness within parent scope
			const uniqueResult = await this.departmentRepository.isNameUnique(
				data.name,
				data.parentId ?? null
			);
			if (uniqueResult.isError) {
				return Result.error(uniqueResult.error);
			}

			if (!uniqueResult.value) {
				return Result.error(new DepartmentAlreadyExistsError(data.name, data.parentId ?? null));
			}

			// Validate parent exists if provided
			if (data.parentId) {
				const parentResult = await this.departmentRepository.findById(data.parentId);
				if (parentResult.isError) {
					return Result.error(parentResult.error);
				}

				if (!parentResult.value) {
					return Result.error(new DepartmentNotFoundError(data.parentId));
				}

				// Build ancestor chain: parent's ancestors + parent itself
				const parent = parentResult.value;
				data.ancestorIds = [data.parentId, ...parent.ancestorIds];
			}

			// Create domain entity (validates business rules)
			const departmentResult = Department.create(data);
			if (departmentResult.isError) {
				return Result.error(departmentResult.error);
			}

			// Persist via repository
			const saveResult = await this.departmentRepository.save(departmentResult.value);
			if (saveResult.isError) return saveResult;

			return Result.ok(saveResult.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to create department', 'DEPARTMENT_CREATE_FAILED', {
					data,
					originalError: error
				})
			);
		}
	}

	/**
	 * Update department properties (name, description, manager).
	 *
	 * @param id - Department UUID
	 * @param updates - Properties to update
	 * @returns Result containing updated Department or error
	 */
	async updateDepartment(
		id: string,
		updates: {
			name?: string;
			description?: string | null;
			managerId?: string | null;
		}
	): Promise<Result<Department, DomainError>> {
		try {
			// Fetch existing department
			const deptResult = await this.departmentRepository.findById(id);
			if (deptResult.isError) {
				return Result.error(deptResult.error);
			}

			if (!deptResult.value) {
				return Result.error(new DepartmentNotFoundError(id));
			}

			let department = deptResult.value;

			// Update name with uniqueness check
			if (updates.name !== undefined) {
				// Check if name changed (case-insensitive)
				const nameChanged = updates.name.toLowerCase() !== department.name.value.toLowerCase();

				if (nameChanged) {
					// Check uniqueness within parent scope
					const uniqueResult = await this.departmentRepository.isNameUnique(
						updates.name,
						department.parentId,
						id
					);
					if (uniqueResult.isError) {
						return Result.error(uniqueResult.error);
					}

					if (!uniqueResult.value) {
						return Result.error(
							new DepartmentAlreadyExistsError(updates.name, department.parentId)
						);
					}
				}

				const renameResult = department.rename(updates.name);
				if (renameResult.isError) return renameResult;
				department = renameResult.value;
			}

			// Update description
			if (updates.description !== undefined) {
				const descResult = department.updateDescription(updates.description);
				if (descResult.isError) return descResult;
				department = descResult.value;
			}

			// Update manager
			if (updates.managerId !== undefined) {
				const managerResult = department.setManager(updates.managerId);
				if (managerResult.isError) return managerResult;
				department = managerResult.value;
			}

			// Save updated department
			const saveResult = await this.departmentRepository.update(id, department);
			if (saveResult.isError) return saveResult;

			return Result.ok(saveResult.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to update department', 'DEPARTMENT_UPDATE_FAILED', {
					departmentId: id,
					updates,
					originalError: error
				})
			);
		}
	}

	/**
	 * Move department to a new parent (reparent).
	 * Updates ancestor chain for department and all descendants.
	 *
	 * @param departmentId - Department UUID to move
	 * @param newParentId - New parent UUID (null for root)
	 * @returns Result containing updated Department or error
	 */
	async moveDepartment(
		departmentId: string,
		newParentId: string | null
	): Promise<Result<Department, DomainError>> {
		try {
			// Fetch department to move
			const deptResult = await this.departmentRepository.findById(departmentId);
			if (deptResult.isError) {
				return Result.error(deptResult.error);
			}

			if (!deptResult.value) {
				return Result.error(new DepartmentNotFoundError(departmentId));
			}

			const department = deptResult.value;

			// Prevent self-referencing
			if (newParentId === departmentId) {
				return Result.error(new CircularDepartmentReferenceError(departmentId, newParentId));
			}

			// If moving to a parent, validate it exists and check for circular references
			let newAncestorIds: string[] = [];
			if (newParentId) {
				const parentResult = await this.departmentRepository.findById(newParentId);
				if (parentResult.isError) {
					return Result.error(parentResult.error);
				}

				if (!parentResult.value) {
					return Result.error(new DepartmentNotFoundError(newParentId));
				}

				const parent = parentResult.value;

				// Check for circular reference: parent cannot be a descendant of department
				if (parent.ancestorIds.includes(departmentId)) {
					return Result.error(new CircularDepartmentReferenceError(departmentId, newParentId));
				}

				// Build new ancestor chain
				newAncestorIds = [newParentId, ...parent.ancestorIds];
			}

			// Move the department
			const moveResult = department.move(newParentId, newAncestorIds);
			if (moveResult.isError) return moveResult;

			// Get all descendants to update their ancestor chains
			const descendantsResult = await this.departmentRepository.getDescendants(departmentId);
			if (descendantsResult.isError) {
				return Result.error(descendantsResult.error);
			}

			const descendants = descendantsResult.value;

			// Prepare bulk update: moved department + all descendants
			const updates: Array<[string, Department]> = [[departmentId, moveResult.value]];

			// Update each descendant's ancestor chain
			for (const descendant of descendants) {
				// Find position of moved department in descendant's ancestor chain
				const indexOfMovedDept = descendant.ancestorIds.indexOf(departmentId);

				if (indexOfMovedDept !== -1) {
					// Rebuild ancestor chain: [ancestors before moved dept] + [moved dept] + [new ancestors]
					const beforeMovedDept = descendant.ancestorIds.slice(0, indexOfMovedDept);
					const newDescendantAncestors = [...beforeMovedDept, departmentId, ...newAncestorIds];

					// Get immediate parent of descendant
					const descendantParentId = descendant.parentId;

					const descendantMoveResult = descendant.move(descendantParentId, newDescendantAncestors);
					if (descendantMoveResult.isError) return descendantMoveResult;

					updates.push([descendant.id, descendantMoveResult.value]);
				}
			}

			// Execute atomic bulk update
			const bulkResult = await this.departmentRepository.bulkUpdate(updates);
			if (bulkResult.isError) {
				return Result.error(bulkResult.error);
			}

			// Return the moved department (first in bulk result)
			return Result.ok(bulkResult.value[0]);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to move department', 'DEPARTMENT_MOVE_FAILED', {
					departmentId,
					newParentId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Delete a department (soft delete).
	 * Checks constraints: no children, no employees.
	 *
	 * @param id - Department UUID
	 * @returns Result containing void or error
	 */
	async deleteDepartment(id: string): Promise<Result<void, DomainError>> {
		try {
			// Fetch department
			const deptResult = await this.departmentRepository.findById(id);
			if (deptResult.isError) {
				return Result.error(deptResult.error);
			}

			if (!deptResult.value) {
				return Result.error(new DepartmentNotFoundError(id));
			}

			const department = deptResult.value;

			// Check constraint: no children
			const childrenResult = await this.departmentRepository.getChildren(id);
			if (childrenResult.isError) {
				return Result.error(childrenResult.error);
			}

			if (childrenResult.value.length > 0) {
				return Result.error(
					new DepartmentDeletionError(
						id,
						`Department has ${childrenResult.value.length} child department(s). Remove children first.`
					)
				);
			}

			// Check constraint: no employees
			const employeeCountResult = await this.departmentRepository.getEmployeeCount(id);
			if (employeeCountResult.isError) {
				return Result.error(employeeCountResult.error);
			}

			if (employeeCountResult.value > 0) {
				return Result.error(
					new DepartmentDeletionError(
						id,
						`Department has ${employeeCountResult.value} employee(s). Reassign employees first.`
					)
				);
			}

			// Mark as deleted
			const deleteResult = department.delete();
			if (deleteResult.isError) return Result.error(deleteResult.error);

			// Persist deletion
			const saveResult = await this.departmentRepository.delete(id);
			if (saveResult.isError) return saveResult;

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to delete department', 'DEPARTMENT_DELETE_FAILED', {
					departmentId: id,
					originalError: error
				})
			);
		}
	}
}
