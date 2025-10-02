// GraphQL Operations: Activity Logs (Dual-Tab: My Activities + Audit Logs)
import type { Client } from '@urql/core';
// Feature: 019-we-need-to - Task T015
// Purpose: Activity logging with RLS-enforced employee view vs admin audit view

import { gql } from '@urql/svelte';
import type { UserCredentials } from '$lib/models/data-request';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get user's own activities ("My Activities" tab)
 * RLS Policy: activity_user_own_access (employee sees only their own activities)
 * PostGraphile: Uses allActivityLogs and ActivityLogCondition
 */
export const GET_USER_ACTIVITIES = gql`
	query GetUserActivities(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [ActivityLogsOrderBy!] = [CREATED_AT_DESC]
		$condition: ActivityLogCondition
	) {
		allActivityLogs(
			first: $first
			offset: $offset
			orderBy: $orderBy
			condition: $condition
		) {
			nodes {
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
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
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
	query GetResourceActivityHistory(
		$resourceType: String!
		$resourceId: UUID!
		$first: Int = 20
	) {
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
	query GetActivitiesByDateRange(
		$employeeId: UUID
		$first: Int = 1000
	) {
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
	details?: Record<string, any>;
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
export function groupActivitiesByDate(
	activities: ActivityLog[]
): Map<string, ActivityLog[]> {
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
 */
export class ActivityLogsOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
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
		filter?: any; // Changed from ActivityLogFilter to any for PostGraphile condition
		userCredentials: UserCredentials;
	}): Promise<{
		activities: ActivityLog[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Merge employeeId with filter for condition
		const condition = { ...params.filter, employeeId: params.employeeId };

		const dataRequest = createDataRequest({
			operationName: 'GetUserActivities',
			variables: {
				first: params.first || 50,
				offset: params.offset || 0,
				condition
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_USER_ACTIVITIES, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load activities. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No activities data returned. Please try again.'
				});
			}

			return {
				activities: result.data.allActivityLogs.nodes,
				totalCount: result.data.allActivityLogs.totalCount,
				hasNextPage: result.data.allActivityLogs.pageInfo.hasNextPage
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load activities. Please try again.'
			});
		}
	}

	/**
	 * Get all system activities ("Audit Logs" tab - admin only)
	 * RLS ensures only admins can access this
	 * PostGraphile: Uses condition instead of filter
	 */
	async getAuditLogs(params: {
		first?: number;
		offset?: number;
		filter?: any;
		userCredentials: UserCredentials;
	}): Promise<{
		activities: ActivityLog[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetAuditLogs',
			variables: {
				first: params.first || 100,
				offset: params.offset || 0,
				condition: params.filter || {}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_AUDIT_LOGS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load audit logs. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No audit logs data returned. Please try again.'
				});
			}

			return {
				activities: result.data.allActivityLogs.nodes,
				totalCount: result.data.allActivityLogs.totalCount,
				hasNextPage: result.data.allActivityLogs.pageInfo.hasNextPage
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load audit logs. Please try again.'
			});
		}
	}

	/**
	 * Get activity history for specific resource
	 */
	async getResourceActivityHistory(params: {
		resourceType: ResourceType;
		resourceId: string;
		first?: number;
		userCredentials: UserCredentials;
	}): Promise<ActivityLog[]> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetResourceActivityHistory',
			variables: {
				resourceType: params.resourceType,
				resourceId: params.resourceId,
				first: params.first || 20
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_RESOURCE_ACTIVITY_HISTORY, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load activity history. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No activity history data returned. Please try again.'
				});
			}

			return result.data.allActivityLogs.nodes;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load activity history. Please try again.'
			});
		}
	}

	/**
	 * Get activities by date range
	 */
	async getActivitiesByDateRange(params: {
		employeeId?: string;
		startDate: string;
		endDate: string;
		first?: number;
		userCredentials: UserCredentials;
	}): Promise<ActivityLog[]> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetActivitiesByDateRange',
			variables: {
				employeeId: params.employeeId,
				startDate: params.startDate,
				endDate: params.endDate,
				first: params.first || 50
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_ACTIVITIES_BY_DATE_RANGE, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load activities. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No activities data returned. Please try again.'
				});
			}

			return result.data.allActivityLogs.nodes;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load activities by date range. Please try again.'
			});
		}
	}
}

/**
 * Factory function to create ActivityLogsOperations instance
 */
export function createActivityLogsOperations(client: Client): ActivityLogsOperations {
	return new ActivityLogsOperations(client);
}
