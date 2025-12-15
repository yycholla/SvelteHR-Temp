import type { DepartmentReference } from './common';
import type { ActivityAction, ResourceType } from './enums';

export interface ActivityLog {
	id: string;
	employeeId: string;
	employee?: {
		id: string;
		displayName: string;
		email: string;
		departmentId?: string;
		department?: DepartmentReference;
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

export interface ActivityStatistics {
	totalActivities: number;
	activitiesThisWeek: number;
	activitiesThisMonth: number;
	mostCommonAction: ActivityAction;
	mostCommonResourceType: ResourceType;
}
