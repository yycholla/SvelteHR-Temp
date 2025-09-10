/**
 * GraphQL Department Operations
 * 
 * Provides typesafe GraphQL queries and mutations for department management,
 * including hierarchical operations, budget management, and employee assignments.
 * 
 * Uses generated types from GraphQL schema contract.
 */

import type {
	Query,
	Mutation,
	Department,
	CreateDepartmentInput,
	UpdateDepartmentInput,
	DepartmentSortField,
	SortDirection
} from '../generated/graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

/**
 * Department Query Operations
 */

/**
 * Get all departments with pagination and hierarchy
 */
export const GET_DEPARTMENTS = `
	query GetDepartments(
		$first: Int
		$after: String
		$filter: DepartmentFilterInput
		$sortBy: DepartmentSortField
		$sortDirection: SortDirection
		$includeInactive: Boolean = false
	) {
		departments(
			first: $first
			after: $after
			filter: $filter
			sortBy: $sortBy
			sortDirection: $sortDirection
			includeInactive: $includeInactive
		) {
			nodes {
				id
				name
				description
				budget_code
				total_budget
				used_budget
				remaining_budget
				employee_count
				is_active
				created_at
				updated_at
				manager {
					id
					full_name
					email
				}
				parent {
					id
					name
				}
				children {
					id
					name
					employee_count
				}
				employees(first: 5) {
					nodes {
						id
						full_name
						position
						profile_picture_url
					}
					totalCount
				}
			}
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
			totalCount
		}
	}
` as const;

/**
 * Get single department by ID
 */
export const GET_DEPARTMENT = `
	query GetDepartment($id: ID!, $includeEmployees: Boolean = true) {
		department(id: $id) {
			id
			name
			description
			budget_code
			total_budget
			used_budget
			remaining_budget
			employee_count
			is_active
			location
			cost_center
			created_at
			updated_at
			manager {
				id
				employee_id
				full_name
				email
				position
				profile_picture_url
			}
			parent {
				id
				name
				budget_code
				manager {
					id
					full_name
				}
			}
			children {
				id
				name
				description
				employee_count
				is_active
				manager {
					id
					full_name
				}
			}
			employees(first: 50) @include(if: $includeEmployees) {
				nodes {
					id
					employee_id
					first_name
					last_name
					full_name
					email
					position
					hire_date
					status
					employment_type
					profile_picture_url
				}
				totalCount
			}
			budget_allocations {
				id
				category
				allocated_amount
				used_amount
				remaining_amount
				fiscal_year
			}
		}
	}
` as const;

/**
 * Get department hierarchy (tree structure)
 */
export const GET_DEPARTMENT_HIERARCHY = `
	query GetDepartmentHierarchy {
		departmentHierarchy {
			id
			name
			description
			budget_code
			employee_count
			is_active
			level
			path
			manager {
				id
				full_name
			}
			children {
				id
				name
				description
				budget_code
				employee_count
				is_active
				level
				manager {
					id
					full_name
				}
				children {
					id
					name
					employee_count
					is_active
					level
				}
			}
		}
	}
` as const;

/**
 * Get departments by manager
 */
export const GET_DEPARTMENTS_BY_MANAGER = `
	query GetDepartmentsByManager($managerId: ID!) {
		departmentsByManager(managerId: $managerId) {
			id
			name
			description
			employee_count
			budget_code
			total_budget
			is_active
			employees(first: 10) {
				nodes {
					id
					full_name
					position
				}
				totalCount
			}
		}
	}
` as const;

/**
 * Search departments
 */
export const SEARCH_DEPARTMENTS = `
	query SearchDepartments($query: String!, $first: Int = 10) {
		searchDepartments(query: $query, first: $first) {
			nodes {
				id
				name
				description
				budget_code
				employee_count
				is_active
				manager {
					id
					full_name
				}
				parent {
					id
					name
				}
			}
			totalCount
		}
	}
` as const;

/**
 * Get department statistics
 */
