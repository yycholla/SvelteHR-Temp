// src/adapters/GraphQLDepartmentAdapter.ts
import type { DepartmentRepository } from '$services/ports/DepartmentRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import {
	Department,
	type FindDepartmentsFilter,
	type FindDepartmentsResult
} from '$domain/Department';
import { DomainError, Result } from '$domain';
import { gql } from '@urql/core';
import { logger } from '$lib/utils/logger';

/**
 * GraphQL response types matching backend schema
 */
interface GraphQLDepartment {
	id: string;
	name: string;
	description: string | null;
	managerId: string | null;
	parentDepartmentId: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt?: string | null;
}

interface GraphQLDepartmentQueryResult {
	items: GraphQLDepartment[];
	totalCount: number;
}

type GraphQLDepartmentsResponse = GraphQLDepartment[] | GraphQLDepartmentQueryResult;

/**
 * GraphQL Department Adapter
 *
 * Implements DepartmentRepository port using GraphQL backend.
 * Translates between GraphQL schema and Department domain entities.
 *
 * **Responsibilities:**
 * - Execute GraphQL queries/mutations via GraphQLPort
 * - Map GraphQL responses to Department entities
 * - Handle data validation and sanitization at boundary
 * - Wrap operations in Result<T, E> for type-safe error handling
 */
