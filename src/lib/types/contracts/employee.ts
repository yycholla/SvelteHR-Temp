import type { DataRequest } from './core';

// =============================================================================
// Employee Management Operation Contracts
// =============================================================================

export interface GetEmployeesVariables {
	limit?: number;
	offset?: number;
	filter?: EmployeeFilter;
	sortBy?: string;
	sortDirection?: 'asc' | 'desc';
}

export interface GetEmployeesResponse {
	employees: {
		totalCount: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		data: Employee[];
	};
	pagination: PaginationInfo;
}

export interface GetEmployeesWithFilteringVariables {
	filters?: {
		departmentIds?: string[];
		roleIds?: string[];
		isActive?: boolean;
		searchTerm?: string;
		hiredDateRange?: {
			startDate: string;
			endDate: string;
		};
	};
	sorting?: {
		field: string;
		direction: 'asc' | 'desc';
	} | null;
	pagination?: {
		page: number;
		limit: number;
		offset?: number;
	};
	includeDetails?: boolean;
}

export interface GetEmployeesWithFilteringResponse {
	employees: Employee[];
	pagination: PaginationInfo;
	appliedFilters?: {
		departmentIds?: string[];
		roleIds?: string[];
		isActive?: boolean;
		totalFiltersApplied: number;
	};
	summary?: {
		totalEmployees: number;
		activeEmployees: number;
		inactiveEmployees: number;
		departmentBreakdown: Array<{
			departmentId: string;
			departmentName: string;
			count: number;
		}>;
	};
}

export type GetEmployeesWithFilteringRequest = DataRequest<GetEmployeesWithFilteringVariables>;

export interface Employee {
	id: string;
	email: string;
	displayName: string;
	role: string;
	department: string;
	isActive: boolean;
	startDate: string;
	profileImage?: string;
	contactInfo?: {
		phone?: string;
		address?: string;
	};
}

export interface EmployeeFilter {
	department?: string;
	role?: string;
	isActive?: boolean;
	startDateAfter?: string;
	startDateBefore?: string;
	searchTerm?: string;
}

export interface PaginationInfo {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
}