export const GET_DEPARTMENT_STATS = `
	query GetDepartmentStats {
		departmentStats {
			total_departments
			active_departments
			inactive_departments
			total_employees
			departments_with_budget
			total_budget_allocated
			total_budget_used
			budget_utilization_rate
			largest_department {
				id
				name
				employee_count
			}
			departments_by_size {
				size_range
				count
			}
			budget_summary {
				department_id
				department_name
				total_budget
				used_budget
				utilization_percentage
			}
		}
	}
` as const;

/**
 * Get departments for dropdown/selection
 */
export const GET_DEPARTMENTS_LIST = `
	query GetDepartmentsList($includeInactive: Boolean = false) {
		departments(includeInactive: $includeInactive) {
			nodes {
				id
				name
				budget_code
				is_active
				employee_count
				parent {
					id
					name
				}
			}
		}
	}
` as const;

/**
 * Department Mutation Operations
 */

/**
 * Create new department
 */
export const CREATE_DEPARTMENT = `
	mutation CreateDepartment($input: CreateDepartmentInput!) {
		createDepartment(input: $input) {
			success
			department {
				id
				name
				description
				budget_code
				total_budget
				is_active
				manager {
					id
					full_name
				}
				parent {
					id
					name
				}
			}
			message
			errors {
				field
				message
			}
		}
	}
` as const;

/**
 * Update existing department
 */
export const UPDATE_DEPARTMENT = `
	mutation UpdateDepartment($id: ID!, $input: UpdateDepartmentInput!) {
		updateDepartment(id: $id, input: $input) {
			success
			department {
				id
				name
				description
				budget_code
				total_budget
				used_budget
				remaining_budget
				is_active
				location
				cost_center
				manager {
					id
					full_name
				}
				parent {
					id
					name
				}
			}
			message
			errors {
				field
				message
			}
		}
	}
` as const;

/**
 * Delete department
 */
export const DELETE_DEPARTMENT = `
	mutation DeleteDepartment($id: ID!, $reassign_to: ID) {
		deleteDepartment(id: $id, reassignTo: $reassign_to) {
			success
			message
			reassigned_employees {
				id
				full_name
				new_department {
					id
					name
				}
			}
		}
	}
` as const;

/**
 * Activate department
 */
export const ACTIVATE_DEPARTMENT = `
	mutation ActivateDepartment($id: ID!) {
		activateDepartment(id: $id) {
			success
			department {
				id
				name
				is_active
			}
			message
		}
	}
` as const;

/**
 * Deactivate department
 */
export const DEACTIVATE_DEPARTMENT = `
	mutation DeactivateDepartment($id: ID!, $reassign_employees_to: ID) {
		deactivateDepartment(id: $id, reassignEmployeesTo: $reassign_employees_to) {
			success
			department {
				id
				name
				is_active
			}
			message
			reassigned_employees {
				id
				full_name
				new_department {
					id
					name
				}
			}
		}
	}
` as const;

/**
 * Move department in hierarchy
 */
export const MOVE_DEPARTMENT = `
	mutation MoveDepartment($id: ID!, $new_parent_id: ID) {
		moveDepartment(id: $id, newParentId: $new_parent_id) {
			success
			department {
				id
				name
				parent {
					id
					name
				}
				children {
					id
					name
				}
			}
			message
		}
	}
` as const;

/**
 * Update department budget
 */
export const UPDATE_DEPARTMENT_BUDGET = `
	mutation UpdateDepartmentBudget($id: ID!, $budget_input: DepartmentBudgetInput!) {
		updateDepartmentBudget(id: $id, budgetInput: $budget_input) {
			success
			department {
				id
				name
				total_budget
				used_budget
				remaining_budget
				budget_allocations {
					id
					category
					allocated_amount
					used_amount
				}
			}
			message
		}
	}
` as const;

/**
 * Assign department manager
 */
export const ASSIGN_DEPARTMENT_MANAGER = `
	mutation AssignDepartmentManager($department_id: ID!, $manager_id: ID!) {
		assignDepartmentManager(departmentId: $department_id, managerId: $manager_id) {
			success
			department {
				id
				name
				manager {
					id
					full_name
					email
				}
			}
			message
		}
	}
` as const;