export class GraphQLDepartmentAdapter implements DepartmentRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	/**
	 * Find a department by ID.
	 *
	 * @param id - Department UUID
	 * @returns Department or null if not found
	 */
	async findById(id: string): Promise<Result<Department | null, DomainError>> {
		const query = gql`
			query GetDepartment($id: UUID!) {
				department(id: $id) {
					id
					name
					description
					managerId
					parentDepartmentId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ department: GraphQLDepartment | null }>(query, {
				id
			});

			if (!result?.department) {
				return Result.ok(null);
			}

			return this.mapToDepartment(result.department);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Error in findById',
				error instanceof Error ? error : undefined,
				{ id }
			);
			return Result.error(
				new DomainError('Failed to fetch department by ID', 'GRAPHQL_QUERY_ERROR', {
					id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Find departments with optional filters.
	 *
	 * @param filters - Optional filter criteria
	 * @returns Paginated department results
	 */
	async findAll(
		filters?: FindDepartmentsFilter
	): Promise<Result<FindDepartmentsResult, DomainError>> {
		const query = gql`
			query GetDepartments($limit: Int!, $offset: Int!) {
				departments(limit: $limit, offset: $offset) {
					items {
						id
						name
						description
						managerId
						parentDepartmentId
						createdAt
						updatedAt
					}
					totalCount
				}
			}
		`;

		try {
			const limit = filters?.limit ?? 100; // Use filter or backend default
			const page = filters?.page ?? 1;
			const offset = (page - 1) * limit;

			const result = await this.graphql.query<{ departments: GraphQLDepartmentsResponse }>(query, {
				limit,
				offset
			});

			const rawDepartments = result?.departments;
			const departmentItems = Array.isArray(rawDepartments)
				? rawDepartments
				: rawDepartments?.items;
			const totalCount = Array.isArray(rawDepartments)
				? rawDepartments.length
				: rawDepartments?.totalCount;

			if (!departmentItems) {
				return Result.ok({
					departments: [],
					total: 0,
					limit,
					offset
				});
			}

			// Map all departments and filter out invalid records
			// Use simple mapping for list operations (full ancestor chains built on-demand)
			const mappedResults = departmentItems.map((dept) => this.mapToDepartmentSimple(dept));

			const departments = mappedResults
				.filter((r) => r.isOk && r.value !== null)
				.map((r) => r.value!);

			// Save original count before filtering
			const allCount = totalCount || departments.length;

			// Apply client-side filters (backend limitation)
			const filtered = this.applyClientSideFilters(departments, filters);

			return Result.ok({
				departments: filtered.map((dept) => dept.toDTO()),
				total: allCount, // Use original count, not filtered count
				limit,
				offset
			});
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Error in findAll',
				error instanceof Error ? error : undefined,
				{
					filters
				}
			);
			return Result.error(
				new DomainError('Failed to fetch departments', 'GRAPHQL_QUERY_ERROR', {
					filters,
					originalError: error
				})
			);
		}
	}

	/**
	 * Find department by name within parent scope.
	 *
	 * @param name - Department name
	 * @param parentId - Parent department ID (null for root level)
	 * @returns Department or null if not found
	 */
	async findByName(
		name: string,
		parentId: string | null
	): Promise<Result<Department | null, DomainError>> {
		// Fetch all departments and filter client-side (backend limitation)
		const allResult = await this.findAll();
		if (allResult.isError) return Result.error(allResult.error);

		const normalizedName = name.trim().toLowerCase();
		const found = allResult.value.departments.find(
			(dept) =>
				dept.name.toLowerCase() === normalizedName &&
				(parentId ? dept.parentId === parentId : dept.parentId === null)
		);

		if (!found) {
			return Result.ok(null);
		}

		// Reconstruct Department entity from DTO
		return Department.create({
			id: found.id,
			name: found.name,
			parentId: found.parentId,
			ancestorIds: found.ancestorIds,
			managerId: found.managerId,
			description: found.description,
			employeeCount: found.employeeCount,
			isDeleted: found.isDeleted
		});
	}

	/**
	 * Check if a department exists by ID.
	 *
	 * @param id - Department UUID
	 * @returns true if department exists
	 */
	async exists(id: string): Promise<Result<boolean, DomainError>> {
		const result = await this.findById(id);
		if (result.isError) return Result.error(result.error);
		return Result.ok(result.value !== null);
	}

	/**
	 * Check if a department name is unique within parent scope.
	 *
	 * @param name - Department name
	 * @param parentId - Parent department ID (null for root level)
	 * @param excludeId - Optional department ID to exclude (for updates)
	 * @returns true if name is unique
	 */
	async isNameUnique(
		name: string,
		parentId: string | null,
		excludeId?: string
	): Promise<Result<boolean, DomainError>> {
		const query = gql`
			query IsDepartmentNameUnique(
				$name: String!
				$parentDepartmentId: UUID
				$excludeDepartmentId: UUID
			) {
				isDepartmentNameUnique(
					name: $name
					parentDepartmentId: $parentDepartmentId
					excludeDepartmentId: $excludeDepartmentId
				)
			}
		`;

		try {
			const result = await this.graphql.query<{ isDepartmentNameUnique: boolean }>(query, {
				name,
				parentDepartmentId: parentId,
				excludeDepartmentId: excludeId
			});

			return Result.ok(result?.isDepartmentNameUnique ?? false);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Error in isNameUnique',
				error instanceof Error ? error : undefined,
				{
					name,
					parentId,
					excludeId
				}
			);
			return Result.error(
				new DomainError('Failed to check name uniqueness', 'GRAPHQL_QUERY_ERROR', {
					name,
					parentId,
					excludeId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all ancestor departments (parents up to root).
	 *
	 * @param departmentId - Starting department ID
	 * @returns Ordered list from immediate parent to root
	 */
	async getAncestors(departmentId: string): Promise<Result<Department[], DomainError>> {
		const query = gql`
			query GetDepartmentAncestors($departmentId: UUID!) {
				getDepartmentAncestors(departmentId: $departmentId) {
					id
					name
					description
					managerId
					parentDepartmentId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ getDepartmentAncestors: GraphQLDepartment[] }>(
				query,
				{
					departmentId
				}
			);

			if (!result?.getDepartmentAncestors) {
				return Result.ok([]);
			}

			// Map all ancestors (use simple mapping to avoid circular dependency)
			const mappedResults = result.getDepartmentAncestors.map((dept) =>
				this.mapToDepartmentSimple(dept)
			);

			const ancestors = mappedResults
				.filter((r) => r.isOk && r.value !== null)
				.map((r) => r.value!);

			return Result.ok(ancestors);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Error in getAncestors',
				error instanceof Error ? error : undefined,
				{
					departmentId
				}
			);
			return Result.error(
				new DomainError('Failed to fetch department ancestors', 'GRAPHQL_QUERY_ERROR', {
					departmentId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all descendant departments (children recursively).
	 *
	 * @param departmentId - Root department ID
	 * @returns All descendants in breadth-first order
	 */
	async getDescendants(departmentId: string): Promise<Result<Department[], DomainError>> {
		const query = gql`
			query GetDepartmentDescendants($departmentId: UUID!) {
				getDepartmentDescendants(departmentId: $departmentId) {
					id
					name
					description
					managerId
					parentDepartmentId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ getDepartmentDescendants: GraphQLDepartment[] }>(
				query,
				{
					departmentId
				}
			);

			if (!result?.getDepartmentDescendants) {
				return Result.ok([]);
			}

			// Map all descendants (use simple mapping to avoid circular dependency)
			const mappedResults = result.getDepartmentDescendants.map((dept) =>
				this.mapToDepartmentSimple(dept)
			);

			const descendants = mappedResults
				.filter((r) => r.isOk && r.value !== null)
				.map((r) => r.value!);

			return Result.ok(descendants);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Error in getDescendants',
				error instanceof Error ? error : undefined,
				{
					departmentId
				}
			);
			return Result.error(
				new DomainError('Failed to fetch department descendants', 'GRAPHQL_QUERY_ERROR', {
					departmentId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get immediate children of a department.
	 *
	 * @param departmentId - Parent department ID
	 * @returns Direct child departments only
	 */
	async getChildren(departmentId: string): Promise<Result<Department[], DomainError>> {
		// Fetch all departments and filter for children (backend limitation)
		const allResult = await this.findAll();
		if (allResult.isError) return Result.error(allResult.error);

		const children = allResult.value.departments
			.filter((dept) => dept.parentId === departmentId)
			.map((dto) =>
				Department.create({
					id: dto.id,
					name: dto.name,
					parentId: dto.parentId,
					ancestorIds: dto.ancestorIds,
					managerId: dto.managerId,
					description: dto.description,
					employeeCount: dto.employeeCount,
					isDeleted: dto.isDeleted
				})
			);

		// Filter out errors and extract valid departments
		const validChildren = children.filter((r) => r.isOk).map((r) => r.value);

		return Result.ok(validChildren);
	}

	/**
	 * Get employee count for a department.
	 *
	 * @param departmentId - Department UUID
	 * @returns Number of active employees in department
	 */
	async getEmployeeCount(departmentId: string): Promise<Result<number, DomainError>> {
		const query = gql`
			query CountEmployeesByDepartment($departmentId: UUID!) {
				countEmployeesByDepartment(departmentId: $departmentId)
			}
		`;

		try {
			const result = await this.graphql.query<{ countEmployeesByDepartment: number }>(query, {
				departmentId
			});

			return Result.ok(result?.countEmployeesByDepartment ?? 0);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Error in getEmployeeCount',
				error instanceof Error ? error : undefined,
				{
					departmentId
				}
			);
			return Result.error(
				new DomainError('Failed to get employee count', 'GRAPHQL_QUERY_ERROR', {
					departmentId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Create a new department.
	 *
	 * @param department - Department entity to save
	 * @returns Saved department
	 */
	async save(department: Department): Promise<Result<Department, DomainError>> {
		const mutation = gql`
			mutation CreateDepartment($input: CreateDepartmentInput!) {
				createDepartment(input: $input) {
					id
					name
					description
					managerId
					parentDepartmentId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = {
				name: department.name.value,
				description: department.description,
				managerId: department.managerId,
				parentDepartmentId: department.parentId
			};

			const result = await this.graphql.mutation<{ createDepartment: GraphQLDepartment }>(
				mutation,
				{ input }
			);

			if (!result?.createDepartment) {
				return Result.error(
					new DomainError('Create department mutation returned no data', 'GRAPHQL_MUTATION_ERROR')
				);
			}

			return this.mapToDepartment(result.createDepartment);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Error in save',
				error instanceof Error ? error : undefined,
				{
					departmentId: department.id
				}
			);
			return Result.error(
				new DomainError('Failed to create department', 'GRAPHQL_MUTATION_ERROR', {
					department: department.toDTO(),
					originalError: error
				})
			);
		}
	}

	/**
	 * Update an existing department.
	 *
	 * @param id - Department UUID
	 * @param department - Updated department entity
	 * @returns Updated department
	 */
	async update(id: string, department: Department): Promise<Result<Department, DomainError>> {
		const mutation = gql`
			mutation UpdateDepartment($id: UUID!, $input: UpdateDepartmentInput!) {
				updateDepartment(id: $id, input: $input) {
					id
					name
					description
					managerId
					parentDepartmentId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = {
				name: department.name.value,
				description: department.description,
				managerId: department.managerId,
				parentDepartmentId: department.parentId
			};

			const result = await this.graphql.mutation<{ updateDepartment: GraphQLDepartment }>(
				mutation,
				{ id, input }
			);

			if (!result?.updateDepartment) {
				return Result.error(
					new DomainError('Update department mutation returned no data', 'GRAPHQL_MUTATION_ERROR')
				);
			}

			return this.mapToDepartment(result.updateDepartment);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Error in update',
				error instanceof Error ? error : undefined,
				{
					departmentId: id
				}
			);
			return Result.error(
				new DomainError('Failed to update department', 'GRAPHQL_MUTATION_ERROR', {
					id,
					department: department.toDTO(),
					originalError: error
				})
			);
		}
	}

	/**
	 * Bulk update multiple departments atomically.
	 *
	 * @param updates - Array of [id, department] pairs
	 * @returns All updated departments or error (atomic operation)
	 */
	async bulkUpdate(
		updates: Array<[string, Department]>
	): Promise<Result<Department[], DomainError>> {
		const mutation = gql`
			mutation BulkUpdateDepartments($inputs: [BulkUpdateDepartmentInput!]!) {
				bulkUpdateDepartments(inputs: $inputs) {
					id
					name
					description
					managerId
					parentDepartmentId
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const inputs = updates.map(([id, dept]) => ({
				id,
				name: dept.name.value,
				description: dept.description,
				managerId: dept.managerId,
				parentDepartmentId: dept.parentId
			}));

			const result = await this.graphql.mutation<{ bulkUpdateDepartments: GraphQLDepartment[] }>(
				mutation,
				{ inputs }
			);

			if (!result?.bulkUpdateDepartments) {
				return Result.error(
					new DomainError(
						'Bulk update departments mutation returned no data',
						'GRAPHQL_MUTATION_ERROR'
					)
				);
			}

			// Map all updated departments (use simple mapping for bulk operations)
			const mappedResults = result.bulkUpdateDepartments.map((dept) =>
				this.mapToDepartmentSimple(dept)
			);

			// Check for any mapping errors
			const errors = mappedResults.filter((r) => r.isError);
			if (errors.length > 0) {
				return Result.error(
					new DomainError('Failed to map some updated departments', 'DOMAIN_MAPPING_ERROR', {
						errorCount: errors.length
					})
				);
			}

			const departments = mappedResults.map((r) => r.value!);
			return Result.ok(departments);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Error in bulkUpdate',
				error instanceof Error ? error : undefined,
				{
					updateCount: updates.length
				}
			);
			return Result.error(
				new DomainError('Failed to bulk update departments', 'GRAPHQL_MUTATION_ERROR', {
					updateCount: updates.length,
					originalError: error
				})
			);
		}
	}

	/**
	 * Soft delete a department.
	 *
	 * @param id - Department UUID
	 * @returns void on success
	 */
	async delete(id: string): Promise<Result<void, DomainError>> {
		const mutation = gql`
			mutation DeleteDepartment($id: UUID!) {
				deleteDepartment(id: $id)
			}
		`;

		try {
			await this.graphql.mutation(mutation, { id });
			return Result.ok(undefined);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Error in delete',
				error instanceof Error ? error : undefined,
				{
					departmentId: id
				}
			);
			return Result.error(
				new DomainError('Failed to delete department', 'GRAPHQL_MUTATION_ERROR', {
					id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Apply client-side filters (backend limitation).
	 *
	 * @param departments - All departments
	 * @param filters - Filter criteria
	 * @returns Filtered departments
	 */
	private applyClientSideFilters(
		departments: Department[],
		filters?: FindDepartmentsFilter
	): Department[] {
		if (!filters) return departments;

		return departments.filter((dept) => {
			// Filter by search term
			if (filters.searchTerm) {
				const searchLower = filters.searchTerm.toLowerCase();
				const matchesName = dept.name.value.toLowerCase().includes(searchLower);
				const matchesDescription = dept.description?.toLowerCase().includes(searchLower) ?? false;

				if (!matchesName && !matchesDescription) {
					return false;
				}
			}

			// Filter by parent ID
			if (filters.parentId !== undefined) {
				if (dept.parentId !== filters.parentId) {
					return false;
				}
			}

			// Filter root only
			if (filters.rootOnly && !dept.isRoot) {
				return false;
			}

			// Filter by manager ID
			if (filters.managerId && dept.managerId !== filters.managerId) {
				return false;
			}

			// Filter deleted departments
			if (!filters.includeDeleted && dept.isDeleted) {
				return false;
			}

			return true;
		});
	}

	/**
	 * Map GraphQL department data to domain Department entity (with ancestor chain).
	 *
	 * **Resilience Strategy**: Returns Result.error for invalid records.
	 * Invalid data is logged with warnings for monitoring.
	 *
	 * This is the main mapping method that builds complete ancestor chains.
	 *
	 * @returns Result containing Department or error
	 */
	private async mapToDepartment(data: GraphQLDepartment): Promise<Result<Department, DomainError>> {
		try {
			// Build ancestor chain by recursively fetching parent departments
			// Note: This is N+1 query pattern, but necessary until backend provides ancestor_ids
			const ancestorIds: string[] = [];
			if (data.parentDepartmentId) {
				// Fetch parent department
				const parentResult = await this.findById(data.parentDepartmentId);
				if (parentResult.isOk && parentResult.value) {
					const parent = parentResult.value;
					// Ancestor chain: [parentId, ...parent's ancestors]
					ancestorIds.push(data.parentDepartmentId, ...parent.ancestorIds);
				} else {
					// Log warning but continue with partial chain
					logger.warn('[GraphQLDepartmentAdapter] Failed to fetch parent for ancestor chain', {
						departmentId: data.id,
						parentId: data.parentDepartmentId,
						error: parentResult.isError ? parentResult.error.message : 'Parent not found'
					});
					// Use at least the immediate parent
					ancestorIds.push(data.parentDepartmentId);
				}
			}

			const result = Department.create({
				id: data.id,
				name: data.name,
				parentId: data.parentDepartmentId,
				ancestorIds,
				managerId: data.managerId,
				description: data.description,
				employeeCount: 0, // Will be fetched separately if needed
				isDeleted: data.deletedAt != null
			});

			if (result.isError) {
				logger.warn('[GraphQLDepartmentAdapter] Failed to map department', {
					departmentId: data.id,
					name: data.name,
					error: result.error.message,
					reason: 'Domain validation failed'
				});
				return Result.error(result.error);
			}

			return Result.ok(result.value);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Exception in mapToDepartment',
				error instanceof Error ? error : undefined,
				{
					departmentId: data.id
				}
			);
			return Result.error(
				new DomainError('Failed to map department', 'DOMAIN_MAPPING_ERROR', {
					departmentId: data.id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Map GraphQL department data to domain Department entity (without fetching ancestors).
	 *
	 * Used for mapping ancestor/descendant lists to avoid circular dependencies.
	 * Builds minimal ancestor chain from parentId only.
	 *
	 * @returns Result containing Department or error
	 */
	private mapToDepartmentSimple(data: GraphQLDepartment): Result<Department, DomainError> {
		try {
			// Simple ancestor chain: just the parent ID if it exists
			const ancestorIds = data.parentDepartmentId ? [data.parentDepartmentId] : [];

			const result = Department.create({
				id: data.id,
				name: data.name,
				parentId: data.parentDepartmentId,
				ancestorIds,
				managerId: data.managerId,
				description: data.description,
				employeeCount: 0,
				isDeleted: data.deletedAt != null
			});

			if (result.isError) {
				logger.warn('[GraphQLDepartmentAdapter] Failed to map department (simple)', {
					departmentId: data.id,
					name: data.name,
					error: result.error.message
				});
				return Result.error(result.error);
			}

			return Result.ok(result.value);
		} catch (error) {
			logger.error(
				'[GraphQLDepartmentAdapter] Exception in mapToDepartmentSimple',
				error instanceof Error ? error : undefined,
				{
					departmentId: data.id
				}
			);
			return Result.error(
				new DomainError('Failed to map department (simple)', 'DOMAIN_MAPPING_ERROR', {
					departmentId: data.id,
					originalError: error
				})
			);
		}
	}
}
