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
import { ActivityLogsOperations } from '$lib/graphql/activity-logs-operations';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async (event) => {
	const { locals, params, url, cookies } = event;

	// RBAC: Only super_admin, hr_admin, and admin can access audit logs
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const userRole = locals.user.role || 'employee';
	const allowedRoles = ['super_admin', 'hr_admin', 'admin'];

	if (!allowedRoles.includes(userRole)) {
		throw error(403, {
			message: 'Access denied. Only administrators can view audit logs.'
		});
	}

	// Get user credentials for GraphQL operations
	// Token retrieval removed - session auth handled by server hooks
	if (!token) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	const userCredentials = {
		jwtToken: token,
		userId: locals.user.id,
		roles: locals.roles || [],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
	};

	const logId = params.id;

	try {
		// Initialize GraphQL client and operations
		const urqlClient = createUrqlClient(undefined, token);
		const activityOps = new ActivityLogsOperations(urqlClient);

		// Fetch the activity log by ID
		const log = await activityOps.getActivityLogById({
			logId,
			userCredentials
		});

		if (!log) {
			throw error(404, {
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
				departmentId: locals.user.department_id || null
			}
		};
	} catch (err) {
		console.error('[ActivityLogDetail] Error loading activity log:', err);

		// Handle specific error cases
		if (err && typeof err === 'object' && 'message' in err) {
			const error_msg = err.message as string;
			if (error_msg?.includes('unauthorized') || error_msg?.includes('authentication')) {
				throw redirect(303, `/login?redirectTo=${url.pathname}`);
			}
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, {
			message: 'Failed to load activity log'
		});
	}
};

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

	// Handle null snapshots
	if (!before && !after) {
		return changes; // Both null, no changes to report
	}

	if (!before && after) {
		// CREATE operation - all fields are added
		for (const field in after) {
			changes.push({
				field,
				beforeValue: null,
				afterValue: after[field],
				changeType: 'added'
			});
		}
		return changes.sort((a, b) => a.field.localeCompare(b.field));
	}

	if (before && !after) {
		// DELETE operation - all fields are removed
		for (const field in before) {
			changes.push({
				field,
				beforeValue: before[field],
				afterValue: null,
				changeType: 'removed'
			});
		}
		return changes.sort((a, b) => a.field.localeCompare(b.field));
	}

	// UPDATE operation - both snapshots exist
	// Find modified and removed fields
	for (const field in before!) {
		if (!(field in after!)) {
			changes.push({
				field,
				beforeValue: before![field],
				afterValue: null,
				changeType: 'removed'
			});
		} else if (JSON.stringify(before![field]) !== JSON.stringify(after![field])) {
			changes.push({
				field,
				beforeValue: before![field],
				afterValue: after![field],
				changeType: 'modified'
			});
		}
	}

	// Find added fields
	for (const field in after!) {
		if (!(field in before!)) {
			changes.push({
				field,
				beforeValue: null,
				afterValue: after![field],
				changeType: 'added'
			});
		}
	}

	return changes.sort((a, b) => a.field.localeCompare(b.field));
}