/**
 * Bulk transfer employees between departments
 */
export const BULK_TRANSFER_EMPLOYEES = `
	mutation BulkTransferEmployees(
		$employee_ids: [ID!]!
		$from_department_id: ID!
		$to_department_id: ID!
		$effective_date: Date!
		$reason: String
	) {
		bulkTransferEmployees(
			employeeIds: $employee_ids
			fromDepartmentId: $from_department_id
			toDepartmentId: $to_department_id
			effectiveDate: $effective_date
			reason: $reason
		) {
			success
			transferred_count
			failed_count
			results {
				employee_id
				employee_name
				success
				error
			}
			message
		}
	}
` as const;

/**
 * TypeScript interfaces for variables and responses
 */

export interface GetDepartmentsVariables {
	first?: number;
	after?: string;
	filter?: DepartmentFilterInput;
	sortBy?: DepartmentSortField;
	sortDirection?: SortDirection;
	includeInactive?: boolean;
}

export interface DepartmentFilterInput {
	name?: string;
	manager_id?: string;
	parent_id?: string;
	is_active?: boolean;
	has_budget?: boolean;
	min_employees?: number;
	max_employees?: number;
}

export interface GetDepartmentsQuery {
	departments: {
		nodes: Department[];
		pageInfo: {
			hasNextPage: boolean;
			hasPreviousPage: boolean;
			startCursor?: string;
			endCursor?: string;
		};
		totalCount: number;
	};
}

export interface GetDepartmentVariables {
	id: string;
	includeEmployees?: boolean;
}

export interface GetDepartmentQuery {
	department: Department | null;
}

export interface SearchDepartmentsVariables {
	query: string;
	first?: number;
}

export interface GetDepartmentsByManagerVariables {
	managerId: string;
}

export interface CreateDepartmentVariables {
	input: CreateDepartmentInput;
}

export interface CreateDepartmentMutation {
	createDepartment: {
		success: boolean;
		department?: Department;
		message?: string;
		errors?: Array<{
			field: string;
			message: string;
		}>;
	};
}

export interface UpdateDepartmentVariables {
	id: string;
	input: UpdateDepartmentInput;
}

export interface UpdateDepartmentMutation {
	updateDepartment: {
		success: boolean;
		department?: Department;
		message?: string;
		errors?: Array<{
			field: string;
			message: string;
		}>;
	};
}

export interface DeleteDepartmentVariables {
	id: string;
	reassign_to?: string;
}

export interface DeleteDepartmentMutation {
	deleteDepartment: {
		success: boolean;
		message?: string;
		reassigned_employees?: Array<{
			id: string;
			full_name: string;
			new_department?: {
				id: string;
				name: string;
			};
		}>;
	};
}

export interface MoveDepartmentVariables {
	id: string;
	new_parent_id?: string;
}

export interface UpdateDepartmentBudgetVariables {
	id: string;
	budget_input: DepartmentBudgetInput;
}

export interface DepartmentBudgetInput {
	total_budget?: number;
	fiscal_year?: string;
	allocations?: Array<{
		category: string;
		amount: number;
	}>;
}

export interface AssignDepartmentManagerVariables {
	department_id: string;
	manager_id: string;
}

export interface BulkTransferEmployeesVariables {
	employee_ids: string[];
	from_department_id: string;
	to_department_id: string;
	effective_date: string;
	reason?: string;
}

/**
 * Department statistics interfaces
 */
export interface DepartmentStats {
	total_departments: number;
	active_departments: number;
	inactive_departments: number;
	total_employees: number;
	departments_with_budget: number;
	total_budget_allocated: number;
	total_budget_used: number;
	budget_utilization_rate: number;
	largest_department: {
		id: string;
		name: string;
		employee_count: number;
	};
	departments_by_size: Array<{
		size_range: string;
		count: number;
	}>;
	budget_summary: Array<{
		department_id: string;
		department_name: string;
		total_budget: number;
		used_budget: number;
		utilization_percentage: number;
	}>;
}

