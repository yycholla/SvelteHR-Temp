// RBAC Core - Unified tier-based access control
// AccessTier: SELF=1 (employee), TEAM=2 (manager), ALL=3 (admin/hr_manager)

import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';

/**
 * Hierarchical access tiers for view-level gating.
 * Higher tier = broader access.
 */
export enum AccessTier {
	/** Employee: can only see own data */
	SELF = 1,
	/** Manager: can see team data */
	TEAM = 2,
	/** Admin / HR Manager: can see everything */
	ALL = 3
}

/**
 * Map a role string to its AccessTier.
 * Normalises to lowercase and strips separators so
 * 'HR_Manager', 'hr-manager', 'HR Manager' all resolve the same way.
 */
export function roleToTier(role: string): AccessTier {
	const normalised = role.toLowerCase().replace(/[\s_-]+/g, '');

	switch (normalised) {
		case 'admin':
		case 'superadmin':
		case 'systemadmin':
		case 'superadministrator':
			return AccessTier.ALL;

		case 'hrmanager':
		case 'hr':
			return AccessTier.ALL;

		case 'manager':
		case 'teamlead':
		case 'supervisor':
			return AccessTier.TEAM;

		default:
			return AccessTier.SELF;
	}
}

/**
 * Derive the effective AccessTier for the current user.
 * Takes the *highest* tier across all of the user's roles.
 */
export function getAccessTier(event: RequestEvent): AccessTier {
	const { locals } = event;
	const user = locals.user;
	if (!user) return AccessTier.SELF;

	const roles: string[] = [
		...(user.roles || []),
		...(locals.roles || []),
		...(user.role ? [user.role] : [])
	];

	let maxTier = AccessTier.SELF;
	for (const role of roles) {
		const tier = roleToTier(role);
		if (tier > maxTier) maxTier = tier;
	}

	return maxTier;
}

/**
 * Guard that throws 403 when the user's tier is below `minTier`.
 * Drop-in replacement for per-page permission arrays.
 *
 * @example
 *   requireAccess(event, AccessTier.TEAM);   // managers + admins
 *   requireAccess(event, AccessTier.ALL);     // admins only
 */
export function requireAccess(event: RequestEvent, minTier: AccessTier): void {
	const userTier = getAccessTier(event);

	if (userTier < minTier) {
		logger.warn('[RBAC] Access denied', {
			userId: event.locals.user?.id,
			userTier,
			minTier,
			path: event.url.pathname
		});
		throw error(403, { message: 'You do not have permission to view this page.' });
	}
}

// ── Flat-permission helpers (kept for action-level checks) ──────────

/**
 * Check whether the user holds a specific flat permission string.
 * Supports wildcards: '*', '*:*', 'resource:*'.
 */
export function hasPermission(event: RequestEvent, permission: string): boolean {
	const permissions: string[] = event.locals.permissions || [];

	if (permissions.includes('*') || permissions.includes('*:*')) return true;

	const [resource] = permission.split(':');
	if (permissions.includes(`${resource}:*`)) return true;

	return permissions.includes(permission);
}

/**
 * Guard that throws 403 when the user lacks the required flat permission.
 */
export function requirePermission(event: RequestEvent, permission: string): void {
	if (!hasPermission(event, permission)) {
		throw error(403, { message: 'You do not have permission to perform this action.' });
	}
}

/**
 * Convenience: require *any one* of the listed permissions.
 */
export function requireAnyPermission(event: RequestEvent, permissions: string[]): void {
	if (!permissions.some((p) => hasPermission(event, p))) {
		throw error(403, { message: 'You do not have permission to perform this action.' });
	}
}

/**
 * Resolve a flexible access requirement to a concrete tier check.
 * Accepts either an AccessTier (new system) or a string[] of flat
 * permissions (legacy compatibility).
 */
export function resolveAccessRequirement(
	event: RequestEvent,
	requirement: AccessTier | string[]
): void {
	if (typeof requirement === 'number') {
		requireAccess(event, requirement);
	} else {
		requireAnyPermission(event, requirement);
	}
}

/**
 * Combined auth check: verifies user is logged in, then checks
 * access requirements.
 *
 * @param options.minTier   - minimum AccessTier required (new system)
 * @param options.permissions - flat permission strings (legacy)
 *
 * If `minTier` is provided it takes precedence.
 * If neither is provided, only login is checked.
 */
export function requireAuth(
	event: RequestEvent,
	options: { minTier?: AccessTier; permissions?: string[] } = {}
): void {
	const { locals, url } = event;

	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	if (options.minTier !== undefined) {
		requireAccess(event, options.minTier);
	} else if (options.permissions?.length) {
		requireAnyPermission(event, options.permissions);
	}
}
