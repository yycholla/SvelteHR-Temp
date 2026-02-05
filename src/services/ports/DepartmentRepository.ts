// src/services/ports/DepartmentRepository.ts
import type { Department } from '$domain/Department/Department';
import type { Result } from '$domain/Result';
import type { DomainError } from '$domain/errors';
import type {
	FindDepartmentsFilter,
	FindDepartmentsResult,
	DepartmentDTO
} from '$domain/Department/types';

/**
 * Department repository port (interface).
 *
 * Defines contract for department data access.
 * Implemented by adapters (GraphQL, REST, etc.).
 *
 * All methods return Result<T, E> for type-safe error handling.
 */
export interface DepartmentRepository {
	/**
	 * Find a department by ID.
	 *
	 * @param id - Department UUID
	 * @returns Department or null if not found
	 */
	findById(id: string): Promise<Result<Department | null, DomainError>>;

	/**
	 * Find departments with optional filters.
	 *
	 * @param filters - Optional filter criteria
	 * @returns Paginated department results
	 */
	findAll(filters?: FindDepartmentsFilter): Promise<Result<FindDepartmentsResult, DomainError>>;

	/**
	 * Find department by name within parent scope.
	 *
	 * @param name - Department name
	 * @param parentId - Parent department ID (null for root level)
	 * @returns Department or null if not found
	 */
	findByName(
		name: string,
		parentId: string | null
	): Promise<Result<Department | null, DomainError>>;

	/**
	 * Check if a department exists by ID.
	 *
	 * @param id - Department UUID
	 * @returns true if department exists
	 */
	exists(id: string): Promise<Result<boolean, DomainError>>;

	/**
	 * Check if a department name is unique within parent scope.
	 *
	 * @param name - Department name
	 * @param parentId - Parent department ID (null for root level)
	 * @param excludeId - Optional department ID to exclude (for updates)
	 * @returns true if name is unique
	 */
	isNameUnique(
		name: string,
		parentId: string | null,
		excludeId?: string
	): Promise<Result<boolean, DomainError>>;

	/**
	 * Get all ancestor departments (parents up to root).
	 *
	 * @param departmentId - Starting department ID
	 * @returns Ordered list from immediate parent to root
	 */
	getAncestors(departmentId: string): Promise<Result<Department[], DomainError>>;

	/**
	 * Get all descendant departments (children recursively).
	 *
	 * @param departmentId - Root department ID
	 * @returns All descendants in breadth-first order
	 */
	getDescendants(departmentId: string): Promise<Result<Department[], DomainError>>;

	/**
	 * Get immediate children of a department.
	 *
	 * @param departmentId - Parent department ID
	 * @returns Direct child departments only
	 */
	getChildren(departmentId: string): Promise<Result<Department[], DomainError>>;

	/**
	 * Get employee count for a department.
	 *
	 * @param departmentId - Department UUID
	 * @returns Number of active employees in department
	 */
	getEmployeeCount(departmentId: string): Promise<Result<number, DomainError>>;

	/**
	 * Create a new department.
	 *
	 * @param department - Department entity to save
	 * @returns Saved department
	 */
	save(department: Department): Promise<Result<Department, DomainError>>;

	/**
	 * Update an existing department.
	 *
	 * @param id - Department UUID
	 * @param department - Updated department entity
	 * @returns Updated department
	 */
	update(id: string, department: Department): Promise<Result<Department, DomainError>>;

	/**
	 * Bulk update multiple departments atomically.
	 *
	 * @param updates - Array of [id, department] pairs
	 * @returns All updated departments or error (atomic operation)
	 */
	bulkUpdate(updates: Array<[string, Department]>): Promise<Result<Department[], DomainError>>;

	/**
	 * Soft delete a department.
	 *
	 * @param id - Department UUID
	 * @returns void on success
	 */
	delete(id: string): Promise<Result<void, DomainError>>;
}
