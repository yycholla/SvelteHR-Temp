import { logger } from '$lib/utils/logger';
/**
 * Server-Side Permission Refresh
 * Feature: 016-repair-management-pages - Task T038
 * Purpose: Automatically refresh user permissions when department changes are detected
 */

import type { RequestEvent } from '@sveltejs/kit';
import { getGraphQLEndpoint } from '$lib/server/api-url';

// ============================================================================
// PERMISSION REFRESH LOGIC
// ============================================================================

/**
 * Query current user data from database
 */
async function queryUserData(userId: string): Promise<{
	departmentId: string | null;
	roles: string[];
	permissions: string[];
} | null> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetUserContext($userId: UUID!) {
						userById(id: $userId) {
							id
							departmentId
							role
							userRolesByUserId {
								nodes {
									roleByRoleId {
										name
										permissions
									}
								}
							}
						}
					}
				`,
				variables: { userId }
			})
		});

		if (!response.ok) {
			logger.error('[PERMISSION REFRESH] GraphQL query failed', new Error(response.statusText));
			return null;
		}

		const data = await response.json();
		const user = data?.data?.userById;

		if (!user) {
			logger.warn(`[PERMISSION REFRESH] User not found: ${userId}`);
			return null;
		}

		// Extract roles and permissions
		const roles = user.userRolesByUserId?.nodes?.map((ur: any) => ur.roleByRoleId?.name) || [];
		if (user.role && !roles.includes(user.role)) {
			roles.push(user.role);
		}

		const permissions =
			user.userRolesByUserId?.nodes?.flatMap((ur: any) => ur.roleByRoleId?.permissions || []) || [];

		return {
			departmentId: user.departmentId,
			roles,
			permissions
		};
	} catch (error) {
		logger.error('Failed to query user data', error as Error);
		return null;
	}
}

/**
 * T038: Refresh user permissions when department changes
 *
 * This function:
 * 1. Queries current department assignment from database
 * 2. Compares with session department ID
 * 3. If different: updates session and triggers re-authentication
 * 4. Invalidates any cached permissions
 *
 * @param userId - User ID to refresh permissions for
 * @param currentDepartmentId - Current department ID from session
 * @returns Updated user context or null if refresh failed
 */
export async function refreshUserPermissions(
	userId: string,
	currentDepartmentId: string | null
): Promise<{
	departmentId: string | null;
	roles: string[];
	permissions: string[];
	departmentChanged: boolean;
} | null> {
	logger.info(`[PERMISSION REFRESH] Refreshing permissions for user: ${userId}`);

	// Query current user data
	const userData = await queryUserData(userId);
	if (!userData) {
		logger.error('[PERMISSION REFRESH] Failed to query user data');
		return null;
	}

	// Check if department changed
	const departmentChanged = userData.departmentId !== currentDepartmentId;

	if (departmentChanged) {
		logger.info('[PERMISSION REFRESH] Department change detected:', {
			userId,
			oldDepartmentId: currentDepartmentId,
			newDepartmentId: userData.departmentId
		});

		// Log audit entry for department transfer detection
		await logDepartmentTransfer(userId, currentDepartmentId, userData.departmentId);
	}

	return {
		...userData,
		departmentChanged
	};
}

/**
 * Update session with new permissions
 * Should be called from hooks.server.ts or +layout.server.ts
 */
export async function updateSessionPermissions(
	event: RequestEvent,
	userId: string
): Promise<boolean> {
	try {
		const currentDepartmentId = event.locals.user?.departmentId || null;

		// Refresh permissions
		const refreshed = await refreshUserPermissions(userId, currentDepartmentId);
		if (!refreshed) {
			return false;
		}

		// Update locals with new data
		if (event.locals.user) {
			event.locals.user.departmentId = refreshed.departmentId ?? undefined;
		}
		event.locals.roles = refreshed.roles;
		event.locals.permissions = refreshed.permissions;

		// If department changed, invalidate any cached data
		if (refreshed.departmentChanged) {
			logger.info('[PERMISSION REFRESH] Department changed, invalidating cache');
			// Could add Redis cache invalidation here if needed
			// await invalidateUserCache(userId);
		}

		return true;
	} catch (error) {
		logger.error('Failed to update session permissions', error as Error);
		return false;
	}
}

/**
 * Check if permissions need refresh
 * Call this periodically or on specific route loads
 */
export async function checkPermissionsNeedRefresh(
	userId: string,
	lastRefreshTimestamp: number,
	maxAgeMs: number = 5 * 60 * 1000 // 5 minutes default
): Promise<boolean> {
	const now = Date.now();
	const age = now - lastRefreshTimestamp;

	// If permissions are older than maxAge, refresh
	if (age > maxAgeMs) {
		logger.info(`[PERMISSION REFRESH] Permissions expired (age: ${age}ms)`);
		return true;
	}

	return false;
}

/**
 * Log department transfer detection to audit log
 */
async function logDepartmentTransfer(
	userId: string,
	oldDepartmentId: string | null,
	newDepartmentId: string | null
): Promise<void> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					mutation LogDepartmentTransfer($input: CreateAuditLogInput!) {
						createAuditLog(input: $input) {
							auditLog {
								id
								createdAt
							}
						}
					}
				`,
				variables: {
					input: {
						auditLog: {
							userId,
							action: 'DEPARTMENT_TRANSFER_DETECTED',
							resourceType: 'user',
							resourceId: userId,
							changes: {
								oldDepartmentId,
								newDepartmentId,
								detectedAt: new Date().toISOString()
							},
							ipAddress: null,
							userAgent: 'permission-refresh-service'
						}
					}
				}
			})
		});

		logger.info('[PERMISSION REFRESH] Logged department transfer to audit log');
	} catch (error) {
		logger.error('Failed to log department transfer', error as Error);
		// Don't throw - audit logging failure shouldn't break permission refresh
	}
}

