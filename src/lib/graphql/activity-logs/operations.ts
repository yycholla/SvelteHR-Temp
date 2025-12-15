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
