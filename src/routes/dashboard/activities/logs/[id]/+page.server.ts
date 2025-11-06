/**
 * Activity Log Detail Page - Server
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T047
 * Created: 2025-10-02
 *
 * Server-side data loading for individual audit log detail with rollback capability.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { locals, params, url, cookies } = event;

	// RBAC: Only system_admin, super_admin, hr_admin, and admin can access audit logs
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const userRole = locals.user.role || 'employee';
	const allowedRoles = ['system_admin', 'super_admin', 'hr_admin', 'admin'];

	if (!allowedRoles.includes(userRole)) {
		error(403, {
        			message: 'Access denied. Only administrators can view audit logs.'
        		});
	}

	const logId = params.id;

	try {
		// Initialize GraphQL client with session auth (same approach as list page)
		const { GraphQLClient } = await import('$lib/server/graphql-client');
		const client = GraphQLClient.fromCookies(cookies);

		// Fetch the activity log by ID using GraphQL query
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

		// Transform log to match expected format
		// Note: beforeSnapshot, afterSnapshot, isRollback are now direct properties
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
			rollback_of_log_id: null, // TODO: Implement when rollback chain tracking is added
			created_at: log.createdAt,
			ip_address: log.ipAddress || null,
			user_agent: log.userAgent || null
		};

		// Fetch all logs for the same resource (timeline)
		// Note: The activityLogs query doesn't support resourceType/resourceId filters,
		// so we fetch a larger set and filter on the server side
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

				// Filter logs for the same resource type and resource ID
				const filteredLogs = rawTimelineLogs.filter(
					(tlog: any) =>
						tlog.resourceType === transformedLog.resource_type &&
						tlog.resourceId === transformedLog.resource_id
				);

				// Transform timeline logs and sort by timestamp (newest first)
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
						(a: any, b: any) =>
							new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
					);
			} catch (timelineError) {
				console.error('[ActivityLogDetail] Error loading timeline:', timelineError);
				// Continue without timeline if query fails
			}
		}

		// TODO: Implement rollback-related queries when rollback functionality is added
		// - Query for rollback log if this log has been rolled back
		// - Query for original log if this is a rollback log
		// - Query for active rollback requests
		const rollbackLog = null;
		const originalLog = null;
		const activeRequest = null;

		// Calculate field changes for diff view
		const fieldChanges = calculateFieldChanges(
			transformedLog.before_snapshot,
			transformedLog.after_snapshot
		);

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
		console.error('[ActivityLogDetail] Error loading activity log:', err);

		// Handle specific error cases
		if (err && typeof err === 'object' && 'message' in err) {
			const error_msg = err.message as string;
			if (error_msg?.includes('unauthorized') || error_msg?.includes('authentication')) {
				redirect(303, `/login?redirectTo=${url.pathname}`);
			}
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		error(500, {
        			message: 'Failed to load activity log'
        		});
	}
};

/**
 * Unwrap GraphQL response structure to get the actual data
 * GraphQL responses are often wrapped like: { "createTask": { "id": "...", ... } }
 */
function unwrapGraphQLResponse(data: Record<string, any> | null): Record<string, any> | null {
	if (!data) return null;

	// If there's only one top-level key and its value is an object, unwrap it
	const keys = Object.keys(data);
	if (keys.length === 1 && typeof data[keys[0]] === 'object' && data[keys[0]] !== null) {
		// This looks like a wrapped GraphQL response
		return data[keys[0]] as Record<string, any>;
	}

	return data;
}

/**
 * Compare before and after snapshots to identify changed fields
 */
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

	// Unwrap GraphQL response structures
	const unwrappedBefore = unwrapGraphQLResponse(before);
	const unwrappedAfter = unwrapGraphQLResponse(after);

	// Handle null snapshots
	if (!unwrappedBefore && !unwrappedAfter) {
		return changes; // Both null, no changes to report
	}

	if (!unwrappedBefore && unwrappedAfter) {
		// CREATE operation - all fields are added
		for (const field in unwrappedAfter) {
			// Skip internal/system fields that aren't meaningful to show
			if (field.startsWith('__')) continue;

			changes.push({
				field,
				beforeValue: null,
				afterValue: unwrappedAfter[field],
				changeType: 'added'
			});
		}
		return changes.sort((a, b) => a.field.localeCompare(b.field));
	}

	if (unwrappedBefore && !unwrappedAfter) {
		// DELETE operation - all fields are removed
		for (const field in unwrappedBefore) {
			// Skip internal/system fields
			if (field.startsWith('__')) continue;

			changes.push({
				field,
				beforeValue: unwrappedBefore[field],
				afterValue: null,
				changeType: 'removed'
			});
		}
		return changes.sort((a, b) => a.field.localeCompare(b.field));
	}

	// UPDATE operation - both snapshots exist
	// Find modified and removed fields
	for (const field in unwrappedBefore!) {
		// Skip internal/system fields
		if (field.startsWith('__')) continue;

		if (!(field in unwrappedAfter!)) {
			changes.push({
				field,
				beforeValue: unwrappedBefore![field],
				afterValue: null,
				changeType: 'removed'
			});
		} else if (JSON.stringify(unwrappedBefore![field]) !== JSON.stringify(unwrappedAfter![field])) {
			changes.push({
				field,
				beforeValue: unwrappedBefore![field],
				afterValue: unwrappedAfter![field],
				changeType: 'modified'
			});
		}
	}

	// Find added fields
	for (const field in unwrappedAfter!) {
		// Skip internal/system fields
		if (field.startsWith('__')) continue;

		if (!(field in unwrappedBefore!)) {
			changes.push({
				field,
				beforeValue: null,
				afterValue: unwrappedAfter![field],
				changeType: 'added'
			});
		}
	}

	return changes.sort((a, b) => a.field.localeCompare(b.field));
}
