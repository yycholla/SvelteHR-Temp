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
	const { locals, params, url } = event;

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

	const logId = params.id;

	// TODO: Replace with actual GraphQL query to MountainHR backend
	// Backend endpoint needed:
	// - GET /api/v2/activity-logs/{logId}
	// - GET /api/v2/activity-logs/{logId}/related (for rollback chain)

	// PLACEHOLDER: Mock activity log data
	const mockLog = {
		id: logId,
		employee_id: 'emp_001',
		employee_name: 'John Doe',
		department_name: 'Engineering',
		action: 'UPDATE',
		resource_type: 'users',
		resource_id: 'user_123',
		before_snapshot: {
			first_name: 'John',
			last_name: 'Doe',
			email: 'john.doe@example.com',
			department_id: 'dept_001',
			role: 'employee',
			salary: 65000
		},
		after_snapshot: {
			first_name: 'John',
			last_name: 'Doe',
			email: 'john.doe@example.com',
			department_id: 'dept_002',
			role: 'manager',
			salary: 75000
		},
		is_rollback: false,
		rolled_back_log_id: null,
		rollback_of_log_id: null,
		created_at: new Date().toISOString(),
		ip_address: '192.168.1.100',
		user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
	};

	// Check if this log has been rolled back
	const mockRollbackLog = null; // TODO: Fetch if exists

	// Check if this is a rollback log (get original)
	const mockOriginalLog = null; // TODO: Fetch if is_rollback === true

	// Check for active rollback requests
	const mockActiveRequest = null; // TODO: Fetch from rollback_requests table

	// Calculate field changes for diff view
	const fieldChanges = calculateFieldChanges(
		mockLog.before_snapshot,
		mockLog.after_snapshot
	);

	return {
		log: mockLog,
		rollbackLog: mockRollbackLog,
		originalLog: mockOriginalLog,
		activeRequest: mockActiveRequest,
		fieldChanges,
		userRole,
		canRollback: userRole === 'super_admin',
		canRequestRollback: ['super_admin', 'hr_admin', 'admin'].includes(userRole),
		userContext: {
			userId: locals.user.id,
			role: userRole,
			departmentId: locals.user.department_id || null
		}
	};
};

/**
 * Compare before and after snapshots to identify changed fields
 */
function calculateFieldChanges(
	before: Record<string, any>,
	after: Record<string, any>
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

	// Find modified and removed fields
	for (const field in before) {
		if (!(field in after)) {
			changes.push({
				field,
				beforeValue: before[field],
				afterValue: null,
				changeType: 'removed'
			});
		} else if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
			changes.push({
				field,
				beforeValue: before[field],
				afterValue: after[field],
				changeType: 'modified'
			});
		}
	}

	// Find added fields
	for (const field in after) {
		if (!(field in before)) {
			changes.push({
				field,
				beforeValue: null,
				afterValue: after[field],
				changeType: 'added'
			});
		}
	}

	return changes.sort((a, b) => a.field.localeCompare(b.field));
}
