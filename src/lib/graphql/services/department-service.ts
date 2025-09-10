/**
 * GraphQL Department Service
 * 
 * High-level service layer for department management using GraphQL operations.
 * Provides abstracted methods for components to interact with department data,
 * hierarchy management, and budget operations.
 */

import { browser } from '$app/environment';
import { createGraphQLClient, createServerClient, type ServerGraphQLClient, type BrowserGraphQLClient } from '../client-factory';
import {
	GET_DEPARTMENTS,
	GET_DEPARTMENT,
	GET_DEPARTMENT_HIERARCHY,
	GET_DEPARTMENTS_BY_MANAGER,
	SEARCH_DEPARTMENTS,
	GET_DEPARTMENT_STATS,
	GET_DEPARTMENTS_LIST,
	CREATE_DEPARTMENT,
	UPDATE_DEPARTMENT,
	DELETE_DEPARTMENT,
	ACTIVATE_DEPARTMENT,
	DEACTIVATE_DEPARTMENT,
	MOVE_DEPARTMENT,
	UPDATE_DEPARTMENT_BUDGET,
	ASSIGN_DEPARTMENT_MANAGER,
	BULK_TRANSFER_EMPLOYEES,
	buildDepartmentPath,
	calculateBudgetUtilization,
	getBudgetStatusColor,
	formatBudgetAmount,
	getDepartmentSizeCategory,
	validateDepartmentHierarchy,
	buildDepartmentFilter,
	generateDepartmentCode,
	type GetDepartmentsVariables,
	type GetDepartmentsQuery,
	type GetDepartmentVariables,
	type GetDepartmentQuery,
	type SearchDepartmentsVariables,
	type CreateDepartmentVariables,
	type CreateDepartmentMutation,
	type UpdateDepartmentVariables,
	type UpdateDepartmentMutation,
	type DeleteDepartmentVariables,
	type DeleteDepartmentMutation,
	type BulkTransferEmployeesVariables,
	type DepartmentFilterInput,
	type DepartmentBudgetInput,
	type DepartmentStats
} from '../operations/departments';
import type { GraphQLResponse } from '../types';
import type { Department, DepartmentSortField, SortDirection } from '../generated/graphql';

/**
 * Department service configuration
 */
export interface DepartmentServiceConfig {
	defaultPageSize?: number;
	enableCaching?: boolean;
	autoRefresh?: boolean;
	includeInactive?: boolean;
}

/**
 * Department service result interfaces
 */
export interface DepartmentServiceResult<T = any> {
	success: boolean;
	data?: T;
	message?: string;
	errors?: Array<{ field: string; message: string }>;
}

export interface DepartmentListResult {
	departments: Department[];
	totalCount: number;
	hasNextPage: boolean;
	endCursor?: string;
}

export interface DepartmentHierarchyNode extends Department {
	level: number;
	path: string;
	children?: DepartmentHierarchyNode[];
}

export interface BulkTransferResult {
	success: boolean;
	transferred_count: number;
	failed_count: number;
	results: Array<{
		employee_id: string;
		employee_name: string;
		success: boolean;
		error?: string;
	}>;
}

/**
 * GraphQL Department Service Class
 */
export class GraphQLDepartmentService {
	private client: ServerGraphQLClient | BrowserGraphQLClient;
	private config: DepartmentServiceConfig;
	
	constructor(
		token?: string,
		config: DepartmentServiceConfig = {}
	) {
		this.config = {
			defaultPageSize: 20,
			enableCaching: true,
			autoRefresh: false,
			includeInactive: false,
			...config
		};

		// Create appropriate client based on environment
		this.client = browser 
			? createGraphQLClient()
			: createServerClient(token);
	}

	/**
	 * Set authentication token
	 */
	setToken(token: string): void {
		if ('setToken' in this.client) {
			this.client.setToken(token);
		}
	}

