/**
 * GraphQL Employee Service
 * 
 * High-level service layer for employee management using GraphQL operations.
 * Provides abstracted methods for components to interact with employee data
 * without dealing directly with GraphQL queries and mutations.
 */

import { browser } from '$app/environment';
import { createGraphQLClient, createServerClient, type ServerGraphQLClient, type BrowserGraphQLClient } from '../client-factory';
import {
	GET_EMPLOYEES,
	GET_EMPLOYEE,
	GET_EMPLOYEE_BY_EMPLOYEE_ID,
	SEARCH_EMPLOYEES,
	GET_EMPLOYEES_BY_DEPARTMENT,
	GET_EMPLOYEE_REPORTS,
	GET_EMPLOYEES_BY_STATUS,
	GET_EMPLOYEE_STATS,
	GET_EMPLOYEES_FOR_BULK,
	CREATE_EMPLOYEE,
	UPDATE_EMPLOYEE,
	DEACTIVATE_EMPLOYEE,
	REACTIVATE_EMPLOYEE,
	TERMINATE_EMPLOYEE,
	TRANSFER_EMPLOYEE,
	UPDATE_EMPLOYEE_MANAGER,
	BULK_UPDATE_EMPLOYEES,
	IMPORT_EMPLOYEES,
	UPDATE_EMPLOYEE_AVATAR,
	ADD_EMPLOYEE_ROLE,
	REMOVE_EMPLOYEE_ROLE,
	buildEmployeeFilter,
	validateEmployeeInput,
	prepareEmployeeInput,
	generateEmployeeId,
	formatEmployeeForExport,
	getEmployeeDisplayName,
	getEmployeeInitials,
	formatEmployeeStatus,
	formatEmploymentType,
	isEmployeeActive,
	canEditEmployee,
	getStatusBadgeColor,
	type GetEmployeesVariables,
	type GetEmployeesQuery,
	type GetEmployeeVariables,
	type GetEmployeeQuery,
	type SearchEmployeesVariables,
	type SearchEmployeesQuery,
	type CreateEmployeeVariables,
	type CreateEmployeeMutation,
	type UpdateEmployeeVariables,
	type UpdateEmployeeMutation,
	type BulkUpdateEmployeesVariables,
	type BulkUpdateEmployeesMutation,
	type ImportEmployeesVariables,
	type ImportEmployeesMutation,
	type EmployeeFilterInput,
	type EmployeeStats
} from '../operations/employees';
import type { GraphQLResponse } from '../types';
import type { Employee, EmployeeStatus, EmploymentType, EmployeeSortField, SortDirection } from '../generated/graphql';

/**
 * Employee service configuration
 */
export interface EmployeeServiceConfig {
	defaultPageSize?: number;
	enableCaching?: boolean;
	autoRefresh?: boolean;
}

/**
 * Employee service result interfaces
 */
export interface EmployeeServiceResult<T = any> {
	success: boolean;
	data?: T;
	message?: string;
	errors?: Array<{ field: string; message: string }>;
}

export interface EmployeeListResult {
	employees: Employee[];
	totalCount: number;
	hasNextPage: boolean;
	endCursor?: string;
}

export interface EmployeeBulkResult {
	success: boolean;
	updated_count: number;
	failed_count: number;
	results: Array<{
		employee_id: string;
		success: boolean;
		error?: string;
	}>;
}

/**
 * GraphQL Employee Service Class
 */
export class GraphQLEmployeeService {
	private client: ServerGraphQLClient | BrowserGraphQLClient;
	private config: EmployeeServiceConfig;
	