/**
 * Utility functions for department operations
 */

/**
 * Build department hierarchy path
 */
export function buildDepartmentPath(department: { name: string; parent?: { name: string; parent?: any } }): string {
	const path = [department.name];
	let current = department.parent;
	
	while (current) {
		path.unshift(current.name);
		current = current.parent;
	}
	
	return path.join(' > ');
}

/**
 * Calculate budget utilization percentage
 */
export function calculateBudgetUtilization(totalBudget: number, usedBudget: number): number {
	if (totalBudget === 0) return 0;
	return Math.round((usedBudget / totalBudget) * 100);
}

/**
 * Get budget status color
 */
export function getBudgetStatusColor(utilizationPercentage: number): string {
	if (utilizationPercentage <= 50) return 'text-green-600';
	if (utilizationPercentage <= 80) return 'text-yellow-600';
	if (utilizationPercentage <= 100) return 'text-orange-600';
	return 'text-red-600';
}

/**
 * Format budget amount
 */
export function formatBudgetAmount(amount: number): string {
	if (amount >= 1000000) {
		return `$${(amount / 1000000).toFixed(1)}M`;
	} else if (amount >= 1000) {
		return `$${(amount / 1000).toFixed(1)}K`;
	} else {
		return `$${amount.toFixed(0)}`;
	}
}

/**
 * Get department size category
 */
export function getDepartmentSizeCategory(employeeCount: number): string {
	if (employeeCount === 0) return 'Empty';
	if (employeeCount <= 5) return 'Small';
	if (employeeCount <= 20) return 'Medium';
	if (employeeCount <= 50) return 'Large';
	return 'Extra Large';
}

/**
 * Validate department hierarchy (prevent circular references)
 */
export function validateDepartmentHierarchy(
	departmentId: string,
	newParentId: string | null,
	allDepartments: Array<{ id: string; parent?: { id: string } }>
): { isValid: boolean; error?: string } {
	if (!newParentId) return { isValid: true };
	
	// Can't be parent of itself
	if (departmentId === newParentId) {
		return { isValid: false, error: 'Department cannot be its own parent' };
	}
	
	// Check for circular reference
	let current = allDepartments.find(d => d.id === newParentId);
	const visited = new Set([departmentId]);
	
	while (current?.parent) {
		if (visited.has(current.parent.id)) {
			return { isValid: false, error: 'Circular reference detected in department hierarchy' };
		}
		visited.add(current.parent.id);
		current = allDepartments.find(d => d.id === current?.parent?.id);
	}
	
	return { isValid: true };
}

/**
 * Build department filter from search parameters
 */
export function buildDepartmentFilter(params: {
	name?: string;
	manager_id?: string;
	parent_id?: string;
	is_active?: boolean;
	has_budget?: boolean;
	min_employees?: number;
	max_employees?: number;
}): DepartmentFilterInput {
	const filter: DepartmentFilterInput = {};
	
	if (params.name) filter.name = params.name;
	if (params.manager_id) filter.manager_id = params.manager_id;
	if (params.parent_id) filter.parent_id = params.parent_id;
	if (params.is_active !== undefined) filter.is_active = params.is_active;
	if (params.has_budget !== undefined) filter.has_budget = params.has_budget;
	if (params.min_employees !== undefined) filter.min_employees = params.min_employees;
	if (params.max_employees !== undefined) filter.max_employees = params.max_employees;
	
	return filter;
}

/**
 * Generate department code automatically
 */
export function generateDepartmentCode(name: string, existingCodes: string[] = []): string {
	// Take first 3 letters of name, uppercase
	const base = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
	
	if (base.length < 3) {
		// Pad with numbers if name is too short
		const padded = (base + '000').slice(0, 3);
		return padded;
	}
	
	let code = base;
	let counter = 1;
	
	while (existingCodes.includes(code)) {
		code = base.slice(0, 2) + counter.toString();
		counter++;
	}
	
	return code;
}