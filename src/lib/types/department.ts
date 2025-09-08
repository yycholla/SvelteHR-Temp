// Department types for MountainHR API integration
export interface Department {
	id: string;
	name: string;
	description?: string;
	budget?: number | string; // Can be BigInt or string representation
	parent_id?: string | null;
	manager_id?: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	// Navigation/UI properties
	children?: Department[];
	parent?: Department;
	manager?: {
		id: string;
		full_name: string;
		email: string;
	};
	employee_count?: number;
}

export interface CreateDepartmentRequest {
	name: string;
	description?: string;
	budget?: number | string;
	parent_id?: string | null;
	manager_id?: string | null;
}

export interface UpdateDepartmentRequest {
	name?: string;
	description?: string;
	budget?: number | string;
	parent_id?: string | null;
	manager_id?: string | null;
	is_active?: boolean;
}

export interface DepartmentListResponse {
	departments: Department[];
	count: number;
}

export interface DepartmentHierarchyResponse {
	hierarchy: DepartmentTreeNode[];
	total: number;
}

export interface DepartmentTreeNode {
	id: string;
	name: string;
	description?: string;
	budget?: number | string;
	is_active: boolean;
	children: DepartmentTreeNode[];
}

export interface DepartmentEmployeesResponse {
	employees: any[]; // TODO: Import Employee type when available
	count: number;
	department_id: string;
}

export interface SubDepartmentsResponse {
	subdepartments: Department[];
	count: number;
	parent_id: string;
}

// Query options for department filtering
export interface DepartmentQueryOptions {
	active_only?: boolean;
	parent_id?: string | null; // 'null' for root departments
	has_manager?: boolean;
	page?: number;
	pageSize?: number;
	sort?: string;
	order?: 'ASC' | 'DESC';
}
