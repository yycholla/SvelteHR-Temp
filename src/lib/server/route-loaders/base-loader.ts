/**
 * Base class for server-side route loaders with RBAC and session handling
 */

import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { requireAuth, getUserPermissions, AccessTier } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export abstract class BaseRouteLoader {
	protected event: RequestEvent;
	protected locals: App.Locals & { user: NonNullable<App.Locals['user']> };
	protected permissions: ReturnType<typeof getUserPermissions>;

	constructor(event: RequestEvent, requiredPermissions: string[] | AccessTier = []) {
		this.event = event;

		if (typeof requiredPermissions === 'number') {
			requireAuth(event, { minTier: requiredPermissions });
		} else {
			requireAuth(event, { requiredPermissions });
		}

		this.locals = event.locals as App.Locals & { user: NonNullable<App.Locals['user']> };
		this.permissions = getUserPermissions(this.locals);
	}

	async execute(): Promise<Record<string, any>> {
		try {
			const data = await this.load();

			return {
				...this.permissions,
				...data,
				loadedAt: new Date().toISOString()
			};
		} catch (err) {
			logger.error('[Route Load Error]', err as Error, {
				route: this.event.url.pathname,
				userId: this.locals.user.id,
				userRole: this.locals.user.role
			});

			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			const message = err instanceof Error ? err.message : 'Failed to load page data';
			throw error(
				500,
				`Unable to load data: ${message}. Please refresh the page or try again later.`
			);
		}
	}

	protected abstract load(): Promise<Record<string, any>>;

	public hasPermission(permission: string): boolean {
		const userPermissions = this.permissions.permissions;
		return (
			userPermissions.includes('*') ||
			userPermissions.includes('*:*') ||
			userPermissions.includes(permission)
		);
	}

	public hasRole(role: string): boolean {
		return this.permissions.roles.includes(role);
	}

	public getUserId(): string {
		return this.locals.user.id;
	}

	public getUserRole(): string {
		return this.locals.user.role || 'employee';
	}
}