	/**
	 * Get departments with pagination and filtering
	 */
	async getDepartments(options: {
		page?: number;
		pageSize?: number;
		filter?: DepartmentFilterInput;
		sortBy?: DepartmentSortField;
		sortDirection?: SortDirection;
		includeInactive?: boolean;
		after?: string;
	} = {}): Promise<DepartmentServiceResult<DepartmentListResult>> {
		try {
			const variables: GetDepartmentsVariables = {
				first: options.pageSize || this.config.defaultPageSize,
				after: options.after,
				filter: options.filter,
				sortBy: options.sortBy,
				sortDirection: options.sortDirection,
				includeInactive: options.includeInactive ?? this.config.includeInactive
			};

			const result = await this.client.query<GetDepartmentsQuery>(GET_DEPARTMENTS, variables);
			
			if (result.success && result.data?.departments) {
				return {
					success: true,
					data: {
						departments: result.data.departments.nodes,
						totalCount: result.data.departments.totalCount,
						hasNextPage: result.data.departments.pageInfo.hasNextPage,
						endCursor: result.data.departments.pageInfo.endCursor
					}
				};
			}

			return {
				success: false,
				message: 'Failed to fetch departments',
				errors: result.errors?.map(e => ({ field: 'general', message: e.message }))
			};
		} catch (error) {
			console.error('Department service error:', error);
			return {
				success: false,
				message: 'Department fetch request failed',
				errors: [{ field: 'general', message: error instanceof Error ? error.message : 'Unknown error' }]
			};
		}
	}

	/**
	 * Get single department by ID
	 */
	async getDepartment(id: string, includeEmployees: boolean = true): Promise<DepartmentServiceResult<Department>> {
		try {
			const variables: GetDepartmentVariables = { id, includeEmployees };
			const result = await this.client.query<GetDepartmentQuery>(GET_DEPARTMENT, variables);
			
			if (result.success && result.data?.department) {
				return {
					success: true,
					data: result.data.department
				};
			}

			return {
				success: false,
				message: 'Department not found'
			};
		} catch (error) {
			console.error('Department fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch department'
			};
		}
	}

	/**
	 * Get department hierarchy
	 */
	async getDepartmentHierarchy(): Promise<DepartmentServiceResult<DepartmentHierarchyNode[]>> {
		try {
			const result = await this.client.query(GET_DEPARTMENT_HIERARCHY);
			
			if (result.success && result.data?.departmentHierarchy) {
				return {
					success: true,
					data: result.data.departmentHierarchy
				};
			}

			return {
				success: false,
				message: 'Failed to fetch department hierarchy'
			};
		} catch (error) {
			console.error('Department hierarchy fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch department hierarchy'
			};
		}
	}

	/**
	 * Get departments managed by a specific user
	 */
	async getDepartmentsByManager(managerId: string): Promise<DepartmentServiceResult<Department[]>> {
		try {
			const result = await this.client.query(GET_DEPARTMENTS_BY_MANAGER, { managerId });
			
			if (result.success && result.data?.departmentsByManager) {
				return {
					success: true,
					data: result.data.departmentsByManager
				};
			}

			return {
				success: false,
				message: 'Failed to fetch departments by manager'
			};
		} catch (error) {
			console.error('Departments by manager fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch departments by manager'
			};
		}
	}

	/**
	 * Search departments
	 */
	async searchDepartments(
		query: string,
		options: { limit?: number } = {}
	): Promise<DepartmentServiceResult<Department[]>> {
		try {
			const variables: SearchDepartmentsVariables = {
				query,
				first: options.limit || 10
			};

			const result = await this.client.query(SEARCH_DEPARTMENTS, variables);
			
			if (result.success && result.data?.searchDepartments) {
				return {
					success: true,
					data: result.data.searchDepartments.nodes
				};
			}

			return {
				success: false,
				message: 'Search failed'
			};
		} catch (error) {
			console.error('Department search error:', error);
			return {
				success: false,
				message: 'Search request failed'
			};
		}
	}

