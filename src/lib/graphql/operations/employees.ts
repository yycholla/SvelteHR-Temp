/**
 * GraphQL Employee Operations
 * 
 * Provides typesafe GraphQL queries and mutations for employee management,
 * including CRUD operations, bulk operations, search, and filtering.
 * 
 * Uses generated types from GraphQL schema contract.
 */

import type {
	Query,
	Mutation,
	Employee,
	EmployeePage,
	EmployeeStatus,
	EmploymentType,
	CreateEmployeeInput,
	UpdateEmployeeInput,
	EmployeeSortField,
	SortDirection
} from '../generated/graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

/**
 * Employee Query Operations
 */

/**
 * Get all employees with pagination and filtering
 */
export const GET_EMPLOYEES = `
	query GetEmployees(
		$first: Int
		$after: String
		$last: Int
		$before: String
		$filter: EmployeeFilterInput
		$sortBy: EmployeeSortField
		$sortDirection: SortDirection
	) {
		employees(
			first: $first
			after: $after
			last: $last
			before: $before
			filter: $filter
			sortBy: $sortBy
			sortDirection: $sortDirection
		) {
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
				phone
				profile_picture_url
				department {
					id
					name
					budget_code
				}
				manager {
					id
					full_name
					email
				}
				reports {
					id
					full_name
					position
				}
				created_at
				updated_at
			}
			edges {
				node {
					id
					full_name
				}
				cursor
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
 * Get single employee by ID
 */
export const GET_EMPLOYEE = `
	query GetEmployee($id: ID!) {
		employee(id: $id) {
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
			phone
			profile_picture_url
			address
			emergency_contact_name
			emergency_contact_phone
			salary
			department {
				id
				name
				budget_code
				manager {
					id
					full_name
				}
			}
			manager {
				id
				full_name
				email
				position
			}
			reports {
				id
				full_name
				position
				email
			}
			roles {
				id
				name
				description
				level
			}
			permissions
			documents {
				id
				title
				type
				url
				created_at
			}
			performance_reviews {
				id
				period
				rating
				created_at
			}
			created_at
			updated_at
		}
	}
` as const;

/**
 * Get employee by employee ID (internal ID)
 */
export const GET_EMPLOYEE_BY_EMPLOYEE_ID = `
	query GetEmployeeByEmployeeId($employeeId: String!) {
		employeeByEmployeeId(employeeId: $employeeId) {
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
			department {
				id
				name
			}
			manager {
				id
				full_name
			}
			created_at
			updated_at
		}
	}
` as const;

/**
 * Search employees by name or email
 */
export const SEARCH_EMPLOYEES = `
	query SearchEmployees(
		$query: String!
		$first: Int = 10
		$filter: EmployeeFilterInput
	) {
		searchEmployees(query: $query, first: $first, filter: $filter) {
			nodes {
				id
				employee_id
				first_name
				last_name
				full_name
				email
				position
				department {
					id
					name
				}
				status
				profile_picture_url
			}
			totalCount
		}
	}
` as const;

/**
 * Get employees by department
 */
export const GET_EMPLOYEES_BY_DEPARTMENT = `
	query GetEmployeesByDepartment(
		$departmentId: ID!
		$first: Int
		$after: String
		$includeSubdepartments: Boolean = false
	) {
		department(id: $departmentId) {
			id
			name
			employees(first: $first, after: $after, includeSubdepartments: $includeSubdepartments) {
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
				pageInfo {
					hasNextPage
					hasPreviousPage
					startCursor
					endCursor
				}
				totalCount
			}
		}
	}
` as const;

/**
 * Get employee reports (direct reports)
 */
export const GET_EMPLOYEE_REPORTS = `
	query GetEmployeeReports($managerId: ID!) {
		employee(id: $managerId) {
			id
			full_name
			reports {
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
				department {
					id
					name
				}
				profile_picture_url
			}
		}
	}
` as const;

/**
 * Get employees with specific status
 */
export const GET_EMPLOYEES_BY_STATUS = `
	query GetEmployeesByStatus(
		$status: EmployeeStatus!
		$first: Int
		$after: String
	) {
		employees(
			first: $first
			after: $after
			filter: { status: $status }
		) {
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
				department {
					id
					name
				}
				profile_picture_url
			}
			totalCount
		}
	}
