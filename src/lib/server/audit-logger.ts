import { logger } from '$lib/utils/logger';
/**
 * Audit Logging for Management Actions
 * Feature: 016-repair-management-pages - Task T039
 * Purpose: Log all management actions (CRUD, approvals, rejections) to audit_logs table
 */

import type { RequestEvent } from '@sveltejs/kit';
import { getGraphQLEndpoint } from '$lib/server/api-url';

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export type AuditAction =
	| 'CREATE'
	| 'UPDATE'
	| 'DELETE'
	| 'APPROVE'
	| 'REJECT'
	| 'GENERATE'
	| 'EXPORT'
	| 'VIEW'
	| 'BULK_UPDATE'
	| 'BULK_DELETE';

export type AuditResource =
	| 'leave_request'
	| 'performance_review'
	| 'goal'
	| 'task'
	| 'report'
	| 'user'
	| 'department'
	| 'role'
	| 'permission'
	| 'system_setting';

export interface AuditLogEntry {
	userId: string;
	action: AuditAction;
	resourceType: AuditResource;
	resourceId: string;
	changes?: Record<string, any>;
	metadata?: Record<string, any>;
	ipAddress?: string | null;
	userAgent?: string | null;
}

// ============================================================================
// AUDIT LOGGING FUNCTIONS
// ============================================================================

/**
 * T039: Log management action to audit_logs table
 *
 * This function:
 * 1. Extracts IP address and user agent from request
 * 2. Constructs audit log entry
 * 3. Inserts to hr_public.audit_logs table via GraphQL
 * 4. Handles errors gracefully (doesn't throw)
 *
 * @param event - SvelteKit RequestEvent for IP/user agent extraction
 * @param entry - Audit log entry data
 * @returns True if logged successfully, false otherwise
 */
