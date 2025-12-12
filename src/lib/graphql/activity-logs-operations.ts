// GraphQL Operations: Activity Logs (Dual-Tab: My Activities + Audit Logs)
import type { Client } from '@urql/core';
// Feature: 019-we-need-to - Task T015
// Purpose: Activity logging with RLS-enforced employee view vs admin audit view

import { gql } from '@urql/svelte';
import type { UserCredentials } from '$lib/models/data-request';
import { BaseOperations } from './base-operations';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get user's own activities ("My Activities" tab)
 * RLS Policy: activity_user_own_access (employee sees only their own activities)
 * PostGraphile: Uses allActivityLogs and ActivityLogCondition
 */
export const GET_USER_ACTIVITIES = gql`
	query GetUserActivities($userId: UUID, $limit: Int = 50, $offset: Int = 0) {
		activityLogs(userId: $userId, limit: $limit, offset: $offset) {
			id
			employeeId
			userId
			action
			resourceType
			resourceId
			details
			ipAddress
			userAgent
			createdAt
		}
	}
`;

/**
 * Query: Get all system activities ("Audit Logs" tab - admin only)
 * RLS Policy: activity_admin_audit_access (admin sees all activities)
 * PostGraphile: Uses allActivityLogs and ActivityLogCondition
 */
export const GET_AUDIT_LOGS = gql`
	query GetAuditLogs(
		$first: Int = 100
		$offset: Int = 0
		$orderBy: [ActivityLogsOrderBy!] = [CREATED_AT_DESC]
		$condition: ActivityLogCondition
	) {
		allActivityLogs(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				id
				employeeId
				userId
				userByEmployeeId {
					id
					displayName
					email
					departmentId
					departmentByDepartmentId {
						id
						name
					}
				}
				action
				resourceType
				resourceId
				details
				beforeSnapshot
				afterSnapshot
				isRollback
				rolledBackLogId
				ipAddress
				userAgent
				createdAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
`;

/**
 * Query: Get activity history for specific resource
 * PostGraphile: Uses allActivityLogs and condition parameter
 */
export const GET_RESOURCE_ACTIVITY_HISTORY = gql`
	query GetResourceActivityHistory($resourceType: String!, $resourceId: UUID!, $first: Int = 20) {
		allActivityLogs(
			first: $first
			condition: { resourceType: $resourceType, resourceId: $resourceId }
			orderBy: [CREATED_AT_DESC]
		) {
			nodes {
				id
				employeeId
				userId
				userByEmployeeId {
					id
					displayName
					email
				}
				action
				resourceType
				resourceId
				details
				createdAt
			}
			totalCount
		}
	}
`;

/**
 * Query: Get activities by date range
 * PostGraphile: Uses allActivityLogs, date filtering done server-side
 */
export const GET_ACTIVITIES_BY_DATE_RANGE = gql`
	query GetActivitiesByDateRange($employeeId: UUID, $first: Int = 1000) {
		allActivityLogs(
			first: $first
			condition: { employeeId: $employeeId }
			orderBy: [CREATED_AT_DESC]
		) {
			nodes {
				id
				employeeId
				userId
				action
				resourceType
				resourceId
				details
				createdAt
			}
			totalCount
		}
	}
`;

/**
 * Query: Get single activity log by ID
 * PostGraphile: Uses allActivityLogs with condition filter
 */