` as const;

/**
 * Get employee statistics
 */
export const GET_EMPLOYEE_STATS = `
	query GetEmployeeStats {
		employeeStats {
			total
			active
			inactive
			terminated
			on_leave
			by_department {
				department_id
				department_name
				count
			}
			by_employment_type {
				type
				count
			}
			recent_hires {
				id
				full_name
				hire_date
				department {
					name
				}
			}
		}
	}
` as const;

/**
 * Get employees for bulk operations (lightweight)
 */
export const GET_EMPLOYEES_FOR_BULK = `
	query GetEmployeesForBulk(
		$first: Int
		$after: String
		$filter: EmployeeFilterInput
	) {
		employees(first: $first, after: $after, filter: $filter) {
			nodes {
				id
				employee_id
				full_name
				email
				status
				department {
					id
					name
				}
			}
			pageInfo {
				hasNextPage
				endCursor
			}
			totalCount
		}
	}
` as const;

/**
 * TypeScript interfaces for operation variables and responses
 */

export interface GetEmployeesVariables {
	first?: number;
	after?: string;
	last?: number;
	before?: string;
	filter?: EmployeeFilterInput;
	sortBy?: EmployeeSortField;
	sortDirection?: SortDirection;
}

export interface EmployeeFilterInput {
	status?: EmployeeStatus;
	employment_type?: EmploymentType;
	department_id?: string;
	manager_id?: string;
	hire_date_from?: string;
	hire_date_to?: string;
	search?: string;
}

export interface GetEmployeesQuery {
	employees: {
		nodes: Employee[];
		edges: Array<{
			node: Pick<Employee, 'id' | 'full_name'>;
			cursor: string;
		}>;
		pageInfo: {
			hasNextPage: boolean;
			hasPreviousPage: boolean;
			startCursor?: string;
			endCursor?: string;
		};
		totalCount: number;
	};
}

export interface GetEmployeeVariables {
	id: string;
}

export interface GetEmployeeQuery {
	employee: Employee | null;
}

export interface GetEmployeeByEmployeeIdVariables {
	employeeId: string;
}

export interface SearchEmployeesVariables {
	query: string;
	first?: number;
	filter?: EmployeeFilterInput;
}

export interface SearchEmployeesQuery {
	searchEmployees: {
		nodes: Array<Pick<Employee, 
			'id' | 
			'employee_id' | 
			'first_name' | 
			'last_name' | 
			'full_name' | 
			'email' | 
			'position' | 
			'status' | 
			'profile_picture_url'
		> & {
			department?: {
				id: string;
				name: string;
			};
		}>;
		totalCount: number;
	};
}

export interface GetEmployeesByDepartmentVariables {
	departmentId: string;
	first?: number;
	after?: string;
	includeSubdepartments?: boolean;
}

export interface GetEmployeeReportsVariables {
	managerId: string;
}

export interface GetEmployeesByStatusVariables {
	status: EmployeeStatus;
	first?: number;
	after?: string;
}

export interface GetEmployeesForBulkVariables {
	first?: number;
	after?: string;
	filter?: EmployeeFilterInput;
}

/**
 * Employee statistics interfaces
 */
export interface EmployeeStats {
	total: number;
	active: number;
	inactive: number;
	terminated: number;
	on_leave: number;
	by_department: Array<{
		department_id: string;
		department_name: string;
		count: number;
	}>;
	by_employment_type: Array<{
		type: EmploymentType;
		count: number;
	}>;
	recent_hires: Array<{
		id: string;
		full_name: string;
		hire_date: string;
		department?: {
			name: string;
		};
	}>;
}

export interface GetEmployeeStatsQuery {
	employeeStats: EmployeeStats;
}

/**
 * Utility functions for employee operations
 */

/**
 * Build employee filter from search parameters
 */
export function buildEmployeeFilter(params: {
	status?: string;
	employment_type?: string;
	department_id?: string;
	manager_id?: string;
	hire_date_from?: string;
	hire_date_to?: string;
	search?: string;
}): EmployeeFilterInput {
	const filter: EmployeeFilterInput = {};
	
	if (params.status) {
		filter.status = params.status as EmployeeStatus;
	}
	
	if (params.employment_type) {
		filter.employment_type = params.employment_type as EmploymentType;
	}
	
	if (params.department_id) {
		filter.department_id = params.department_id;
	}
	
	if (params.manager_id) {
		filter.manager_id = params.manager_id;
	}
	
	if (params.hire_date_from) {
		filter.hire_date_from = params.hire_date_from;
	}
	
	if (params.hire_date_to) {
		filter.hire_date_to = params.hire_date_to;
	}
	
	if (params.search) {
		filter.search = params.search;
	}
	
	return filter;
}

/**
 * Extract employee display name
 */
export function getEmployeeDisplayName(employee: Pick<Employee, 'first_name' | 'last_name' | 'full_name' | 'email'>): string {
	return employee.full_name || 
		   (employee.first_name && employee.last_name ? `${employee.first_name} ${employee.last_name}` : '') ||
		   employee.email ||
		   'Unknown Employee';
}

/**
 * Get employee avatar initials
 */
export function getEmployeeInitials(employee: Pick<Employee, 'first_name' | 'last_name' | 'full_name'>): string {
	if (employee.full_name) {
		return employee.full_name
			.split(' ')
			.map(name => name.charAt(0).toUpperCase())
			.join('')
			.slice(0, 2);
	}
	
	if (employee.first_name && employee.last_name) {
		return `${employee.first_name.charAt(0)}${employee.last_name.charAt(0)}`.toUpperCase();
	}
	
	return 'EM';
}

/**
 * Format employee status for display
 */
export function formatEmployeeStatus(status: EmployeeStatus): string {
	switch (status) {
		case 'ACTIVE':
			return 'Active';
		case 'INACTIVE':
			return 'Inactive';
		case 'TERMINATED':
			return 'Terminated';
		case 'ON_LEAVE':
			return 'On Leave';
		default:
			return 'Unknown';
	}
}

/**
 * Format employment type for display
 */
export function formatEmploymentType(type: EmploymentType): string {
	switch (type) {
		case 'FULL_TIME':
			return 'Full Time';
		case 'PART_TIME':
			return 'Part Time';
		case 'CONTRACT':
			return 'Contract';
		case 'INTERN':
			return 'Intern';
		default:
			return 'Unknown';
	}
}

/**
 * Check if employee is active
 */
export function isEmployeeActive(employee: Pick<Employee, 'status'>): boolean {
	return employee.status === 'ACTIVE';
}

/**
 * Check if employee can be edited
 */
export function canEditEmployee(employee: Pick<Employee, 'status'>): boolean {
	return employee.status !== 'TERMINATED';
}

/**
 * Get status badge color class
 */
export function getStatusBadgeColor(status: EmployeeStatus): string {
	switch (status) {
		case 'ACTIVE':
			return 'bg-green-100 text-green-800';
		case 'INACTIVE':
			return 'bg-gray-100 text-gray-800';
		case 'TERMINATED':
			return 'bg-red-100 text-red-800';
		case 'ON_LEAVE':
			return 'bg-yellow-100 text-yellow-800';
		default:
			return 'bg-gray-100 text-gray-800';
	}
}

/**
 * Employee Mutation Operations
 */

/**
 * Create new employee
 */
export const CREATE_EMPLOYEE = `
	mutation CreateEmployee($input: CreateEmployeeInput!) {
		createEmployee(input: $input) {
			success
			employee {
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
				department {
					id
					name
				}
				manager {
					id
					full_name
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
 * Update existing employee
 */
export const UPDATE_EMPLOYEE = `
	mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
		updateEmployee(id: $id, input: $input) {
			success
			employee {
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
				phone
				address
				emergency_contact_name
				emergency_contact_phone
				salary
				department {
					id
					name
				}
				manager {
					id
					full_name
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
 * Deactivate employee
 */
export const DEACTIVATE_EMPLOYEE = `
	mutation DeactivateEmployee($id: ID!, $reason: String) {
		deactivateEmployee(id: $id, reason: $reason) {
			success
			employee {
				id
				full_name
				status
			}
			message
		}
	}
` as const;

/**
 * Reactivate employee
 */
export const REACTIVATE_EMPLOYEE = `
	mutation ReactivateEmployee($id: ID!, $reason: String) {
		reactivateEmployee(id: $id, reason: $reason) {
			success
			employee {
				id
				full_name
				status
			}
			message
		}
	}
` as const;

/**
 * Terminate employee
 */
export const TERMINATE_EMPLOYEE = `
	mutation TerminateEmployee($id: ID!, $termination_date: Date!, $reason: String!) {
		terminateEmployee(id: $id, termination_date: $termination_date, reason: $reason) {
			success
			employee {
				id
				full_name
				status
			}
			message
		}
	}
` as const;

/**
 * Transfer employee to different department
 */
export const TRANSFER_EMPLOYEE = `
	mutation TransferEmployee($id: ID!, $department_id: ID!, $effective_date: Date!, $new_position: String) {
		transferEmployee(
			id: $id, 
			department_id: $department_id, 
			effective_date: $effective_date,
			new_position: $new_position
		) {
			success
			employee {
				id
				full_name
				position
				department {
					id
					name
				}
			}
			message
		}
	}
` as const;

/**
 * Update employee manager
 */
export const UPDATE_EMPLOYEE_MANAGER = `
	mutation UpdateEmployeeManager($id: ID!, $manager_id: ID!, $effective_date: Date!) {
		updateEmployeeManager(id: $id, manager_id: $manager_id, effective_date: $effective_date) {
			success
			employee {
				id
				full_name
				manager {
					id
					full_name
				}
			}
			message
		}
	}
` as const;

/**
 * Bulk update employees
 */
export const BULK_UPDATE_EMPLOYEES = `
	mutation BulkUpdateEmployees($employee_ids: [ID!]!, $updates: BulkEmployeeUpdateInput!) {
		bulkUpdateEmployees(employeeIds: $employee_ids, updates: $updates) {
			success
			updated_count
			failed_count
			results {
				employee_id
				success
				error
			}
			message
		}
	}
` as const;

/**
 * Import employees from CSV
 */
export const IMPORT_EMPLOYEES = `
	mutation ImportEmployees($csv_data: String!, $options: ImportOptionsInput) {
		importEmployees(csvData: $csv_data, options: $options) {
			success
			imported_count
			failed_count
			validation_errors {
				row
				field
				message
			}
			created_employees {
				id
				full_name
				email
				employee_id
			}
			message
		}
	}
` as const;

/**
 * Update employee profile picture
 */
export const UPDATE_EMPLOYEE_AVATAR = `
	mutation UpdateEmployeeAvatar($id: ID!, $avatar_url: String!) {
		updateEmployeeAvatar(id: $id, avatarUrl: $avatar_url) {
			success
			employee {
				id
				full_name
				profile_picture_url
			}
			message
		}
	}
` as const;

/**
 * Add employee role
 */
export const ADD_EMPLOYEE_ROLE = `
	mutation AddEmployeeRole($employee_id: ID!, $role_id: ID!) {
		addEmployeeRole(employeeId: $employee_id, roleId: $role_id) {
			success
			employee {
				id
				full_name
				roles {
					id
					name
					level
				}
			}
			message
		}
	}
` as const;

/**
 * Remove employee role
 */
export const REMOVE_EMPLOYEE_ROLE = `
	mutation RemoveEmployeeRole($employee_id: ID!, $role_id: ID!) {
		removeEmployeeRole(employeeId: $employee_id, roleId: $role_id) {
			success
			employee {
				id
				full_name
				roles {
					id
					name
					level
				}
			}
			message
		}
	}
` as const;

/**
 * TypeScript interfaces for mutation variables and responses
 */

export interface CreateEmployeeMutation {
	createEmployee: {
		success: boolean;
		employee?: Employee;
		message?: string;
		errors?: Array<{
			field: string;
			message: string;
		}>;
	};
}

export interface CreateEmployeeVariables {
	input: CreateEmployeeInput;
}

export interface UpdateEmployeeMutation {
	updateEmployee: {
		success: boolean;
		employee?: Employee;
		message?: string;
		errors?: Array<{
			field: string;
			message: string;
		}>;
	};
}

export interface UpdateEmployeeVariables {
	id: string;
	input: UpdateEmployeeInput;
}

export interface DeactivateEmployeeVariables {
	id: string;
	reason?: string;
}

export interface ReactivateEmployeeVariables {
	id: string;
	reason?: string;
}

export interface TerminateEmployeeVariables {
	id: string;
	termination_date: string;
	reason: string;
}

export interface TransferEmployeeVariables {
	id: string;
	department_id: string;
	effective_date: string;
	new_position?: string;
}

export interface UpdateEmployeeManagerVariables {
	id: string;
	manager_id: string;
	effective_date: string;
}

export interface BulkUpdateEmployeesVariables {
	employee_ids: string[];
	updates: BulkEmployeeUpdateInput;
}

export interface BulkEmployeeUpdateInput {
	status?: EmployeeStatus;
	department_id?: string;
	manager_id?: string;
	employment_type?: EmploymentType;
	position?: string;
}

export interface BulkUpdateEmployeesMutation {
	bulkUpdateEmployees: {
		success: boolean;
		updated_count: number;
		failed_count: number;
		results: Array<{
			employee_id: string;
			success: boolean;
			error?: string;
		}>;
		message?: string;
	};
}

export interface ImportEmployeesVariables {
	csv_data: string;
	options?: ImportOptionsInput;
}

export interface ImportOptionsInput {
	skip_header?: boolean;
	validate_only?: boolean;
	update_existing?: boolean;
	default_department_id?: string;
	default_manager_id?: string;
}

export interface ImportEmployeesMutation {
	importEmployees: {
		success: boolean;
		imported_count: number;
		failed_count: number;
		validation_errors: Array<{
			row: number;
			field: string;
			message: string;
		}>;
		created_employees: Array<{
			id: string;
			full_name: string;
			email: string;
			employee_id: string;
		}>;
		message?: string;
	};
}

export interface UpdateEmployeeAvatarVariables {
	id: string;
	avatar_url: string;
}

export interface AddEmployeeRoleVariables {
	employee_id: string;
	role_id: string;
}

export interface RemoveEmployeeRoleVariables {
	employee_id: string;
	role_id: string;
}

/**
 * Mutation result interfaces
 */
export interface EmployeeMutationResult {
	success: boolean;
	employee?: Employee;
	message?: string;
	errors?: Array<{
		field: string;
		message: string;
	}>;
}

/**
 * Helper functions for employee mutations
 */

/**
 * Validate employee input data
 */
export function validateEmployeeInput(input: Partial<CreateEmployeeInput | UpdateEmployeeInput>): {
	isValid: boolean;
	errors: Array<{ field: string; message: string }>;
} {
	const errors: Array<{ field: string; message: string }> = [];
	
	// Email validation
	if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
		errors.push({ field: 'email', message: 'Invalid email format' });
	}
	
	// Phone validation
	if (input.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(input.phone.replace(/[\s\-\(\)]/g, ''))) {
		errors.push({ field: 'phone', message: 'Invalid phone number format' });
	}
	
	// Employee ID validation (if creating)
	if ('employee_id' in input && input.employee_id && !/^[A-Z0-9]{3,10}$/.test(input.employee_id)) {
		errors.push({ field: 'employee_id', message: 'Employee ID must be 3-10 alphanumeric characters' });
	}
	
	// Salary validation
	if (input.salary !== undefined && (isNaN(input.salary) || input.salary < 0)) {
		errors.push({ field: 'salary', message: 'Salary must be a positive number' });
	}
	
	// Hire date validation
	if (input.hire_date) {
		const hireDate = new Date(input.hire_date);
		const now = new Date();
		if (hireDate > now) {
			errors.push({ field: 'hire_date', message: 'Hire date cannot be in the future' });
		}
	}
	
	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Prepare employee input for GraphQL mutation
 */
export function prepareEmployeeInput(input: any): CreateEmployeeInput | UpdateEmployeeInput {
	// Remove empty strings and null values
	const cleanInput = Object.entries(input).reduce((acc, [key, value]) => {
		if (value !== '' && value !== null && value !== undefined) {
			acc[key] = value;
		}
		return acc;
	}, {} as any);
	
	// Convert salary to number if it's a string
	if (cleanInput.salary && typeof cleanInput.salary === 'string') {
		cleanInput.salary = parseFloat(cleanInput.salary);
	}
	
	// Format phone number
	if (cleanInput.phone) {
		cleanInput.phone = cleanInput.phone.replace(/[\s\-\(\)]/g, '');
	}
	
	return cleanInput;
}

/**
 * Generate employee ID automatically
 */
export function generateEmployeeId(firstName: string, lastName: string, existingIds: string[] = []): string {
	const base = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
	let counter = 1;
	let employeeId = `${base}${counter.toString().padStart(3, '0')}`;
	
	while (existingIds.includes(employeeId)) {
		counter++;
		employeeId = `${base}${counter.toString().padStart(3, '0')}`;
	}
	
	return employeeId;
}

/**
 * Format employee data for export
 */
export function formatEmployeeForExport(employee: Employee): Record<string, any> {
	return {
		'Employee ID': employee.employee_id,
		'First Name': employee.first_name,
		'Last Name': employee.last_name,
		'Email': employee.email,
		'Position': employee.position,
		'Department': employee.department?.name,
		'Manager': employee.manager?.full_name,
		'Hire Date': employee.hire_date,
		'Status': formatEmployeeStatus(employee.status),
		'Employment Type': formatEmploymentType(employee.employment_type),
		'Phone': employee.phone,
		'Salary': employee.salary
	};
}