export async function logAction(
	event: RequestEvent | null,
	entry: AuditLogEntry
): Promise<boolean> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		// Extract IP address and user agent from request
		const ipAddress = event?.getClientAddress() || null;
		const userAgent = event?.request.headers.get('user-agent') || null;

		// Construct audit log entry
		const auditLog = {
			userId: entry.userId,
			action: entry.action,
			resourceType: entry.resourceType,
			resourceId: entry.resourceId,
			changes: entry.changes || null,
			metadata: entry.metadata || null,
			ipAddress: ipAddress || entry.ipAddress,
			userAgent: userAgent || entry.userAgent,
			createdAt: new Date().toISOString()
		};

		// Insert via GraphQL mutation
		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					mutation CreateAuditLog($input: CreateAuditLogInput!) {
						createAuditLog(input: $input) {
							auditLog {
								id
								createdAt
							}
						}
					}
				`,
				variables: {
					input: { auditLog }
				}
			})
		});

		if (!response.ok) {
			logger.error('[AUDIT LOGGER] GraphQL mutation failed', new Error(response.statusText));
			return false;
		}

		const result = await response.json();

		if (result.errors) {
			logger.error('[AUDIT LOGGER] GraphQL errors:', result.errors);
			return false;
		}

		logger.info('[AUDIT LOGGER] Logged action:', {
			action: entry.action,
			resourceType: entry.resourceType,
			resourceId: entry.resourceId,
			userId: entry.userId
		});

		return true;
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return false;
	}
}

/**
 * Log bulk operation (multiple resources)
 */
export async function logBulkAction(
	event: RequestEvent | null,
	userId: string,
	action: AuditAction,
	resourceType: AuditResource,
	resourceIds: string[],
	metadata?: Record<string, any>
): Promise<boolean> {
	return logAction(event, {
		userId,
		action,
		resourceType,
		resourceId: resourceIds.join(','),
		metadata: {
			...metadata,
			bulkOperation: true,
			resourceCount: resourceIds.length,
			resourceIds
		}
	});
}

// ============================================================================
// MANAGEMENT PAGE AUDIT HELPERS
// ============================================================================

/**
 * Log leave request approval/rejection
 */
export async function logLeaveApproval(
	event: RequestEvent,
	userId: string,
	leaveRequestId: string,
	action: 'APPROVE' | 'REJECT',
	comments?: string
): Promise<boolean> {
	return logAction(event, {
		userId,
		action,
		resourceType: 'leave_request',
		resourceId: leaveRequestId,
		metadata: {
			comments,
			actionType: 'leave_approval'
		}
	});
}

/**
 * Log performance review submission/update
 */
export async function logPerformanceReview(
	event: RequestEvent,
	userId: string,
	reviewId: string,
	action: 'CREATE' | 'UPDATE',
	changes?: Record<string, any>
): Promise<boolean> {
	return logAction(event, {
		userId,
		action,
		resourceType: 'performance_review',
		resourceId: reviewId,
		changes,
		metadata: {
			actionType: 'performance_review'
		}
	});
}

/**
 * Log goal creation/update
 */
export async function logGoalAction(
	event: RequestEvent,
	userId: string,
	goalId: string,
	action: 'CREATE' | 'UPDATE' | 'DELETE',
	changes?: Record<string, any>
): Promise<boolean> {
	return logAction(event, {
		userId,
		action,
		resourceType: 'goal',
		resourceId: goalId,
		changes,
		metadata: {
			actionType: 'goal_management'
		}
	});
}

/**
 * Log task assignment/update
 */
export async function logTaskAction(
	event: RequestEvent,
	userId: string,
	taskId: string,
	action: 'CREATE' | 'UPDATE' | 'DELETE',
	changes?: Record<string, any>
): Promise<boolean> {
	return logAction(event, {
		userId,
		action,
		resourceType: 'task',
		resourceId: taskId,
		changes,
		metadata: {
			actionType: 'task_management'
		}
	});
}

/**
 * Log report generation
 */
export async function logReportGeneration(
	event: RequestEvent,
	userId: string,
	reportId: string,
	reportType: string,
	parameters?: Record<string, any>
): Promise<boolean> {
	return logAction(event, {
		userId,
		action: 'GENERATE',
		resourceType: 'report',
		resourceId: reportId,
		metadata: {
			reportType,
			parameters,
			actionType: 'report_generation'
		}
	});
}

/**
 * Log report export
 */
export async function logReportExport(
	event: RequestEvent,
	userId: string,
	reportId: string,
	format: 'csv' | 'pdf' | 'xlsx'
): Promise<boolean> {
	return logAction(event, {
		userId,
		action: 'EXPORT',
		resourceType: 'report',
		resourceId: reportId,
		metadata: {
			format,
			actionType: 'report_export'
		}
	});
}

// ============================================================================
// ADMIN PAGE AUDIT HELPERS
// ============================================================================

/**
 * Log user management action
 */
export async function logUserManagement(
	event: RequestEvent,
	adminUserId: string,
	targetUserId: string,
	action: 'CREATE' | 'UPDATE' | 'DELETE',
	changes?: Record<string, any>
): Promise<boolean> {
	return logAction(event, {
		userId: adminUserId,
		action,
		resourceType: 'user',
		resourceId: targetUserId,
		changes,
		metadata: {
			actionType: 'user_management',
			performedBy: 'admin'
		}
	});
}

/**
 * Log role assignment
 */
export async function logRoleAssignment(
	event: RequestEvent,
	adminUserId: string,
	targetUserId: string,
	roleId: string,
	roleName: string
): Promise<boolean> {
	return logAction(event, {
		userId: adminUserId,
		action: 'UPDATE',
		resourceType: 'role',
		resourceId: roleId,
		metadata: {
			actionType: 'role_assignment',
			targetUserId,
			roleName,
			performedBy: 'admin'
		}
	});
}

/**
 * Log system settings change
 */
export async function logSystemSettingsChange(
	event: RequestEvent,
	adminUserId: string,
	settingKey: string,
	oldValue: any,
	newValue: any
): Promise<boolean> {
	return logAction(event, {
		userId: adminUserId,
		action: 'UPDATE',
		resourceType: 'system_setting',
		resourceId: settingKey,
		changes: {
			oldValue,
			newValue
		},
		metadata: {
			actionType: 'system_settings',
			performedBy: 'admin'
		}
	});
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get audit logs for a specific resource
 */
export async function getAuditLogsForResource(
	resourceType: AuditResource,
	resourceId: string,
	limit: number = 50
): Promise<any[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetAuditLogsForResource($resourceType: String!, $resourceId: String!, $limit: Int!) {
						auditLogs(
							filter: { resourceType: { equalTo: $resourceType }, resourceId: { equalTo: $resourceId } }
							first: $limit
							orderBy: CREATED_AT_DESC
						) {
							nodes {
								id
								userId
								action
								resourceType
								resourceId
								changes
								metadata
								ipAddress
								userAgent
								createdAt
								userByUserId {
									displayName
									email
								}
							}
						}
					}
				`,
				variables: { resourceType, resourceId, limit }
			})
		});

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		return data?.data?.auditLogs?.nodes || [];
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return [];
	}
}

/**
 * Get audit logs for a specific user's actions
 */
export async function getAuditLogsForUser(userId: string, limit: number = 50): Promise<any[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetAuditLogsForUser($userId: UUID!, $limit: Int!) {
						auditLogs(
							filter: { userId: { equalTo: $userId } }
							first: $limit
							orderBy: CREATED_AT_DESC
						) {
							nodes {
								id
								userId
								action
								resourceType
								resourceId
								changes
								metadata
								ipAddress
								createdAt
							}
						}
					}
				`,
				variables: { userId, limit }
			})
		});

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		return data?.data?.auditLogs?.nodes || [];
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return [];
	}
}
