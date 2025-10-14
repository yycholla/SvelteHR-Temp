// Audit Logs Page Server-Side Data Loading (Admin Only)
// Feature: 019-we-need-to - Task T031
// Purpose: Load system-wide activity logs for administrators

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { ActivityLogsOperations } from '$lib/graphql/activity-logs-operations';
import { createUrqlClient } from '$lib/graphql/client';
import type { ActivityAction, ResourceType } from '$lib/graphql/types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// Get user credentials for GraphQL operations
	const token = cookies.get('hr_token') || cookies.get('auth-token');
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

	// Check if user has admin privileges
	const userPermissions = locals.permissions || [];
	const hasAdminAccess =
		userPermissions.includes('*') ||
		userPermissions.includes('admin:read') ||
		userPermissions.includes('audit:read');

	if (!hasAdminAccess) {
		// Only admins can access audit logs
		throw error(403, {
			message: 'Access denied. Administrator privileges required to view audit logs.'
		});
	}

	try {
		// Initialize GraphQL client and operations
		const urqlClient = createUrqlClient(undefined, token);
		const activityOps = new ActivityLogsOperations(urqlClient);

		// Get query parameters for filtering
		const employeeId = url.searchParams.get('employee');
		const actionFilter = url.searchParams.get('action') as ActivityAction | null;
		const resourceTypeFilter = url.searchParams.get('resourceType') as ResourceType | null;
		const daysBack = parseInt(url.searchParams.get('days') || '7');
		const searchQuery = url.searchParams.get('search') || '';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '100');

		// Build filter for audit logs
		// Note: PostGraphile's 'condition' parameter only supports exact matches
		const filter: any = {};

		if (employeeId) {
			filter.employeeId = employeeId;
		}

		if (actionFilter) {
			filter.action = actionFilter;
		}

		if (resourceTypeFilter) {
			filter.resourceType = resourceTypeFilter;
		}

		// Date range filtering will be done client-side
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - daysBack);

		// If search query provided, add resource ID or description filter
		// This is a simplified search - could be enhanced with full-text search
		if (searchQuery) {
			// Search in details JSONB field or description
			// Note: This would need to be implemented in the GraphQL operation
			// For now, we'll just pass it to the client for filtering
		}

		// Fetch system-wide audit logs (admin has access to all)
		const logsResult = await activityOps.getAuditLogs({
			first: limit,
			offset: (page - 1) * limit,
			filter,
			userCredentials
		});

		// Get all logs for statistics (without pagination)
		// Note: Date filtering will be done after fetching
		const allLogsResult = await activityOps.getAuditLogs({
			first: 1000,
			filter: {},
			userCredentials
		});

		// Filter logs by date range client-side
		const filteredLogs = allLogsResult.activities.filter((log: any) => {
			const logDate = new Date(log.createdAt);
			return logDate >= startDate;
		});

		// Calculate statistics from filtered logs
		const stats = {
			total: logsResult.totalCount,
			creates: filteredLogs.filter((l: any) => l.action === 'create').length,
			updates: filteredLogs.filter((l: any) => l.action === 'update').length,
			deletes: filteredLogs.filter((l: any) => l.action === 'delete').length,
			views: filteredLogs.filter((l: any) => l.action === 'view').length,
			logins: filteredLogs.filter((l: any) => l.action === 'login').length
		};

		// Get unique employees for filter dropdown (limit to 100 most active)
		const uniqueEmployees = new Map();
		filteredLogs.forEach((log: any) => {
			if (log.employeeId && !uniqueEmployees.has(log.employeeId)) {
				uniqueEmployees.set(log.employeeId, {
					id: log.employeeId,
					name: log.userByEmployeeId?.displayName || 'Unknown'
				});
			}
		});

		// Transform logs to match ActivityLog interface
		const transformedLogs = logsResult.activities.map((log: any) => ({
			id: log.id,
			employeeId: log.employeeId,
			userId: log.userId,
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
			details: log.details,
			beforeSnapshot: log.beforeSnapshot,
			afterSnapshot: log.afterSnapshot,
			isRollback: log.isRollback || false,
			rolledBackLogId: log.rolledBackLogId,
			ipAddress: log.ipAddress,
			userAgent: log.userAgent,
			createdAt: log.createdAt
		}));

		return {
			logs: transformedLogs,
			totalCount: logsResult.totalCount,
			hasNextPage: logsResult.hasNextPage,
			currentPage: page,
			limit,
			filters: {
				employeeId,
				action: actionFilter,
				resourceType: resourceTypeFilter,
				daysBack,
				searchQuery
			},
			statistics: stats,
			employees: Array.from(uniqueEmployees.values()).slice(0, 100),
			user: locals.user
		};
	} catch (err: any) {
		console.error('Error loading audit logs:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		throw error(500, {
			message: 'Failed to load audit logs. Please try again later.'
		});
	}
};

// Helper function to get role level for authorization
function getRoleLevel(role: string | undefined): number {
	const roleLevels: Record<string, number> = {
		admin: 100,
		super_admin: 100,
		hr_admin: 100,
		hr_manager: 80,
		manager: 60,
		employee: 20
	};

	return roleLevels[role?.toLowerCase().replace('-', '_') || 'employee'] || 20;
}
