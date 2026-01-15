import type { User } from './user';

export interface Department {
	id: string;
	name: string;
	code: string;
	description?: string;
	parentDepartment?: Department;
	parentDepartmentId?: string; // Added alias
	childDepartments: Department[];
	manager?: User;
	managerId?: string; // Added alias
	employees: User[];
	employeeCount: number;
	budget?: number;
	budgetLimit?: number;
	costCenter?: string;
	location?: string;
	isRemoteEnabled?: boolean;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface DepartmentFilter {
	searchQuery?: string;
	isActive?: boolean;
	parentDepartmentId?: string | null;
	managerId?: string;
}

export interface CreateDepartmentInput {
	name: string;
	description?: string;
	managerId?: string;
	parentDepartmentId?: string;
}

export interface UpdateDepartmentInput {
	name?: string;
	description?: string;
	managerId?: string;
	parentDepartmentId?: string;
	isActive?: boolean;
}
