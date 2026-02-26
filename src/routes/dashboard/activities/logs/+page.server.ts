import { logger } from '$lib/utils/logger';
// Audit Logs Page - Server Load
// Feature: Modern audit logging with Rust GraphQL backend
// Displays comprehensive activity tracking with filtering and pagination

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserPermissions, requireAuth } from '$lib/server/rbac-utils';

interface LogUser {
	id: string;
	displayName: string;
	email: string;
	fullName: string;
}

interface ActivityLog {
	id: string;
	action: string;
	resourceType: string;
	resourceId?: string | null;
	ipAddress?: string | null;
	isRollback?: boolean;
	createdAt: string;
	user?: LogUser | null;
	[key: string]: unknown;
}

interface ActivityLogsResponse {
	data?: {
		activityLogs?: ActivityLog[];
	};
	errors?: Array<{ message?: string }>;
}

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['audit:read']
	});

	try {
		// Step 3: Parse URL query parameters for filtering and pagination
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const pageSize = parseInt(url.searchParams.get('limit') || '50', 10);
		const userId = url.searchParams.get('userId') || null;
		const action = url.searchParams.get('action') || '';
		const resourceType = url.searchParams.get('resourceType') || '';
		const searchTerm = url.searchParams.get('search') || '';

		// Step 4: Initialize GraphQL client with session auth
		const { authenticatedGraphQLRequest, getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		logger.info('[Audit Logs] Loading audit logs:', {
			page,
			pageSize,
			userId,
			action,
			resourceType
		});

		// Step 5: Fetch activity logs from Rust GraphQL backend
		const logsResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetActivityLogs($userId: UUID, $limit: Int!, $offset: Int!) {
					activityLogs(userId: $userId, limit: $limit, offset: $offset) {
						id
						userId
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
						user {
							id
							displayName
							email
							fullName
						}
					}
				}
			`,
			{
				userId: userId || undefined,
				limit: pageSize,
				offset: (page - 1) * pageSize
			},
			event.request
		);

		const logsData = (await logsResponse.json()) as ActivityLogsResponse;

		if (logsData.errors?.length) {
			logger.error('[Audit Logs] GraphQL errors:', undefined, { errors: logsData.errors });
			throw new Error(logsData.errors[0]?.message || 'Failed to load audit logs');
		}

		const logs: ActivityLog[] = logsData?.data?.activityLogs || [];

		// Step 6: Client-side filtering (for search and additional filters)
		let filteredLogs: ActivityLog[] = logs;

		if (action) {
			filteredLogs = filteredLogs.filter(
				(log) => log.action.toLowerCase() === action.toLowerCase()
			);
		}

		if (resourceType) {
			filteredLogs = filteredLogs.filter(
				(log) => log.resourceType.toLowerCase() === resourceType.toLowerCase()
			);
		}

		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filteredLogs = filteredLogs.filter((log) => {
				const actionMatch = log.action?.toLowerCase().includes(searchLower);
				const resourceTypeMatch = log.resourceType?.toLowerCase().includes(searchLower);
				const userMatch =
					log.user?.displayName?.toLowerCase().includes(searchLower) ||
					log.user?.email?.toLowerCase().includes(searchLower);
				const ipMatch = log.ipAddress?.includes(searchLower);
				return actionMatch || resourceTypeMatch || userMatch || ipMatch;
			});
		}

		// Step 6.5: Group logs by resource ID and resource type
		// Keep only the most recent log per resource, but track total count
		const groupedLogsMap = new Map<
			string,
			{
				log: ActivityLog;
				totalEdits: number;
				allLogIds: string[];
			}
		>();

		for (const log of filteredLogs) {
			// Create a composite key from resource type and resource ID
			// Logs without resource IDs (like login_failed) won't be grouped
			const resourceKey = log.resourceId
				? `${log.resourceType}:${log.resourceId}`
				: `ungrouped:${log.id}`;

			const existing = groupedLogsMap.get(resourceKey);

			if (!existing) {
				// First log for this resource
				groupedLogsMap.set(resourceKey, {
					log,
					totalEdits: 1,
					allLogIds: [log.id]
				});
			} else {
				// Compare timestamps to keep the most recent
				const existingTime = new Date(existing.log.createdAt).getTime();
				const currentTime = new Date(log.createdAt).getTime();

				if (currentTime > existingTime) {
					// Current log is more recent, replace it but keep the count
					groupedLogsMap.set(resourceKey, {
						log,
						totalEdits: existing.totalEdits + 1,
						allLogIds: [...existing.allLogIds, log.id]
					});
				} else {
					// Existing log is more recent, just increment count
					existing.totalEdits += 1;
					existing.allLogIds.push(log.id);
				}
			}
		}

		// Extract grouped logs array from map
		const groupedLogs = Array.from(groupedLogsMap.values()).map((group) => ({
			...group.log,
			totalEdits: group.totalEdits,
			allLogIds: group.allLogIds
		}));

		// Sort grouped logs by most recent first
		groupedLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		// Step 7: Calculate statistics from filtered logs (matching Rust backend action types)
		const stats = {
			total: filteredLogs.length,
			creates: filteredLogs.filter((l) => l.action === 'CREATE').length,
			updates: filteredLogs.filter((l) => l.action === 'UPDATE').length,
			deletes: filteredLogs.filter((l) => l.action === 'DELETE').length,
			uploads: filteredLogs.filter((l) => l.action === 'UPLOAD').length,
			assigns: filteredLogs.filter((l) => l.action === 'ASSIGN').length,
			unassigns: filteredLogs.filter((l) => l.action === 'UNASSIGN').length,
			approves: filteredLogs.filter((l) => l.action === 'APPROVE').length,
			rejects: filteredLogs.filter((l) => l.action === 'REJECT').length,
			executes: filteredLogs.filter((l) => l.action === 'EXECUTE').length,
			rollbacks: filteredLogs.filter((l) => Boolean(l.isRollback)).length
		};

		// Step 8: Get unique values for filter dropdowns
		const uniqueActions = [...new Set(logs.map((log) => log.action))].filter(Boolean).sort();
		const uniqueResourceTypes = [...new Set(logs.map((log) => log.resourceType))]
			.filter(Boolean)
			.sort();

		const uniqueUsers: LogUser[] = [
			...new Map(
				logs
					.filter((log): log is ActivityLog & { user: LogUser } => Boolean(log.user))
					.map((log) => [log.user.id, log.user])
			).values()
		];

		// Step 9: Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Step 10: Return data for audit logs page
		return {
			...userPermissions,
			logs: groupedLogs,
			totalLogs: filteredLogs.length,
			totalGroupedLogs: groupedLogs.length,
			stats,
			uniqueActions,
			uniqueResourceTypes,
			uniqueUsers,
			filters: {
				page,
				pageSize,
				userId,
				action,
				resourceType,
				searchTerm
			},
			pagination: {
				page,
				pageSize,
				totalPages: Math.ceil(groupedLogs.length / pageSize),
				hasNextPage: page * pageSize < groupedLogs.length,
				hasPreviousPage: page > 1
			},
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		logger.error('[Audit Logs Load Error]', err as Error);

		// Re-throw redirects and errors
		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		error(500, {
			message: 'Failed to load audit logs. Please try again later.'
		});
	}
};
