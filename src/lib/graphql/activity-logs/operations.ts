import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { BaseOperations } from '../base-operations';
import {
	GET_USER_ACTIVITIES,
	GET_AUDIT_LOGS,
	GET_RESOURCE_ACTIVITY_HISTORY,
	GET_ACTIVITIES_BY_DATE_RANGE,
	GET_ACTIVITY_LOG_BY_ID
} from './queries';
import type { ActivityLog, ResourceType } from './types';

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
	 * Backend: Uses activityLogs from Rust GraphQL schema
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
		const limit = params.first || 50;
		const offset = params.offset || 0;

		const result = await this.executeQuery(
			GET_USER_ACTIVITIES,
			{
				userId: params.employeeId as any,
				limit,
				offset
			},
			{
				operationName: 'GetUserActivities',
				errorMessage: 'Unable to load activities. Please try again.'
			}
		);

		const activities = result.activityLogs || [];
		// Note: We don't have a count query here, estimate from results
		const hasMore = activities.length === limit;

		return {
			activities,
			totalCount: hasMore ? offset + limit + 1 : offset + activities.length,
			hasNextPage: hasMore
		};
	}

	/**
	 * Get all system activities ("Audit Logs" tab - admin only)
	 * RLS ensures only admins can access this
	 * Backend: Uses activityLogs from Rust GraphQL schema
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
		const limit = params.first || 100;
		const offset = params.offset || 0;

		const result = await this.executeQuery(
			GET_AUDIT_LOGS,
			{
				userId: undefined, // undefined = all users (admin only)
				limit,
				offset
			},
			{
				operationName: 'GetAuditLogs',
				errorMessage: 'Unable to load audit logs. Please try again.'
			}
		);

		const activities = result.activityLogs || [];
		const totalCount = result.activityLogsCount || 0;

		return {
			activities,
			totalCount,
			hasNextPage: offset + limit < totalCount
		};
	}

	/**
	 * Get activity history for specific resource
	 * Backend: Uses activityLogs from Rust GraphQL schema
	 * Note: Filtering by resourceType/resourceId done client-side
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
				userId: undefined, // Get all users' activities for this resource
				limit: params.first || 20,
				offset: 0
			},
			{
				operationName: 'GetResourceActivityHistory',
				errorMessage: 'Unable to load activity history. Please try again.'
			}
		);

		const activities = result.activityLogs || [];

		// Client-side filtering by resourceType and resourceId
		return activities.filter(
			(log: ActivityLog) =>
				log.resourceType === params.resourceType && log.resourceId === params.resourceId
		);
	}

	/**
	 * Get activities by date range
	 * Backend: Uses activityLogs from Rust GraphQL schema
	 * Note: Date filtering done client-side
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
				userId: (params.employeeId || undefined) as any,
				limit: params.first || 50,
				offset: 0
			},
			{
				operationName: 'GetActivitiesByDateRange',
				errorMessage: 'Unable to load activities. Please try again.'
			}
		);

		const activities = result.activityLogs || [];
		const startDate = new Date(params.startDate);
		const endDate = new Date(params.endDate);

		// Client-side filtering by date range
		return activities.filter((log: ActivityLog) => {
			const logDate = new Date(log.createdAt);
			return logDate >= startDate && logDate <= endDate;
		});
	}

	/**
	 * Get single activity log by ID
	 * Backend: Uses activityLog (singular) from Rust GraphQL schema
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

		if (!result?.activityLog) {
			return null;
		}

		const log = result.activityLog;

		// Transform to ActivityLog interface
		return {
			id: log.id,
			employeeId: log.userId, // Backend uses userId field
			employee: undefined, // Not available in simple query
			action: log.action,
			resourceType: log.resourceType,
			resourceId: log.resourceId,
			beforeSnapshot: undefined, // Not available in current backend schema
			afterSnapshot: undefined, // Not available in current backend schema
			isRollback: false, // Not available in current backend schema
			rolledBackLogId: undefined, // Not available in current backend schema
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
