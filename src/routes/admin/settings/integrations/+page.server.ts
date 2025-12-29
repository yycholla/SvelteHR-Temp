import type { PageServerLoad } from './$types';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

// Sync permission constants matching backend SyncPermission enum
const SYNC_PERMISSIONS = {
	TRIGGER_EMPLOYEE: 'sync:trigger_employee',
	TRIGGER_DEPARTMENT: 'sync:trigger_department',
	PUSH: 'sync:push',
	TRIGGER_BIDIRECTIONAL: 'sync:trigger_bidirectional',
	FORCE_FULL: 'sync:force_full',
	CANCEL: 'sync:cancel',
	VIEW_CONFLICTS: 'sync:view_conflicts',
	RESOLVE_CONFLICTS: 'sync:resolve_conflicts',
	BULK_RESOLVE_CONFLICTS: 'sync:bulk_resolve_conflicts',
	VIEW_HISTORY: 'sync:view_history',
	VIEW_METRICS: 'sync:view_metrics',
	VIEW_AUDIT_TRAIL: 'sync:view_audit_trail',
	EXPORT_DATA: 'sync:export_data',
	MANAGE_INTEGRATIONS: 'integrations:manage',
	MANAGE_PERMISSIONS: 'sync:manage_permissions',
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
		userRoles.includes('Admin') ||
		userPermissions.includes('*') ||
		userPermissions.includes('*:*')
	) {
		return true;
	}

	// Check for specific permission
	if (userPermissions.includes(permission)) {
		return true;
	}

	// Legacy manage:integrations check for backward compatibility
	if (userPermissions.includes('manage:integrations')) {
		// Legacy permission grants access to most sync operations
		const legacyGrantedPermissions = [
			SYNC_PERMISSIONS.TRIGGER_EMPLOYEE,
			SYNC_PERMISSIONS.TRIGGER_DEPARTMENT,
			SYNC_PERMISSIONS.TRIGGER_BIDIRECTIONAL,
			SYNC_PERMISSIONS.VIEW_HISTORY,
			SYNC_PERMISSIONS.VIEW_CONFLICTS,
			SYNC_PERMISSIONS.RESOLVE_CONFLICTS,
			SYNC_PERMISSIONS.MANAGE_INTEGRATIONS,
		];
		if (legacyGrantedPermissions.includes(permission as (typeof legacyGrantedPermissions)[number])) {
			return true;
		}
	}

	// HR Manager role gets specific permissions
	if (userRoles.includes('HR Manager')) {
		const hrManagerPermissions = [
			SYNC_PERMISSIONS.TRIGGER_EMPLOYEE,
			SYNC_PERMISSIONS.TRIGGER_DEPARTMENT,
			SYNC_PERMISSIONS.TRIGGER_BIDIRECTIONAL,
			SYNC_PERMISSIONS.PUSH,
			SYNC_PERMISSIONS.VIEW_HISTORY,
			SYNC_PERMISSIONS.VIEW_CONFLICTS,
			SYNC_PERMISSIONS.VIEW_METRICS,
			SYNC_PERMISSIONS.VIEW_AUDIT_TRAIL,
			SYNC_PERMISSIONS.RESOLVE_CONFLICTS,
			SYNC_PERMISSIONS.EXPORT_DATA,
		];
		if (hrManagerPermissions.includes(permission as (typeof hrManagerPermissions)[number])) {
			return true;
		}
	}

	// Manager role gets limited permissions
	if (userRoles.includes('Manager')) {
		const managerPermissions = [
			SYNC_PERMISSIONS.VIEW_HISTORY,
			SYNC_PERMISSIONS.VIEW_CONFLICTS,
			SYNC_PERMISSIONS.RESOLVE_CONFLICTS,
		];
		if (managerPermissions.includes(permission as (typeof managerPermissions)[number])) {
			return true;
		}
	}

	return false;
}

export const load: PageServerLoad = async ({ fetch, cookies, depends, parent }) => {
	// Register dependency for invalidation
	depends('app:integrations');

	// Get parent data (includes user info and permissions)
	const parentData = await parent();
	const userPermissions = parentData.permissions || [];
	const userRoles = parentData.roles || [];

	const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));

	// Query to check Intuit connection status
	const query = `
		query GetIntuitConnection {
			intuit {
				connection {
					isConnected
					companyName
					lastSyncAt
					realmId
				}
			}
		}
	`;

	// Compute sync permissions for UI
	const syncPermissions = {
		canTriggerEmployeeSync: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.TRIGGER_EMPLOYEE),
		canTriggerDepartmentSync: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.TRIGGER_DEPARTMENT),
		canPushToQuickBooks: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.PUSH),
		canTriggerBidirectionalSync: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.TRIGGER_BIDIRECTIONAL),
		canForceFullSync: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.FORCE_FULL),
		canCancelSync: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.CANCEL),
		canViewConflicts: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.VIEW_CONFLICTS),
		canResolveConflicts: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.RESOLVE_CONFLICTS),
		canBulkResolveConflicts: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.BULK_RESOLVE_CONFLICTS),
		canViewHistory: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.VIEW_HISTORY),
		canViewMetrics: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.VIEW_METRICS),
		canViewAuditTrail: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.VIEW_AUDIT_TRAIL),
		canExportData: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.EXPORT_DATA),
		canManageIntegrations: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.MANAGE_INTEGRATIONS),
		canManagePermissions: hasSyncPermission(userPermissions, userRoles, SYNC_PERMISSIONS.MANAGE_PERMISSIONS),
	};

	try {
		const result = await client.query(query, {}).toPromise();

		if (result.error) {
			console.error('Failed to fetch Intuit connection:', result.error);
			return {
				intuitConnected: false,
				intuitCompanyName: null,
				intuitLastSync: null,
				error: 'Failed to load integration status',
				syncPermissions,
			};
		}

		const connection = result.data?.intuit?.connection;

		return {
			intuitConnected: connection?.isConnected || false,
			intuitCompanyName: connection?.companyName,
			intuitLastSync: connection?.lastSyncAt,
			intuitRealmId: connection?.realmId,
			syncPermissions,
		};
	} catch (error) {
		console.error('Error loading integrations page:', error);
		return {
			intuitConnected: false,
			intuitCompanyName: null,
			intuitLastSync: null,
			error: 'Failed to load integration status',
			syncPermissions,
		};
	}
};