	/**
	 * Get department statistics
	 */
	async getDepartmentStats(): Promise<DepartmentServiceResult<DepartmentStats>> {
		try {
			const result = await this.client.query(GET_DEPARTMENT_STATS);
			
			if (result.success && result.data?.departmentStats) {
				return {
					success: true,
					data: result.data.departmentStats
				};
			}

			return {
				success: false,
				message: 'Failed to fetch department statistics'
			};
		} catch (error) {
			console.error('Department stats fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch department statistics'
			};
		}
	}

	/**
	 * Get departments list for dropdown/selection
	 */
	async getDepartmentsList(includeInactive: boolean = false): Promise<DepartmentServiceResult<Department[]>> {
		try {
			const result = await this.client.query(GET_DEPARTMENTS_LIST, { includeInactive });
			
			if (result.success && result.data?.departments) {
				return {
					success: true,
					data: result.data.departments.nodes
				};
			}

			return {
				success: false,
				message: 'Failed to fetch departments list'
			};
		} catch (error) {
			console.error('Departments list fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch departments list'
			};
		}
	}

	/**
	 * Create new department
	 */
	async createDepartment(departmentData: any): Promise<DepartmentServiceResult<Department>> {
		try {
			// Validate required fields
			if (!departmentData.name?.trim()) {
				return {
					success: false,
					message: 'Department name is required',
					errors: [{ field: 'name', message: 'Department name is required' }]
				};
			}

			const variables: CreateDepartmentVariables = {
				input: {
					...departmentData,
					name: departmentData.name.trim()
				}
			};

			const result = await this.client.query<CreateDepartmentMutation>(CREATE_DEPARTMENT, variables);
			
			if (result.success && result.data?.createDepartment) {
				const createData = result.data.createDepartment;
				
				if (createData.success && createData.department) {
					return {
						success: true,
						data: createData.department,
						message: createData.message
					};
				} else {
					return {
						success: false,
						message: createData.message,
						errors: createData.errors
					};
				}
			}

			return {
				success: false,
				message: 'Department creation failed'
			};
		} catch (error) {
			console.error('Department creation error:', error);
			return {
				success: false,
				message: 'Department creation request failed'
			};
		}
	}

	/**
	 * Update existing department
	 */
	async updateDepartment(id: string, departmentData: any): Promise<DepartmentServiceResult<Department>> {
		try {
			const variables: UpdateDepartmentVariables = {
				id,
				input: departmentData
			};

			const result = await this.client.query<UpdateDepartmentMutation>(UPDATE_DEPARTMENT, variables);
			
			if (result.success && result.data?.updateDepartment) {
				const updateData = result.data.updateDepartment;
				
				if (updateData.success && updateData.department) {
					return {
						success: true,
						data: updateData.department,
						message: updateData.message
					};
				} else {
					return {
						success: false,
						message: updateData.message,
						errors: updateData.errors
					};
				}
			}

			return {
				success: false,
				message: 'Department update failed'
			};
		} catch (error) {
			console.error('Department update error:', error);
			return {
				success: false,
				message: 'Department update request failed'
			};
		}
	}

	/**
	 * Delete department
	 */
	async deleteDepartment(id: string, reassignTo?: string): Promise<DepartmentServiceResult<any>> {
		try {
			const variables: DeleteDepartmentVariables = {
				id,
				reassign_to: reassignTo
			};

			const result = await this.client.query<DeleteDepartmentMutation>(DELETE_DEPARTMENT, variables);
			
			if (result.success && result.data?.deleteDepartment) {
				const deleteData = result.data.deleteDepartment;
				
				return {
					success: deleteData.success,
					data: {
						reassigned_employees: deleteData.reassigned_employees
					},
					message: deleteData.message
				};
			}

			return {
				success: false,
				message: 'Department deletion failed'
			};
		} catch (error) {
			console.error('Department deletion error:', error);
			return {
				success: false,
				message: 'Department deletion request failed'
			};
		}
	}

