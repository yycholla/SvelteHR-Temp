// Audit Logs Page Server-Side Data Loading (Admin Only)
// Feature: 019-we-need-to - Task T031
// Purpose: Load system-wide activity logs for administrators
// NOTE: Rust GraphQL backend migration - uses session-based auth and client-side filtering

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// Check if user has admin privileges
	const userPermissions = locals.permissions || [];
	const hasAdminAccess =
		userPermissions.includes('*') ||
		userPermissions.includes('*:*') ||
		userPermissions.includes('admin:read') ||
		userPermissions.includes('audit:read');

	if (!hasAdminAccess) {
		// Only admins can access audit logs
		error(403, {
			message: 'Access denied. Administrator privileges required to view audit logs.'
		});
	}

	try {
		// Ensure backend is ready before proceeding
		await ensureBackendReady();

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Get query parameters for filtering
		const employeeIdFilter = url.searchParams.get('employee');
		const actionFilter = url.searchParams.get('action');
		const resourceTypeFilter = url.searchParams.get('resourceType');
		const daysBack = parseInt(url.searchParams.get('days') || '7');
		const searchQuery = url.searchParams.get('search') || '';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '100');

		// Date range for filtering
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - daysBack);

		// NOTE: Rust GraphQL backend only supports user_id filtering directly
		// All other filtering (action, resourceType, date, search) must be done client-side
		const activityLogsQuery = `
			query GetActivityLogs($userId: UUID, $limit: Int!, $offset: Int!) {
				activityLogs(userId: $userId, limit: $limit, offset: $offset) {
					id
					employeeId
					userId
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
					employee {
						id
						displayName
						email
						departmentId
						department {
							id
							name
						}
					}
				}
			}
		`;

		// Fetch all logs (Rust backend doesn't support complex filtering)
		// We fetch more than needed and filter client-side
		const logsResult = await graphqlClient.query(activityLogsQuery, {
			userId: employeeIdFilter || null,
			limit: 1000, // Fetch large set for client-side filtering
			offset: 0
		});

		let allLogs = logsResult.data?.activityLogs || [];

		// Client-side filtering by action
		if (actionFilter) {
			allLogs = allLogs.filter((log: any) => log.action === actionFilter);
		}

		// Client-side filtering by resourceType
		if (resourceTypeFilter) {
			allLogs = allLogs.filter((log: any) => log.resourceType === resourceTypeFilter);
		}

		// Client-side filtering by date range
		const filteredLogs = allLogs.filter((log: any) => {
			const logDate = new Date(log.createdAt);
			return logDate >= startDate;
		});

		// Client-side search filtering (search in resource type, action, or details)
		let searchFilteredLogs = filteredLogs;
		if (searchQuery) {
			const searchLower = searchQuery.toLowerCase();
			searchFilteredLogs = filteredLogs.filter((log: any) => {
				const resourceType = log.resourceType?.toLowerCase() || '';
				const action = log.action?.toLowerCase() || '';
				const resourceId = log.resourceId?.toLowerCase() || '';
				const detailsStr = JSON.stringify(log.details || {}).toLowerCase();
				return (
					resourceType.includes(searchLower) ||
					action.includes(searchLower) ||
					resourceId.includes(searchLower) ||
					detailsStr.includes(searchLower)
				);
			});
		}

		// Client-side pagination
		const totalCount = searchFilteredLogs.length;
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedLogs = searchFilteredLogs.slice(startIndex, endIndex);

		// Calculate statistics from all filtered logs (not just current page)
		const stats = {
			total: totalCount,
			creates: searchFilteredLogs.filter((l: any) => l.action === 'create').length,
			updates: searchFilteredLogs.filter((l: any) => l.action === 'update').length,
			deletes: searchFilteredLogs.filter((l: any) => l.action === 'delete').length,
			views: searchFilteredLogs.filter((l: any) => l.action === 'view').length,
			logins: searchFilteredLogs.filter((l: any) => l.action === 'login').length
		};

		// Get unique employees for filter dropdown (limit to 100 most active)
		const uniqueEmployees = new Map();
		searchFilteredLogs.forEach((log: any) => {
			if (log.employeeId && !uniqueEmployees.has(log.employeeId)) {
				uniqueEmployees.set(log.employeeId, {
					id: log.employeeId,
					name: log.employee?.displayName || 'Unknown'
				});
			}
		});

		return {
			logs: paginatedLogs,
			totalCount,
			hasNextPage: endIndex < totalCount,
			currentPage: page,
			limit,
			filters: {
				employeeId: employeeIdFilter,
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
			redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		error(500, {
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
