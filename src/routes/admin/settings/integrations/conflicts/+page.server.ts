import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import type { PageServerLoad } from './$types';

// Sync permission constants
const SYNC_PERMISSIONS = {
	VIEW_CONFLICTS: 'sync:view_conflicts',
	RESOLVE_CONFLICTS: 'sync:resolve_conflicts',
	BULK_RESOLVE_CONFLICTS: 'sync:bulk_resolve_conflicts'
} as const;

/**
 * Check if user has a specific sync permission
 */
function hasSyncPermission(
	userPermissions: string[],
	userRoles: string[],
	permission: string
): boolean {
	// Admin role or wildcard always has access
	if (
		userRoles.some((r: string) => r.toLowerCase().replace(/[\s-]+/g,'_') === 'admin') ||
		userPermissions.includes('*') ||
		userPermissions.includes('*:*')
	) {
		return true;
	}

	// Check for specific permission
	if (userPermissions.includes(permission)) {
		return true;
	}

	// Legacy manage:integrations check
	if (userPermissions.includes('manage:integrations')) {
		return true;
	}

	// HR Manager role gets conflict permissions
	if (userRoles.some((r: string) => r.toLowerCase().replace(/[\s-]+/g,'_') === 'hr_manager')) {
		return true;
	}

	// Manager role gets limited conflict permissions
	if (userRoles.some((r: string) => ['manager','hr_manager'].includes(r.toLowerCase().replace(/[\s-]+/g,'_')))) {
		const managerPermissions = [
			SYNC_PERMISSIONS.VIEW_CONFLICTS,
			SYNC_PERMISSIONS.RESOLVE_CONFLICTS
		];
		if (managerPermissions.includes(permission as (typeof managerPermissions)[number])) {
			return true;
		}
	}

	return false;
}

const GET_CONFLICTS = `
	query GetConflicts {
		intuit {
			conflicts {
				entityType
				entityId
				quickbooksId
				description
				employeeName
				employeeEmail
				localModifiedAt
				remoteModifiedAt
				lastSyncedAt
			}
		}
	}
`;

export const load: PageServerLoad = async ({ fetch, cookies, depends, parent }) => {
	// Register dependency for invalidation
	depends('app:conflicts');

	// Get parent data (includes user info and permissions)
	const parentData = await parent();
	const userPermissions = parentData.permissions || [];
	const userRoles = parentData.roles || [];

	// Compute conflict-related permissions
	const conflictPermissions = {
		canViewConflicts: hasSyncPermission(
			userPermissions,
			userRoles,
			SYNC_PERMISSIONS.VIEW_CONFLICTS
		),
		canResolveConflicts: hasSyncPermission(
			userPermissions,
			userRoles,
			SYNC_PERMISSIONS.RESOLVE_CONFLICTS
		),
		canBulkResolveConflicts: hasSyncPermission(
			userPermissions,
			userRoles,
			SYNC_PERMISSIONS.BULK_RESOLVE_CONFLICTS
		)
	};

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	const result = await client.query(GET_CONFLICTS, {}).toPromise();

	if (result.error) {
		console.error('GraphQL error:', result.error);
		return {
			conflicts: [],
			conflictPermissions
		};
	}

	return {
		conflicts: result.data?.intuit?.conflicts ?? [],
		conflictPermissions
	};
};
