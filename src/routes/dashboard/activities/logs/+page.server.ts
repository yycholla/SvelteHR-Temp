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
import type { ActivityAction, ResourceType } from '$lib/graphql/types';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// RBAC: Only system_admin, admin, and hr_manager can access audit logs
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const userRole = locals.user.role || 'employee';
	const allowedRoles = ['system_admin', 'admin', 'hr_manager'];

	if (!allowedRoles.includes(userRole)) {
		throw error(403, {
			message: 'Access denied. Only administrators can view audit logs.'
		});
	}

	try {
		// Parse URL query parameters for filtering and pagination
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const pageSize = parseInt(url.searchParams.get('limit') || '50', 10);
		const employeeId = url.searchParams.get('employee') || null;
		const actionFilter = url.searchParams.get('action') as ActivityAction | null;
		const resourceTypeFilter = url.searchParams.get('resourceType') as ResourceType | null;
		const daysBack = parseInt(url.searchParams.get('days') || '7');
		const searchQuery = url.searchParams.get('search') || '';

		// Initialize GraphQL client with session auth
		const { GraphQLClient } = await import('$lib/server/graphql-client');
		const client = GraphQLClient.fromCookies(cookies);

		// Date range filtering
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - daysBack);

		// Fetch activity logs from Rust GraphQL server
		const logsQuery = `
			query GetActivityLogs($userId: UUID, $limit: Int!, $offset: Int!) {
				activityLogs(userId: $userId, limit: $limit, offset: $offset) {
					id
					employeeId
					action
					resourceType
					resourceId
					details
					beforeSnapshot
					afterSnapshot
					isRollback
					rolledBackLogId
					ipAddress
					userAgent
					createdAt
				}
			}
		`;

		const logsVariables: any = {
			limit: pageSize,
			offset: (page - 1) * pageSize
		};

		if (employeeId) {
			logsVariables.userId = employeeId;
		}

		const logsResult = await client.query(logsQuery, logsVariables);
		const logs = logsResult.data?.activityLogs || [];

		// Get all logs for statistics (limited to 1000)
		const allLogsResult = await client.query(logsQuery, { limit: 1000, offset: 0 });
		const allLogs = allLogsResult.data?.activityLogs || [];

		// Filter logs by date range
		const filteredLogs = allLogs.filter((log: any) => {
			const logDate = new Date(log.createdAt);
			return logDate >= startDate;
		});

		// Apply additional filters
		let displayLogs = filteredLogs;

		if (actionFilter) {
			displayLogs = displayLogs.filter((l: any) => l.action === actionFilter);
		}

		if (resourceTypeFilter) {
			displayLogs = displayLogs.filter((l: any) => l.resourceType === resourceTypeFilter);
		}

		// Calculate statistics
		const stats = {
			total: logs.length,
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
					name: `User ${String(log.employeeId).substring(0, 8)}` // User info not joined yet
				});
			}
		});

		// Get unique resource types for filter dropdown
		const uniqueResourceTypes = [...new Set(filteredLogs.map((log: any) => log.resourceType))].filter(Boolean);

		// Transform logs to match ActivityLog interface
		const transformedLogs = logs.map((log: any) => ({
			id: log.id,
			employeeId: log.employeeId,
			userId: log.employeeId,
			employee: log.employeeId ? {
				id: log.employeeId,
				displayName: `User ${String(log.employeeId).substring(0, 8)}`,
				email: 'unknown@company.com'
			} : null,
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

		// Calculate pagination info
		const totalCount = logs.length;
		const hasNextPage = (page * pageSize) < totalCount;

		return {
			logs: transformedLogs,
			totalCount,
			hasNextPage,
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
				departmentId: (locals.user as any).department_id || null
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
