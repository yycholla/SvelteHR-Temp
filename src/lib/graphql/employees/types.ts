export interface Employee {
	id: string;
	email: string;
	displayName: string;
	firstName: string;
	lastName: string;
	fullName: string;
	role?: string;
	phone?: string;
	jobTitle?: string;
	departmentId?: string;
	managerId?: string;
	hireDate?: string;
	terminationDate?: string;
	isActive: boolean;
	status: string;
	createdAt: string;
	updatedAt: string;
	avatarUrl?: string;
	profileImage?: string;
	department?: {
		id: string;
		name: string;
		description?: string;
		managerId?: string;
		manager?: {
			id: string;
			fullName: string;
			displayName?: string;
			email?: string;
		};
	};
	manager?: {
		id: string;
		fullName: string;
		displayName?: string;
		email?: string;
	};
}

export interface EmployeeFilter {
	isActive?: boolean;
	departmentId?: string;
	managerId?: string;
	jobTitle?: string;
	search?: string;
}

export interface Department {
	id: string;
	name: string;
	description?: string;
	managerId?: string;
	createdAt: string;
	updatedAt: string;
	manager?: {
		id: string;
		fullName: string;
	};
}

export interface CreateUserInput {
	email: string;
	firstName: string;
	lastName: string;
	phone?: string;
	departmentId?: string;
	managerId?: string;
	hireDate?: string;
	status: string;
}

export interface UpdateUserInput {
	email?: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
	departmentId?: string;
	managerId?: string;
	hireDate?: string;
	terminationDate?: string;
	status?: string;
}

export interface EmployeeStatistic {
	id: string;
	snapshotDate: string;
	totalCount: number;
	activeCount: number;
	inactiveCount: number;
	departmentCount: number;
	createdAt: string;
	updatedAt: string;
}