export const GET_ACTIVITY_LOG_BY_ID = gql`
	query GetActivityLogById($id: UUID!) {
		allActivityLogs(condition: { id: $id }, first: 1) {
			nodes {
				id
				employeeId
				userId
				action
				resourceType
				resourceId
				beforeSnapshot
				afterSnapshot
				isRollback
				rolledBackLogId
				details
				createdAt
				ipAddress
				userAgent
				userByEmployeeId {
					id
					displayName
					email
					departmentId
					departmentByDepartmentId {
						id
						name
					}
				}
			}
		}
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper: Build activity log filter
 */
export function buildActivityFilter({
	action,
	resourceType,
	resourceId,
	employeeId,
	startDate,
	endDate
}: {
	action?: ActivityAction;
	resourceType?: ResourceType;
	resourceId?: string;
	employeeId?: string;
	startDate?: string;
	endDate?: string;
}): ActivityLogFilter {
	const filter: ActivityLogFilter = {};

	if (action) {
		filter.action = { equalTo: action };
	}

	if (resourceType) {
		filter.resourceType = { equalTo: resourceType };
	}

	if (resourceId) {
		filter.resourceId = { equalTo: resourceId };
	}

	if (employeeId) {
		filter.employeeId = { equalTo: employeeId };
	}

	if (startDate || endDate) {
		filter.createdAt = {};
		if (startDate) {
			filter.createdAt.greaterThanOrEqualTo = startDate;
		}
		if (endDate) {
			filter.createdAt.lessThanOrEqualTo = endDate;
		}
	}

	return filter;
}

/**
 * Helper: Group activities by date
 */
export function groupActivitiesByDate(activities: ActivityLog[]): Map<string, ActivityLog[]> {
	const grouped = new Map<string, ActivityLog[]>();

	activities.forEach((activity) => {
		const date = new Date(activity.createdAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		if (!grouped.has(date)) {
			grouped.set(date, []);
		}
		grouped.get(date)!.push(activity);
	});

	return grouped;
}

/**
 * Helper: Get activity icon based on resource type and action
 */
export function getActivityIcon(resourceType: ResourceType, action: ActivityAction): string {
	const iconMap: Record<string, string> = {
		'event-create': '📅',
		'event-update': '✏️',
		'event-delete': '🗑️',
		'task-create': '✅',
		'task-update': '📝',
		'task-delete': '🗑️',
		'leave_request-create': '🏖️',
		'leave_request-update': '📋',
		'profile-update': '👤',
		'document-create': '📄',
		'document-delete': '🗑️',
		'employee-create': '👥',
		'employee-update': '✏️',
		'department-create': '🏢',
		'performance_review-create': '⭐',
		'notification-create': '🔔',
		'system-login': '🔐',
		'system-logout': '🚪'
	};

	const key = `${resourceType}-${action}`;
	return iconMap[key] || '📌';
}

/**
 * Helper: Format activity message
 */
export function formatActivityMessage(activity: ActivityLog): string {
	const actionVerbs: Record<ActivityAction, string> = {
		create: 'created',
		update: 'updated',
		delete: 'deleted',
		view: 'viewed',
		login: 'logged in',
		logout: 'logged out'
	};

	const resourceLabels: Record<ResourceType, string> = {
		event: 'event',
		task: 'task',
		leave_request: 'leave request',
		profile: 'profile',
		document: 'document',
		employee: 'employee',
		department: 'department',
		performance_review: 'performance review',
		notification: 'notification',
		system: 'system'
	};

	const verb = actionVerbs[activity.action] || activity.action;
	const resource = resourceLabels[activity.resourceType] || activity.resourceType;

	// Include title/name from details if available
	let displayName = resource;
	if (activity.details) {
		const title = activity.details.title || activity.details.name;
		if (title) {
			displayName = `${resource} "${title}"`;
		}
	}

	return `${verb} ${displayName}`;
}

/**
 * Helper: Filter activities by resource type
 */
export function filterActivitiesByResourceType(
	activities: ActivityLog[],
	resourceType: ResourceType
): ActivityLog[] {
	return activities.filter((activity) => activity.resourceType === resourceType);
}

/**
 * Helper: Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: string): string {
	const now = new Date();
	const activityDate = new Date(timestamp);
	const diffMs = now.getTime() - activityDate.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) {
		return 'Just now';
	} else if (diffMins < 60) {
		return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
	} else if (diffHours < 24) {
		return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
	} else if (diffDays < 7) {
		return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
	} else {
		return activityDate.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: activityDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
	}
}

// ============================================================================
// OPERATIONS CLASS
// ============================================================================

/**
 * T015: Activity Logs Operations with Dual-Tab RLS
 *
 * Extends BaseOperations to leverage standardized error handling
 * and eliminate ~200 lines of duplicate error handling code.
 */
export class ActivityLogsOperations extends BaseOperations {
	constructor(client: Client) {
		super(client);
	}

	/**
	 * Get user's own activities ("My Activities" tab)
	 * RLS ensures user only sees their own activities
	 * PostGraphile: Uses condition instead of filter
	 */
	async getUserActivities(params: {
		employeeId: string;
		first?: number;
		offset?: number;
		filter?: Record<string, unknown>;
		userCredentials: UserCredentials; // Kept for backward compatibility
	}): Promise<{
		activities: ActivityLog[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		// Merge employeeId with filter for condition
		const condition = { ...params.filter, employeeId: params.employeeId };

		const result = await this.executeQuery(
			GET_USER_ACTIVITIES,
			{
				first: params.first || 50,
				offset: params.offset || 0,
				condition
			},
			{
				operationName: 'GetUserActivities',
				errorMessage: 'Unable to load activities. Please try again.'
			}
		);

		return {
			activities: result.allActivityLogs.nodes,
			totalCount: result.allActivityLogs.totalCount,
			hasNextPage: result.allActivityLogs.pageInfo.hasNextPage
		};
	}

	/**
	 * Get all system activities ("Audit Logs" tab - admin only)
	 * RLS ensures only admins can access this
	 * PostGraphile: Uses condition instead of filter
	 */
	async getAuditLogs(params: {
		first?: number;
		offset?: number;
		filter?: Record<string, unknown>;
		userCredentials: UserCredentials; // Kept for backward compatibility
	}): Promise<{
		activities: ActivityLog[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const result = await this.executeQuery(
			GET_AUDIT_LOGS,
			{
				first: params.first || 100,
				offset: params.offset || 0,
				condition: params.filter || {}
			},
			{
				operationName: 'GetAuditLogs',
				errorMessage: 'Unable to load audit logs. Please try again.'
			}
		);

		return {
			activities: result.allActivityLogs.nodes,
			totalCount: result.allActivityLogs.totalCount,
			hasNextPage: result.allActivityLogs.pageInfo.hasNextPage
		};
	}

	/**
	 * Get activity history for specific resource
	 */
	async getResourceActivityHistory(params: {
		resourceType: ResourceType;
		resourceId: string;
		first?: number;
		userCredentials: UserCredentials; // Kept for backward compatibility
	}): Promise<ActivityLog[]> {
		const result = await this.executeQuery(
			GET_RESOURCE_ACTIVITY_HISTORY,
			{
				resourceType: params.resourceType,
				resourceId: params.resourceId,
				first: params.first || 20
			},
			{
				operationName: 'GetResourceActivityHistory',
				errorMessage: 'Unable to load activity history. Please try again.'
			}
		);

		return result.allActivityLogs.nodes;
	}

	/**
	 * Get activities by date range
	 */
	async getActivitiesByDateRange(params: {
		employeeId?: string;
		startDate: string;
		endDate: string;
		first?: number;
		userCredentials: UserCredentials; // Kept for backward compatibility
	}): Promise<ActivityLog[]> {
		const result = await this.executeQuery(
			GET_ACTIVITIES_BY_DATE_RANGE,
			{
				employeeId: params.employeeId,
				startDate: params.startDate,
				endDate: params.endDate,
				first: params.first || 50
			},
			{
				operationName: 'GetActivitiesByDateRange',
				errorMessage: 'Unable to load activities. Please try again.'
			}
		);

		return result.allActivityLogs.nodes;
	}

	/**
	 * Get single activity log by ID
	 */
	async getActivityLogById(params: {
		logId: string;
		userCredentials: UserCredentials; // Kept for backward compatibility
	}): Promise<ActivityLog | null> {
		const result = await this.executeQuery(
			GET_ACTIVITY_LOG_BY_ID,
			{ id: params.logId },
			{
				operationName: 'GetActivityLogById',
				errorMessage: 'Unable to load activity log. Please try again.'
			}
		);

		if (!result?.allActivityLogs?.nodes || result.allActivityLogs.nodes.length === 0) {
			return null;
		}

		const log = result.allActivityLogs.nodes[0];

		// Transform to ActivityLog interface
		return {
			id: log.id,
			employeeId: log.employeeId,
			employee: log.userByEmployeeId
				? {
						id: log.userByEmployeeId.id,
						displayName: log.userByEmployeeId.displayName,
						email: log.userByEmployeeId.email,
						departmentId: log.userByEmployeeId.departmentId,
						department: log.userByEmployeeId.departmentByDepartmentId
							? {
									id: log.userByEmployeeId.departmentByDepartmentId.id,
									name: log.userByEmployeeId.departmentByDepartmentId.name
								}
							: undefined
					}
				: undefined,
			action: log.action,
			resourceType: log.resourceType,
			resourceId: log.resourceId,
			beforeSnapshot: log.beforeSnapshot,
			afterSnapshot: log.afterSnapshot,
			isRollback: log.isRollback,
			rolledBackLogId: log.rolledBackLogId,
			ipAddress: log.ipAddress,
			userAgent: log.userAgent,
			createdAt: log.createdAt
		};
	}
}

/**
 * Factory function to create ActivityLogsOperations instance
 */
export function createActivityLogsOperations(client: Client): ActivityLogsOperations {
	return new ActivityLogsOperations(client);
}