	/**
	 * Activate department
	 */
	async activateDepartment(id: string): Promise<DepartmentServiceResult<Department>> {
		try {
			const result = await this.client.query(ACTIVATE_DEPARTMENT, { id });
			
			if (result.success && result.data?.activateDepartment) {
				const activateData = result.data.activateDepartment;
				
				return {
					success: activateData.success,
					data: activateData.department,
					message: activateData.message
				};
			}

			return {
				success: false,
				message: 'Department activation failed'
			};
		} catch (error) {
			console.error('Department activation error:', error);
			return {
				success: false,
				message: 'Department activation request failed'
			};
		}
	}

	/**
	 * Deactivate department
	 */
	async deactivateDepartment(id: string, reassignEmployeesTo?: string): Promise<DepartmentServiceResult<any>> {
		try {
			const result = await this.client.query(DEACTIVATE_DEPARTMENT, {
				id,
				reassign_employees_to: reassignEmployeesTo
			});
			
			if (result.success && result.data?.deactivateDepartment) {
				const deactivateData = result.data.deactivateDepartment;
				
				return {
					success: deactivateData.success,
					data: {
						department: deactivateData.department,
						reassigned_employees: deactivateData.reassigned_employees
					},
					message: deactivateData.message
				};
			}

			return {
				success: false,
				message: 'Department deactivation failed'
			};
		} catch (error) {
			console.error('Department deactivation error:', error);
			return {
				success: false,
				message: 'Department deactivation request failed'
			};
		}
	}

	/**
	 * Move department in hierarchy
	 */
	async moveDepartment(id: string, newParentId?: string): Promise<DepartmentServiceResult<Department>> {
		try {
			const result = await this.client.query(MOVE_DEPARTMENT, {
				id,
				new_parent_id: newParentId
			});
			
			if (result.success && result.data?.moveDepartment) {
				const moveData = result.data.moveDepartment;
				
				return {
					success: moveData.success,
					data: moveData.department,
					message: moveData.message
				};
			}

			return {
				success: false,
				message: 'Department move failed'
			};
		} catch (error) {
			console.error('Department move error:', error);
			return {
				success: false,
				message: 'Department move request failed'
			};
		}
	}

	/**
	 * Update department budget
	 */
	async updateDepartmentBudget(
		id: string,
		budgetData: DepartmentBudgetInput
	): Promise<DepartmentServiceResult<Department>> {
		try {
			const result = await this.client.query(UPDATE_DEPARTMENT_BUDGET, {
				id,
				budget_input: budgetData
			});
			
			if (result.success && result.data?.updateDepartmentBudget) {
				const budgetUpdateData = result.data.updateDepartmentBudget;
				
				return {
					success: budgetUpdateData.success,
					data: budgetUpdateData.department,
					message: budgetUpdateData.message
				};
			}

			return {
				success: false,
				message: 'Department budget update failed'
			};
		} catch (error) {
			console.error('Department budget update error:', error);
			return {
				success: false,
				message: 'Department budget update request failed'
			};
		}
	}

	/**
	 * Assign department manager
	 */
	async assignDepartmentManager(departmentId: string, managerId: string): Promise<DepartmentServiceResult<Department>> {
		try {
			const result = await this.client.query(ASSIGN_DEPARTMENT_MANAGER, {
				department_id: departmentId,
				manager_id: managerId
			});
			
			if (result.success && result.data?.assignDepartmentManager) {
				const assignData = result.data.assignDepartmentManager;
				
				return {
					success: assignData.success,
					data: assignData.department,
					message: assignData.message
				};
			}

			return {
				success: false,
				message: 'Department manager assignment failed'
			};
		} catch (error) {
			console.error('Department manager assignment error:', error);
			return {
				success: false,
				message: 'Department manager assignment request failed'
			};
		}
	}

