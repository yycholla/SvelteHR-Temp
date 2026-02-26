import { logger } from '$lib/utils/logger';
/**
 * Activity Log Detail Page - Server
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T047
 *
 * Server-side data loading for individual audit log detail with rollback capability.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAuth, AccessTier } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { params, url, cookies } = event;

	// Check authentication and permissions
	requireAuth(event, { minTier: AccessTier.ALL });

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	const logId = params.id;

	try {
		// Initialize GraphQL client with session auth
		const { GraphQLClient } = await import('$lib/server/graphql-client');
		const client = GraphQLClient.fromCookies(cookies);

		// Fetch the activity log by ID
		const logQuery = `
			query GetActivityLog($id: UUID!) {
				activityLog(id: $id) {
					id
					employeeId
					action
					resourceType
					resourceId
					beforeSnapshot
					afterSnapshot
					isRollback
					rolledBackLogId
					createdAt
					ipAddress
					userAgent
					employee {
						id
						displayName
						department {
							id
							name
						}
					}
				}
			}
		`;

		const logResult = await client.query(logQuery, { id: logId });
		const log = logResult.data?.activityLog;

		if (!log) {
			error(404, {
				message: 'Activity log not found or you do not have permission to view it.'
			});
		}

		const transformedLog = {
			id: log.id,
			employee_id: log.employeeId,
			employee_name: log.employee?.displayName || 'Unknown',
			department_name: log.employee?.department?.name || 'Unknown',
			action: log.action.toUpperCase(),
			resource_type: log.resourceType,
			resource_id: log.resourceId || null,
			before_snapshot: log.beforeSnapshot || null,
			after_snapshot: log.afterSnapshot || null,
			is_rollback: log.isRollback || false,
			rolled_back_log_id: log.rolledBackLogId || null,
			rollback_of_log_id: null,
			created_at: log.createdAt,
			ip_address: log.ipAddress || null,
			user_agent: log.userAgent || null
		};

		let timelineLogs: any[] = [];
		if (transformedLog.resource_id) {
			const timelineQuery = `
				query GetResourceTimeline {
					activityLogs(limit: 500, offset: 0) {
						id
						employeeId
						action
						resourceType
						resourceId
						createdAt
						ipAddress
						isRollback
						employee {
							id
							displayName
						}
					}
				}
			`;

			try {
				const timelineResult = await client.query(timelineQuery, {});
				const rawTimelineLogs = timelineResult.data?.activityLogs || [];
				const filteredLogs = rawTimelineLogs.filter(
					(tlog: any) =>
						tlog.resourceType === transformedLog.resource_type &&
						tlog.resourceId === transformedLog.resource_id
				);
				timelineLogs = filteredLogs
					.map((tlog: any) => ({
						id: tlog.id,
						employee_name: tlog.employee?.displayName || 'Unknown',
						action: tlog.action.toUpperCase(),
						resource_type: tlog.resourceType,
						resource_id: tlog.resourceId,
						created_at: tlog.createdAt,
						ip_address: tlog.ipAddress || null,
						is_rollback: tlog.isRollback || false,
						is_current: tlog.id === logId
					}))
					.sort(
						(a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
					);
			} catch (timelineError) {
				logger.error('[ActivityLogDetail] Error loading timeline', timelineError as Error);
			}
		}

		const rollbackLog = null;
		const originalLog = null;
		const activeRequest = null;

		const fieldChanges = calculateFieldChanges(
			transformedLog.before_snapshot,
			transformedLog.after_snapshot
		);

		const userRole = locals.user.role || 'employee';

		return {
			log: transformedLog,
			timelineLogs,
			rollbackLog,
			originalLog,
			activeRequest,
			fieldChanges,
			userRole,
			canRollback: userRole === 'super_admin',
			canRequestRollback: ['hr_admin', 'admin'].includes(userRole),
			userContext: {
				userId: locals.user.id,
				role: userRole,
				departmentId: (locals.user as any).department_id || null
			}
		};
	} catch (err) {
		logger.error('[ActivityLogDetail] Error loading activity log', err as Error);

		if (err && typeof err === 'object' && 'message' in err) {
			const error_msg = err.message as string;
			if (error_msg?.includes('unauthorized') || error_msg?.includes('authentication')) {
				redirect(303, `/login?redirectTo=${url.pathname}`);
			}
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		error(500, {
			message: 'Failed to load activity log'
		});
	}
};

function unwrapGraphQLResponse(data: Record<string, any> | null): Record<string, any> | null {
	if (!data) return null;
	const keys = Object.keys(data);
	if (keys.length === 1 && typeof data[keys[0]] === 'object' && data[keys[0]] !== null) {
		return data[keys[0]] as Record<string, any>;
	}
	return data;
}

function calculateFieldChanges(
	before: Record<string, any> | null,
	after: Record<string, any> | null
): Array<{
	field: string;
	beforeValue: any;
	afterValue: any;
	changeType: 'added' | 'removed' | 'modified';
}> {
	const changes: Array<{
		field: string;
		beforeValue: any;
		afterValue: any;
		changeType: 'added' | 'removed' | 'modified';
	}> = [];

	const unwrappedBefore = unwrapGraphQLResponse(before);
	const unwrappedAfter = unwrapGraphQLResponse(after);

	if (!unwrappedBefore && !unwrappedAfter) return changes;

	if (!unwrappedBefore && unwrappedAfter) {
		for (const field in unwrappedAfter) {
			if (field.startsWith('__')) continue;
			changes.push({ field, beforeValue: null, afterValue: unwrappedAfter[field], changeType: 'added' });
		}
		return changes.sort((a, b) => a.field.localeCompare(b.field));
	}

	if (unwrappedBefore && !unwrappedAfter) {
		for (const field in unwrappedBefore) {
			if (field.startsWith('__')) continue;
			changes.push({ field, beforeValue: unwrappedBefore[field], afterValue: null, changeType: 'removed' });
		}
		return changes.sort((a, b) => a.field.localeCompare(b.field));
	}

	for (const field in unwrappedBefore!) {
		if (field.startsWith('__')) continue;
		if (!(field in unwrappedAfter!)) {
			changes.push({ field, beforeValue: unwrappedBefore![field], afterValue: null, changeType: 'removed' });
		} else if (JSON.stringify(unwrappedBefore![field]) !== JSON.stringify(unwrappedAfter![field])) {
			changes.push({ field, beforeValue: unwrappedBefore![field], afterValue: unwrappedAfter![field], changeType: 'modified' });
		}
	}

	for (const field in unwrappedAfter!) {
		if (field.startsWith('__')) continue;
		if (!(field in unwrappedBefore!)) {
			changes.push({ field, beforeValue: null, afterValue: unwrappedAfter![field], changeType: 'added' });
		}
	}

	return changes.sort((a, b) => a.field.localeCompare(b.field));
}
