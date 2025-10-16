/**
 * Audit Logs Page - Server Load
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T044
 * Created: 2025-10-02
 *
 * Server-side data loading for audit logs page with RBAC filtering and pagination.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ActivityLogsOperations } from '$lib/graphql/activity-logs-operations';
import { createUrqlClient } from '$lib/graphql/client';
import type { ActivityAction, ResourceType } from '$lib/graphql/types';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

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

	try {
		// Parse URL query parameters for filtering and pagination
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const pageSize = parseInt(url.searchParams.get('limit') || '50', 10);
		const employeeId = url.searchParams.get('employee') || null;
		const actionFilter = url.searchParams.get('action') as ActivityAction | null;
		const resourceTypeFilter = url.searchParams.get('resourceType') as ResourceType | null;
		const daysBack = parseInt(url.searchParams.get('days') || '7');
		const searchQuery = url.searchParams.get('search') || '';

		// Initialize GraphQL client and operations
		const urqlClient = createUrqlClient(undefined, token);
		const activityOps = new ActivityLogsOperations(urqlClient);

		// Build filter for audit logs
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

		// Date range filtering
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - daysBack);

		// Fetch audit logs
		const logsResult = await activityOps.getAuditLogs({
			first: pageSize,
			offset: (page - 1) * pageSize,
			filter,
			userCredentials
		});

		// Get all logs for statistics
		const allLogsResult = await activityOps.getAuditLogs({
			first: 1000,
			filter: {},
			userCredentials
		});

		// Filter logs by date range
		const filteredLogs = allLogsResult.activities.filter((log: any) => {
			const logDate = new Date(log.createdAt);
			return logDate >= startDate;
		});

		// Calculate statistics
		const stats = {
			total: logsResult.totalCount,
			creates: filteredLogs.filter((l: any) => l.action === 'create').length,
			updates: filteredLogs.filter((l: any) => l.action === 'update').length,
			deletes: filteredLogs.filter((l: any) => l.action === 'delete').length,
			views: filteredLogs.filter((l: any) => l.action === 'view').length,
			logins: filteredLogs.filter((l: any) => l.action === 'login').length
		};

		// Get unique employees for filter dropdown
		const uniqueEmployees = new Map();
		filteredLogs.forEach((log: any) => {
			if (log.employeeId && !uniqueEmployees.has(log.employeeId)) {
				uniqueEmployees.set(log.employeeId, {
					id: log.employeeId,
					name: log.userByEmployeeId?.displayName || 'Unknown'
				});
			}
		});

		// Get unique resource types for filter dropdown
		const uniqueResourceTypes = [...new Set(filteredLogs.map((log: any) => log.resourceType))];

		// Transform logs to match ActivityLog interface
		const transformedLogs = logsResult.activities.map((log: any) => ({
			id: log.id,
			employeeId: log.employeeId,
			userId: log.userId,
			employee: log.userByEmployeeId ? {
				id: log.userByEmployeeId.id,
				displayName: log.userByEmployeeId.displayName,
				email: log.userByEmployeeId.email,
				departmentId: log.userByEmployeeId.departmentId,
				department: log.userByEmployeeId.departmentByDepartmentId ? {
					id: log.userByEmployeeId.departmentByDepartmentId.id,
					name: log.userByEmployeeId.departmentByDepartmentId.name
				} : undefined
			} : undefined,
			action: log.action,
			resourceType: log.resourceType,
			resourceId: log.resourceId,
			details: log.details,
			beforeSnapshot: log.beforeSnapshot,
			afterSnapshot: log.afterSnapshot,
			isRollback: log.isRollback,
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
			limit: pageSize,
			page,
			pageSize,
			filters: {
				employeeId,
				action: actionFilter,
				resourceType: resourceTypeFilter,
				daysBack,
				searchQuery
			},
			statistics: stats,
			employees: Array.from(uniqueEmployees.values()).slice(0, 100),
			resourceTypes: uniqueResourceTypes,
			user: locals.user,
			userRole: userRole,
			userContext: {
				userId: locals.user.id,
				role: userRole,
				departmentId: locals.user.department_id || null
			}
		};
	} catch (err) {
		console.error('[AuditLogsPage] Error loading audit logs:', err);

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
			message: 'Failed to load audit logs'
		});
	}
};
