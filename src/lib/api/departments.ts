import { mountianHRApiClient } from './client';
import type {
	Department,
	CreateDepartmentRequest,
	UpdateDepartmentRequest,
	DepartmentListResponse,
	DepartmentHierarchyResponse,
	DepartmentEmployeesResponse,
	SubDepartmentsResponse,
	DepartmentQueryOptions
} from '$lib/types/department';

export class DepartmentApi {
	private client = mountianHRApiClient;

	/**
	 * Create a new department
	 */
	async create(data: CreateDepartmentRequest): Promise<Department> {
		return this.client.post('/api/v2/departments', data);
	}

	/**
	 * Get a department by ID
	 */
	async getById(id: string): Promise<Department> {
		return this.client.get(`/api/v2/departments/${id}`);
	}

	/**
	 * List all departments with optional filtering
	 */
	async list(options?: DepartmentQueryOptions): Promise<DepartmentListResponse> {
		const params = new URLSearchParams();
		
		if (options?.active_only) {
			params.append('active_only', 'true');
		}
		
		if (options?.parent_id !== undefined) {
			params.append('parent_id', options.parent_id || 'null');
		}
		
		if (options?.has_manager !== undefined) {
			params.append('has_manager', String(options.has_manager));
		}

		if (options?.page) {
			params.append('page', String(options.page));
		}

		if (options?.pageSize) {
			params.append('pageSize', String(options.pageSize));
		}

		if (options?.sort) {
			params.append('sort', options.sort);
		}

		if (options?.order) {
			params.append('order', options.order);
		}

		const queryString = params.toString();
		const url = queryString ? `/api/v2/departments?${queryString}` : '/api/v2/departments';
		
		return this.client.get(url);
	}

	/**
	 * Get the complete department hierarchy
	 */
	async getHierarchy(): Promise<DepartmentHierarchyResponse> {
		return this.client.get('/api/v2/departments/hierarchy');
	}

	/**
	 * Update a department
	 */
	async update(id: string, data: UpdateDepartmentRequest): Promise<Department> {
		return this.client.put(`/api/v2/departments/${id}`, data);
	}

	/**
	 * Delete a department (soft delete)
	 */
	async delete(id: string): Promise<{ message: string; id: string }> {
		return this.client.delete(`/api/v2/departments/${id}`);
	}

	/**
	 * Get all subdepartments of a department
	 */
	async getSubDepartments(id: string): Promise<SubDepartmentsResponse> {
		return this.client.get(`/api/v2/departments/${id}/subdepartments`);
	}

	/**
	 * Get all employees in a department
	 */
	async getDepartmentEmployees(id: string): Promise<DepartmentEmployeesResponse> {
		return this.client.get(`/api/v2/departments/${id}/employees`);
	}

	/**
	 * Get root departments (no parent)
	 */
	async getRootDepartments(): Promise<DepartmentListResponse> {
		return this.list({ parent_id: null });
	}

	/**
	 * Get active departments only
	 */
	async getActiveDepartments(): Promise<DepartmentListResponse> {
		return this.list({ active_only: true });
	}
}

export const departmentApi = new DepartmentApi();