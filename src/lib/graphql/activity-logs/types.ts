export type ActivityAction = 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout';
export type ResourceType =
	| 'event'
	| 'task'
	| 'leave_request'
	| 'profile'
	| 'document'
	| 'employee'
	| 'department'
	| 'performance_review'
	| 'notification'
	| 'system';

export interface ActivityLogFilter {
	action?: {
		equalTo?: ActivityAction;
		in?: ActivityAction[];
	};
	resourceType?: {
		equalTo?: ResourceType;
		in?: ResourceType[];
	};
	resourceId?: {
		equalTo?: string;
	};
	employeeId?: {
		equalTo?: string;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
}

export interface ActivityLog {
	id: string;
	employeeId: string;
	employee?: {
		id: string;
		displayName: string;
		email: string;
		departmentId?: string;
		department?: {
			id: string;
			name: string;
		};
	};
	action: ActivityAction;
	resourceType: ResourceType;
	resourceId?: string;
	details?: Record<string, unknown>;
	beforeSnapshot?: Record<string, unknown>;
	afterSnapshot?: Record<string, unknown>;
	isRollback?: boolean;
	rolledBackLogId?: string;
	ipAddress?: string;
	userAgent?: string;
	createdAt: string;
}
