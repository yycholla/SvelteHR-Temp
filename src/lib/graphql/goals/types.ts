// Types for Goals Management

export interface EmployeeGoalFilter {
	status?: {
		equalTo?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
		in?: Array<'not_started' | 'in_progress' | 'completed' | 'cancelled'>;
	};
	priority?: {
		equalTo?: 'low' | 'medium' | 'high';
		in?: Array<'low' | 'medium' | 'high'>;
	};
	employeeId?: {
		equalTo?: string;
	};
	targetDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
		lessThan?: string;
	};
	quarter?: {
		equalTo?: string;
	};
	year?: {
		equalTo?: number;
	};
	progress?: {
		greaterThanOrEqualTo?: number;
		lessThanOrEqualTo?: number;
	};
	employee?: {
		departmentId?: {
			equalTo?: string;
		};
		displayName?: {
			includesInsensitive?: string;
		};
	};
}

export interface CreateEmployeeGoalInput {
	clientMutationId?: string;
	employeeGoal: {
		employeeId: string;
		title: string;
		description: string;
		targetDate: string;
		progress?: number;
		status?: 'not_started' | 'in_progress' | 'completed';
		priority?: 'low' | 'medium' | 'high';
		quarter?: string;
		year?: number;
		createdBy: string;
	};
}

export interface UpdateEmployeeGoalInput {
	clientMutationId?: string;
	id: string;
	patch: {
		title?: string;
		description?: string;
		targetDate?: string;
		progress?: number;
		status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
		priority?: 'low' | 'medium' | 'high';
		quarter?: string;
		year?: number;
	};
}

export interface DeleteEmployeeGoalInput {
	clientMutationId?: string;
	id: string;
}

export interface EmployeeGoal {
	id: string;
	employeeId: string;
	employee: {
		id: string;
		displayName: string;
		email: string;
		jobTitle?: string;
		department: {
			id: string;
			name: string;
		};
	};
	title: string;
	description: string;
	targetDate: string;
	progress: number;
	status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
	priority: 'low' | 'medium' | 'high';
	quarter?: string;
	year?: number;
	createdBy: string;
	creator: {
		id: string;
		displayName: string;
		email: string;
	};
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
}

export interface GoalStatistics {
	totalGoals: number;
	activeGoals: number;
	completedGoals: number;
	overdueGoals: number;
	highPriorityGoals: number;
	averageProgress: number;
	completionRate: number;
}