	/**
	 * Bulk transfer employees between departments
	 */
	async bulkTransferEmployees(
		employeeIds: string[],
		fromDepartmentId: string,
		toDepartmentId: string,
		effectiveDate: string,
		reason?: string
	): Promise<DepartmentServiceResult<BulkTransferResult>> {
		try {
			const variables: BulkTransferEmployeesVariables = {
				employee_ids: employeeIds,
				from_department_id: fromDepartmentId,
				to_department_id: toDepartmentId,
				effective_date: effectiveDate,
				reason
			};

			const result = await this.client.query(BULK_TRANSFER_EMPLOYEES, variables);
			
			if (result.success && result.data?.bulkTransferEmployees) {
				const transferData = result.data.bulkTransferEmployees;
				
				return {
					success: transferData.success,
					data: {
						success: transferData.success,
						transferred_count: transferData.transferred_count,
						failed_count: transferData.failed_count,
						results: transferData.results
					},
					message: transferData.message
				};
			}

			return {
				success: false,
				message: 'Bulk transfer failed'
			};
		} catch (error) {
			console.error('Bulk transfer error:', error);
			return {
				success: false,
				message: 'Bulk transfer request failed'
			};
		}
	}

	/**
	 * Helper methods for common operations
	 */

	/**
	 * Build department hierarchy path
	 */
	buildPath = buildDepartmentPath;

	/**
	 * Calculate budget utilization
	 */
	calculateBudgetUtilization = calculateBudgetUtilization;

	/**
	 * Get budget status color
	 */
	getBudgetStatusColor = getBudgetStatusColor;

	/**
	 * Format budget amount
	 */
	formatBudgetAmount = formatBudgetAmount;

	/**
	 * Get department size category
	 */
	getSizeCategory = getDepartmentSizeCategory;

	/**
	 * Validate department hierarchy
	 */
	validateHierarchy = validateDepartmentHierarchy;

	/**
	 * Build department filter
	 */
	buildFilter = buildDepartmentFilter;

	/**
	 * Generate department code
	 */
	generateCode = generateDepartmentCode;

	/**
	 * Validate department move (no circular references)
	 */
	async validateMove(departmentId: string, newParentId?: string): Promise<{ isValid: boolean; error?: string }> {
		if (!newParentId) return { isValid: true };

		try {
			// Get all departments to check hierarchy
			const result = await this.getDepartments({ pageSize: 1000 });
			
			if (result.success && result.data) {
				return this.validateHierarchy(departmentId, newParentId, result.data.departments);
			}

			return { isValid: false, error: 'Unable to validate department hierarchy' };
		} catch (error) {
			return { isValid: false, error: 'Validation request failed' };
		}
	}

	/**
	 * Get department tree structure for display
	 */
	async getDepartmentTree(): Promise<DepartmentServiceResult<DepartmentHierarchyNode[]>> {
		try {
			const hierarchyResult = await this.getDepartmentHierarchy();
			
			if (hierarchyResult.success && hierarchyResult.data) {
				// Transform flat hierarchy into tree structure
				const buildTree = (departments: any[], parentId: string | null = null): DepartmentHierarchyNode[] => {
					return departments
						.filter(dept => (parentId === null ? !dept.parent : dept.parent?.id === parentId))
						.map(dept => ({
							...dept,
							children: buildTree(departments, dept.id)
						}));
				};

				const tree = buildTree(hierarchyResult.data);
				
				return {
					success: true,
					data: tree
				};
			}

			return hierarchyResult;
		} catch (error) {
			console.error('Department tree fetch error:', error);
			return {
				success: false,
				message: 'Failed to build department tree'
			};
		}
	}
}

/**
 * Factory functions for creating department service
 */
export function createDepartmentService(token?: string, config?: DepartmentServiceConfig): GraphQLDepartmentService {
	return new GraphQLDepartmentService(token, config);
}

/**
 * Server-side department service factory
 */
export function createServerDepartmentService(token: string, config?: DepartmentServiceConfig): GraphQLDepartmentService {
	const service = new GraphQLDepartmentService(token, config);
	service.setToken(token);
	return service;
}

/**
 * Browser-side department service factory
 */
export function createBrowserDepartmentService(config?: DepartmentServiceConfig): GraphQLDepartmentService {
	if (!browser) {
		throw new Error('Browser department service can only be created in browser environment');
	}
	
	return new GraphQLDepartmentService(undefined, config);
}