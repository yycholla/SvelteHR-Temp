// src/domain/Employee/types.ts
import type { Employee } from './Employee';

export interface CreateEmployeeData {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	hireDate: string | Date;
	departmentId: string | null;
	jobTitle: string | null;
	phone: string | null;
}

export interface UpdateEmployeeData {
	departmentId?: string | null;
	jobTitle?: string | null;
	phone?: string | null;
}

export type EmployeeSortField = 'name' | 'email' | 'hireDate' | 'jobTitle';
export type SortOrder = 'asc' | 'desc';

export interface EmployeeListFilters {
	searchTerm?: string;
	departmentId?: string;
	isActive?: boolean;
	sortBy?: EmployeeSortField;
	sortOrder?: SortOrder;
	limit?: number;
	offset?: number;
}

export interface EmployeeListResult {
	employees: Employee[];
	total: number;
	limit: number;
	offset: number;
}

export interface BulkOperationResult {
	successCount: number;
	failureCount: number;
	errors: Array<{
		employeeId: string;
		error: DomainError;
	}>;
}

import type { DomainError } from '../errors';