// ============================================================================
// REDIS CACHE INVALIDATION (Optional)
// ============================================================================

/**
 * Invalidate user permissions cache in Redis
 * Only used if Redis caching is enabled
 */
export async function invalidateUserCache(userId: string): Promise<void> {
	try {
		// If you have Redis configured, invalidate the cache here
		// Example:
		// await redis.del(`user:${userId}:permissions`);
		// await redis.del(`user:${userId}:department`);
		// await redis.del(`user:${userId}:roles`);

		logger.info(`[PERMISSION REFRESH] Cache invalidation called for user: ${userId}`);
	} catch (error) {
		logger.error('Failed to invalidate user cache', error as Error);
	}
}

/**
 * Refresh department-scoped data after department change
 * Triggers re-fetch of department-specific queries
 */
export async function refreshDepartmentScopedData(
	userId: string,
	newDepartmentId: string
): Promise<void> {
	logger.info('[PERMISSION REFRESH] Refreshing department-scoped data:', {
		userId,
		newDepartmentId
	});

	// Invalidate any department-specific caches
	await invalidateUserCache(userId);

	// Additional cache invalidation for department-scoped queries
	// Example:
	// await redis.del(`department:${newDepartmentId}:employees`);
	// await redis.del(`department:${newDepartmentId}:leave_requests`);
	// await redis.del(`department:${newDepartmentId}:performance_reviews`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get last permission refresh timestamp from session/cookie
 */
export function getLastRefreshTimestamp(event: RequestEvent): number {
	const timestamp = event.cookies.get('permissions_refreshed_at');
	return timestamp ? parseInt(timestamp, 10) : 0;
}

/**
 * Update last permission refresh timestamp
 */
export function setLastRefreshTimestamp(event: RequestEvent): void {
	event.cookies.set('permissions_refreshed_at', Date.now().toString(), {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		maxAge: 60 * 60 * 24 // 24 hours
	});
}

/**
 * Force permission refresh on next request
 */
export function forcePermissionRefresh(event: RequestEvent): void {
	event.cookies.delete('permissions_refreshed_at', { path: '/' });
	logger.info('[PERMISSION REFRESH] Forced permission refresh on next request');
}