	constructor(
		token?: string,
		config: EmployeeServiceConfig = {}
	) {
		this.config = {
			defaultPageSize: 20,
			enableCaching: true,
			autoRefresh: false,
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
	 * Get employees with pagination and filtering
	 */
	async getEmployees(options: {
		page?: number;
		pageSize?: number;
		filter?: EmployeeFilterInput;
		sortBy?: EmployeeSortField;
		sortDirection?: SortDirection;
		after?: string;
	} = {}): Promise<EmployeeServiceResult<EmployeeListResult>> {
		try {
			const variables: GetEmployeesVariables = {
				first: options.pageSize || this.config.defaultPageSize,
				after: options.after,
				filter: options.filter,
				sortBy: options.sortBy,
				sortDirection: options.sortDirection
			};

			const result = await this.client.query<GetEmployeesQuery>(GET_EMPLOYEES, variables);
			
			if (result.success && result.data?.employees) {
				return {
					success: true,
					data: {
						employees: result.data.employees.nodes,
						totalCount: result.data.employees.totalCount,
						hasNextPage: result.data.employees.pageInfo.hasNextPage,
						endCursor: result.data.employees.pageInfo.endCursor
					}
				};
			}

			return {
				success: false,
				message: 'Failed to fetch employees',
				errors: result.errors?.map(e => ({ field: 'general', message: e.message }))
			};
		} catch (error) {
			console.error('Employee service error:', error);
			return {
				success: false,
				message: 'Employee fetch request failed',
				errors: [{ field: 'general', message: error instanceof Error ? error.message : 'Unknown error' }]
			};
		}
	}

	/**
	 * Get single employee by ID
	 */
	async getEmployee(id: string): Promise<EmployeeServiceResult<Employee>> {
		try {
			const result = await this.client.query<GetEmployeeQuery>(GET_EMPLOYEE, { id });
			
			if (result.success && result.data?.employee) {
				return {
					success: true,
					data: result.data.employee
				};
			}

			return {
				success: false,
				message: 'Employee not found'
			};
		} catch (error) {
			console.error('Employee fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch employee'
			};
		}
	}

	/**
	 * Get employee by employee ID
	 */
	async getEmployeeByEmployeeId(employeeId: string): Promise<EmployeeServiceResult<Employee>> {
		try {
			const result = await this.client.query(GET_EMPLOYEE_BY_EMPLOYEE_ID, { employeeId });
			
			if (result.success && result.data?.employeeByEmployeeId) {
				return {
					success: true,
					data: result.data.employeeByEmployeeId
				};
			}

			return {
				success: false,
				message: 'Employee not found'
			};
		} catch (error) {
			console.error('Employee fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch employee'
			};
		}
	}

	/**
	 * Search employees
	 */
	async searchEmployees(
		query: string,
		options: {
			limit?: number;
			filter?: EmployeeFilterInput;
		} = {}
	): Promise<EmployeeServiceResult<Employee[]>> {
		try {
			const variables: SearchEmployeesVariables = {
				query,
				first: options.limit || 10,
				filter: options.filter
			};

			const result = await this.client.query<SearchEmployeesQuery>(SEARCH_EMPLOYEES, variables);
			
			if (result.success && result.data?.searchEmployees) {
				return {
					success: true,
					data: result.data.searchEmployees.nodes
				};
			}

			return {
				success: false,
				message: 'Search failed'
			};
		} catch (error) {
			console.error('Employee search error:', error);
			return {
				success: false,
				message: 'Search request failed'
			};
		}
	}

	/**
	 * Get employees by department
	 */
	async getEmployeesByDepartment(
		departmentId: string,
		options: {
			limit?: number;
			includeSubdepartments?: boolean;
		} = {}
	): Promise<EmployeeServiceResult<Employee[]>> {
		try {
			const result = await this.client.query(GET_EMPLOYEES_BY_DEPARTMENT, {
				departmentId,
				first: options.limit || this.config.defaultPageSize,
				includeSubdepartments: options.includeSubdepartments || false
			});
			
			if (result.success && result.data?.department?.employees) {
				return {
					success: true,
					data: result.data.department.employees.nodes
				};
			}

			return {
				success: false,
				message: 'Failed to fetch department employees'
			};
		} catch (error) {
			console.error('Department employees fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch department employees'
			};
		}
	}

	/**
	 * Get employee direct reports
	 */
	async getEmployeeReports(managerId: string): Promise<EmployeeServiceResult<Employee[]>> {
		try {
			const result = await this.client.query(GET_EMPLOYEE_REPORTS, { managerId });
			
			if (result.success && result.data?.employee?.reports) {
				return {
					success: true,
					data: result.data.employee.reports
				};
			}

			return {
				success: false,
				message: 'Failed to fetch employee reports'
			};
		} catch (error) {
			console.error('Employee reports fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch employee reports'
			};
		}
	}

	/**
	 * Get employees by status
	 */
	async getEmployeesByStatus(
		status: EmployeeStatus,
		options: { limit?: number } = {}
	): Promise<EmployeeServiceResult<Employee[]>> {
		try {
			const result = await this.client.query(GET_EMPLOYEES_BY_STATUS, {
				status,
				first: options.limit || this.config.defaultPageSize
			});
			
			if (result.success && result.data?.employees) {
				return {
					success: true,
					data: result.data.employees.nodes
				};
			}

			return {
				success: false,
				message: 'Failed to fetch employees by status'
			};
		} catch (error) {
			console.error('Employees by status fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch employees by status'
			};
		}
	}

	/**
	 * Get employee statistics
	 */
	async getEmployeeStats(): Promise<EmployeeServiceResult<EmployeeStats>> {
		try {
			const result = await this.client.query(GET_EMPLOYEE_STATS);
			
			if (result.success && result.data?.employeeStats) {
				return {
					success: true,
					data: result.data.employeeStats
				};
			}

			return {
				success: false,
				message: 'Failed to fetch employee statistics'
			};
		} catch (error) {
			console.error('Employee stats fetch error:', error);
			return {
				success: false,
				message: 'Failed to fetch employee statistics'
			};
		}
	}

	/**
	 * Create new employee
	 */
	async createEmployee(employeeData: any): Promise<EmployeeServiceResult<Employee>> {
		try {
			// Validate input
			const validation = validateEmployeeInput(employeeData);
			if (!validation.isValid) {
				return {
					success: false,
					message: 'Validation failed',
					errors: validation.errors
				};
			}

			// Prepare input
			const input = prepareEmployeeInput(employeeData);
			const variables: CreateEmployeeVariables = { input };

			const result = await this.client.query<CreateEmployeeMutation>(CREATE_EMPLOYEE, variables);
			
			if (result.success && result.data?.createEmployee) {
				const createData = result.data.createEmployee;
				
				if (createData.success && createData.employee) {
					return {
						success: true,
						data: createData.employee,
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
				message: 'Employee creation failed'
			};
		} catch (error) {
			console.error('Employee creation error:', error);
			return {
				success: false,
				message: 'Employee creation request failed'
			};
		}
	}

	/**
	 * Update existing employee
	 */
	async updateEmployee(id: string, employeeData: any): Promise<EmployeeServiceResult<Employee>> {
		try {
			// Validate input
			const validation = validateEmployeeInput(employeeData);
			if (!validation.isValid) {
				return {
					success: false,
					message: 'Validation failed',
					errors: validation.errors
				};
			}

			// Prepare input
			const input = prepareEmployeeInput(employeeData);
			const variables: UpdateEmployeeVariables = { id, input };

			const result = await this.client.query<UpdateEmployeeMutation>(UPDATE_EMPLOYEE, variables);
			
			if (result.success && result.data?.updateEmployee) {
				const updateData = result.data.updateEmployee;
				
				if (updateData.success && updateData.employee) {
					return {
						success: true,
						data: updateData.employee,
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
				message: 'Employee update failed'
			};
		} catch (error) {
			console.error('Employee update error:', error);
			return {
				success: false,
				message: 'Employee update request failed'
			};
		}
	}

	/**
	 * Deactivate employee
	 */
	async deactivateEmployee(id: string, reason?: string): Promise<EmployeeServiceResult<Employee>> {
		try {
			const result = await this.client.query(DEACTIVATE_EMPLOYEE, { id, reason });
			
			if (result.success && result.data?.deactivateEmployee) {
				const deactivateData = result.data.deactivateEmployee;
				
				return {
					success: deactivateData.success,
					data: deactivateData.employee,
					message: deactivateData.message
				};
			}

			return {
				success: false,
				message: 'Employee deactivation failed'
			};
		} catch (error) {
			console.error('Employee deactivation error:', error);
			return {
				success: false,
				message: 'Employee deactivation request failed'
			};
		}
	}

	/**
	 * Reactivate employee
	 */
	async reactivateEmployee(id: string, reason?: string): Promise<EmployeeServiceResult<Employee>> {
		try {
			const result = await this.client.query(REACTIVATE_EMPLOYEE, { id, reason });
			
			if (result.success && result.data?.reactivateEmployee) {
				const reactivateData = result.data.reactivateEmployee;
				
				return {
					success: reactivateData.success,
					data: reactivateData.employee,
					message: reactivateData.message
				};
			}

			return {
				success: false,
				message: 'Employee reactivation failed'
			};
		} catch (error) {
			console.error('Employee reactivation error:', error);
			return {
				success: false,
				message: 'Employee reactivation request failed'
			};
		}
	}

	/**
	 * Terminate employee
	 */
	async terminateEmployee(id: string, terminationDate: string, reason: string): Promise<EmployeeServiceResult<Employee>> {
		try {
			const result = await this.client.query(TERMINATE_EMPLOYEE, {
				id,
				termination_date: terminationDate,
				reason
			});
			
			if (result.success && result.data?.terminateEmployee) {
				const terminateData = result.data.terminateEmployee;
				
				return {
					success: terminateData.success,
					data: terminateData.employee,
					message: terminateData.message
				};
			}

			return {
				success: false,
				message: 'Employee termination failed'
			};
		} catch (error) {
			console.error('Employee termination error:', error);
			return {
				success: false,
				message: 'Employee termination request failed'
			};
		}
	}

	/**
	 * Transfer employee to different department
	 */
	async transferEmployee(
		id: string,
		departmentId: string,
		effectiveDate: string,
		newPosition?: string
	): Promise<EmployeeServiceResult<Employee>> {
		try {
			const result = await this.client.query(TRANSFER_EMPLOYEE, {
				id,
				department_id: departmentId,
				effective_date: effectiveDate,
				new_position: newPosition
			});
			
			if (result.success && result.data?.transferEmployee) {
				const transferData = result.data.transferEmployee;
				
				return {
					success: transferData.success,
					data: transferData.employee,
					message: transferData.message
				};
			}

			return {
				success: false,
				message: 'Employee transfer failed'
			};
		} catch (error) {
			console.error('Employee transfer error:', error);
			return {
				success: false,
				message: 'Employee transfer request failed'
			};
		}
	}

	/**
	 * Bulk update employees
	 */
	async bulkUpdateEmployees(
		employeeIds: string[],
		updates: {
			status?: EmployeeStatus;
			department_id?: string;
			manager_id?: string;
			employment_type?: EmploymentType;
			position?: string;
		}
	): Promise<EmployeeServiceResult<EmployeeBulkResult>> {
		try {
			const variables: BulkUpdateEmployeesVariables = {
				employee_ids: employeeIds,
				updates
			};

			const result = await this.client.query<BulkUpdateEmployeesMutation>(BULK_UPDATE_EMPLOYEES, variables);
			
			if (result.success && result.data?.bulkUpdateEmployees) {
				const bulkData = result.data.bulkUpdateEmployees;
				
				return {
					success: bulkData.success,
					data: {
						success: bulkData.success,
						updated_count: bulkData.updated_count,
						failed_count: bulkData.failed_count,
						results: bulkData.results
					},
					message: bulkData.message
				};
			}

			return {
				success: false,
				message: 'Bulk update failed'
			};
		} catch (error) {
			console.error('Bulk update error:', error);
			return {
				success: false,
				message: 'Bulk update request failed'
			};
		}
	}

	/**
	 * Import employees from CSV
	 */
	async importEmployees(
		csvData: string,
		options: {
			skipHeader?: boolean;
			validateOnly?: boolean;
			updateExisting?: boolean;
			defaultDepartmentId?: string;
			defaultManagerId?: string;
		} = {}
	): Promise<EmployeeServiceResult<any>> {
		try {
			const variables: ImportEmployeesVariables = {
				csv_data: csvData,
				options: {
					skip_header: options.skipHeader,
					validate_only: options.validateOnly,
					update_existing: options.updateExisting,
					default_department_id: options.defaultDepartmentId,
					default_manager_id: options.defaultManagerId
				}
			};

			const result = await this.client.query<ImportEmployeesMutation>(IMPORT_EMPLOYEES, variables);
			
			if (result.success && result.data?.importEmployees) {
				const importData = result.data.importEmployees;
				
				return {
					success: importData.success,
					data: {
						imported_count: importData.imported_count,
						failed_count: importData.failed_count,
						validation_errors: importData.validation_errors,
						created_employees: importData.created_employees
					},
					message: importData.message
				};
			}

			return {
				success: false,
				message: 'Employee import failed'
			};
		} catch (error) {
			console.error('Employee import error:', error);
			return {
				success: false,
				message: 'Employee import request failed'
			};
		}
	}

	/**
	 * Helper methods for common operations
	 */

	/**
	 * Build employee filter from search parameters
	 */
	buildFilter = buildEmployeeFilter;

	/**
	 * Format employee for display
	 */
	getDisplayName = getEmployeeDisplayName;

	/**
	 * Get employee initials
	 */
	getInitials = getEmployeeInitials;

	/**
	 * Format employee status
	 */
	formatStatus = formatEmployeeStatus;

	/**
	 * Format employment type
	 */
	formatEmploymentType = formatEmploymentType;

	/**
	 * Check if employee is active
	 */
	isActive = isEmployeeActive;

	/**
	 * Check if employee can be edited
	 */
	canEdit = canEditEmployee;

	/**
	 * Get status badge color
	 */
	getStatusColor = getStatusBadgeColor;

	/**
	 * Generate employee ID
	 */
	generateId = generateEmployeeId;

	/**
	 * Format employee for export
	 */
	formatForExport = formatEmployeeForExport;
}

/**
 * Factory functions for creating employee service
 */
export function createEmployeeService(token?: string, config?: EmployeeServiceConfig): GraphQLEmployeeService {
	return new GraphQLEmployeeService(token, config);
}

/**
 * Server-side employee service factory
 */
export function createServerEmployeeService(token: string, config?: EmployeeServiceConfig): GraphQLEmployeeService {
	const service = new GraphQLEmployeeService(token, config);
	service.setToken(token);
	return service;
}

/**
 * Browser-side employee service factory
 */
export function createBrowserEmployeeService(config?: EmployeeServiceConfig): GraphQLEmployeeService {
	if (!browser) {
		throw new Error('Browser employee service can only be created in browser environment');
	}
	
	return new GraphQLEmployeeService(undefined, config);
}