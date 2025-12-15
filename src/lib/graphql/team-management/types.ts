import type { User } from '$lib/types/index';

export interface CreateDepartmentInput {
	clientMutationId?: string;
	department: {
		name: string;
		description?: string;
		parentDepartmentId?: string;
		departmentHeadId?: string;
	};
}

export interface UpdateDepartmentInput {
	clientMutationId?: string;
	id: string;
	patch: {
		name?: string;
		description?: string;
		parentDepartmentId?: string;
		departmentHeadId?: string;
	};
}

export interface DeleteDepartmentInput {
	clientMutationId?: string;
	id: string;
}

export interface MoveEmployeeInput {
	clientMutationId?: string;
	id: string;
	patch: {
		departmentId?: string;
		managerId?: string;
	};
}

export interface DepartmentFilter {
	name?: {
		includesInsensitive?: string;
		equalTo?: string;
	};
	parentDepartmentId?: {
		equalTo?: string;
		isNull?: boolean;
	};
	departmentHeadId?: {
		equalTo?: string;
		isNull?: boolean;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
}

export interface TeamSearchFilter {
	searchTerm?: string;
	parentDepartmentId?: string;
	departmentHeadId?: string;
	hasEmployees?: boolean;
	isActive?: boolean;
}

export interface TeamHierarchyNode {
	id: string;
	name: string;
	description?: string;
	departmentHead?: User;
	employeeCount: number;
	activeEmployeeCount: number;
	children: TeamHierarchyNode[];
	level: number;
}

export interface TeamStats {
	totalTeams: number;
	totalEmployees: number;
	activeEmployees: number;
	teamsWithHeads: number;
	averageTeamSize: number;
	sizeDistribution: Array<{
		value: string;
		label: string;
		min: number;
		max: number;
		color: string;
		count: number;
	}>;
	utilizationRate: number;
}
