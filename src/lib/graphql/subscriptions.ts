import { logger } from '$lib/utils/logger';
/**
 * GraphQL Subscriptions: Real-time Department Transfer Detection
 * Feature: 016-repair-management-pages - Task T037
 * Purpose: Detect when a user's department changes and trigger permission refresh
 */

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';
import { browser } from '$app/environment';

// ============================================================================
// SUBSCRIPTION DEFINITIONS
// ============================================================================

/**
 * Subscription: Listen for department changes for a specific user
 * Triggers when user.department_id is updated
 */
export const ON_DEPARTMENT_CHANGE = gql`
	subscription OnDepartmentChange($userId: UUID!) {
		userUpdated(userId: $userId) {
			id
			departmentId
			department {
				id
				name
			}
			updatedAt
		}
	}
`;

/**
 * Subscription: Listen for role changes for a specific user
 * Triggers when user_roles table is updated
 */
export const ON_ROLE_CHANGE = gql`
	subscription OnRoleChange($userId: UUID!) {
		userRoleChanged(userId: $userId) {
			userId
			roleId
			role {
				id
				name
				permissions
			}
			assignedAt
		}
	}
`;

// ============================================================================
// SUBSCRIPTION MANAGER
// ============================================================================

/**
 * Custom event types for department/role changes
 */
export type DepartmentChangeEvent = CustomEvent<{
	userId: string;
	oldDepartmentId?: string;
	newDepartmentId: string;
	departmentName: string;
}>;

export type RoleChangeEvent = CustomEvent<{
	userId: string;
	roleId: string;
	roleName: string;
	permissions: string[];
}>;

declare global {
	interface WindowEventMap {
		'department-changed': DepartmentChangeEvent;
		'role-changed': RoleChangeEvent;
	}
}

/**
 * T037: Department Transfer Detection Manager
 * Handles WebSocket subscriptions with polling fallback
 */
export class SubscriptionManager {
	private subscriptions: Map<string, any> = new Map();
	private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
	private lastKnownDepartment: string | null = null;
	private lastKnownRoles: string[] = [];
	private userId: string | null = null;

	/**
	 * Initialize subscription manager with user context
	 */
	constructor(userId: string | null, initialDepartmentId?: string, initialRoles?: string[]) {
		this.userId = userId;
		this.lastKnownDepartment = initialDepartmentId || null;
		this.lastKnownRoles = initialRoles || [];
	}

	/**
	 * Subscribe to department changes for the current user
	 * Uses WebSocket subscription with polling fallback
	 */
	subscribeToDepartmentChanges(client: Client): () => void {
		if (!browser || !this.userId) {
			logger.warn('[SUBSCRIPTIONS] Cannot subscribe: not in browser or no user ID');
			return () => {};
		}

		logger.info(
			'[SUBSCRIPTIONS] Setting up department change subscription for user:',
			this.userId
		);

		// Try WebSocket subscription first
		try {
			const subscription = client
				.subscription(ON_DEPARTMENT_CHANGE, { userId: this.userId })
				.subscribe((result: any) => {
					if (result.data?.userUpdated) {
						this.handleDepartmentChange(result.data.userUpdated);
					}
				});

			this.subscriptions.set('department-change', subscription);
		} catch (error) {
			logger.warn('[SUBSCRIPTIONS] WebSocket subscription failed, using polling fallback:'.replace(/['`]$/, `: ${error}'`/));
		}

		// Set up polling fallback (every 60 seconds)
		this.startPolling(
			'department-change',
			async () => {
				await this.pollDepartmentChange();
			},
			60000
		);

		// Return cleanup function
		return () => {
			this.unsubscribeFromDepartmentChanges();
		};
	}

	/**
	 * Subscribe to role changes for the current user
	 */
	subscribeToRoleChanges(client: Client): () => void {
		if (!browser || !this.userId) {
			return () => {};
		}

		logger.info('[SUBSCRIPTIONS] Setting up role change subscription for user:', this.userId);

		try {
			const subscription = client
				.subscription(ON_ROLE_CHANGE, { userId: this.userId })
				.subscribe((result: any) => {
					if (result.data?.userRoleChanged) {
						this.handleRoleChange(result.data.userRoleChanged);
					}
				});

			this.subscriptions.set('role-change', subscription);
		} catch (error) {
			logger.warn('[SUBSCRIPTIONS] Role subscription failed:'.replace(/['`]$/, `: ${error}'`/));
		}

		return () => {
			this.unsubscribeFromRoleChanges();
		};
	}

	/**
	 * Handle department change event
	 */
	private handleDepartmentChange(userData: any): void {
		const newDepartmentId = userData.departmentId;
		const oldDepartmentId = this.lastKnownDepartment;

		// Check if department actually changed
		if (newDepartmentId && newDepartmentId !== oldDepartmentId) {
			logger.info('[SUBSCRIPTIONS] Department change detected:', {
				userId: this.userId,
				oldDepartmentId,
				newDepartmentId,
				departmentName: userData.department?.name
			});

			// Update stored department
			this.lastKnownDepartment = newDepartmentId;

			// Update local storage
			if (browser) {
				const storedContext = localStorage.getItem('user-context');
				if (storedContext) {
					const context = JSON.parse(storedContext);
					context.departmentId = newDepartmentId;
					context.departmentName = userData.department?.name;
					localStorage.setItem('user-context', JSON.stringify(context));
				}
			}

			// Emit custom event for UI components to handle
			if (browser) {
				const event = new CustomEvent('department-changed', {
					detail: {
						userId: this.userId!,
						oldDepartmentId,
						newDepartmentId,
						departmentName: userData.department?.name
					}
				});
				window.dispatchEvent(event);
			}
		}
	}

	/**
	 * Handle role change event
	 */
	private handleRoleChange(roleData: any): void {
		const newRoleId = roleData.roleId;
		const newRoleName = roleData.role?.name;
		const newPermissions = roleData.role?.permissions || [];

		logger.info('[SUBSCRIPTIONS] Role change detected:', {
			userId: this.userId,
			roleId: newRoleId,
			roleName: newRoleName
		});

		// Emit custom event
		if (browser) {
			const event = new CustomEvent('role-changed', {
				detail: {
					userId: this.userId!,
					roleId: newRoleId,
					roleName: newRoleName,
					permissions: newPermissions
				}
			});
			window.dispatchEvent(event);
		}
	}

	/**
	 * Polling fallback for department changes
	 */
	private async pollDepartmentChange(): Promise<void> {
		if (!browser || !this.userId) return;

		try {
			// Query current user department from API
			const response = await fetch('/api/v2/auth/verify', {
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				const currentDepartmentId = data.user?.departmentId;

				// Check if department changed
				if (currentDepartmentId && currentDepartmentId !== this.lastKnownDepartment) {
					logger.info('[SUBSCRIPTIONS] Department change detected via polling:', {
						oldDepartmentId: this.lastKnownDepartment,
						newDepartmentId: currentDepartmentId
					});

					this.handleDepartmentChange({
						id: data.user.id,
						departmentId: currentDepartmentId,
						department: { id: currentDepartmentId, name: data.user.departmentName }
					});
				}
			}
		} catch (error) {
			logger.error('Catch failed', error as Error);
		}
	}

	/**
	 * Start polling for a specific subscription type
	 */
	private startPolling(key: string, callback: () => Promise<void>, intervalMs: number): void {
		// Clear existing interval if any
		const existingInterval = this.pollingIntervals.get(key);
		if (existingInterval) {
			clearInterval(existingInterval);
		}

		// Set up new interval
		const interval = setInterval(callback, intervalMs);
		this.pollingIntervals.set(key, interval);

		logger.info(`[SUBSCRIPTIONS] Started polling for ${key} (every ${intervalMs}ms)`);
	}

	/**
	 * Stop polling for a specific subscription type
	 */
	private stopPolling(key: string): void {
		const interval = this.pollingIntervals.get(key);
		if (interval) {
			clearInterval(interval);
			this.pollingIntervals.delete(key);
			logger.info(`[SUBSCRIPTIONS] Stopped polling for ${key}`);
		}
	}

	/**
	 * Unsubscribe from department changes
	 */
	unsubscribeFromDepartmentChanges(): void {
		const subscription = this.subscriptions.get('department-change');
		if (subscription) {
			subscription.unsubscribe();
			this.subscriptions.delete('department-change');
		}
		this.stopPolling('department-change');
		logger.info('[SUBSCRIPTIONS] Unsubscribed from department changes');
	}

	/**
	 * Unsubscribe from role changes
	 */
	unsubscribeFromRoleChanges(): void {
		const subscription = this.subscriptions.get('role-change');
		if (subscription) {
			subscription.unsubscribe();
			this.subscriptions.delete('role-change');
		}
		logger.info('[SUBSCRIPTIONS] Unsubscribed from role changes');
	}

	/**
	 * Clean up all subscriptions and intervals
	 */
	destroy(): void {
		logger.info('[SUBSCRIPTIONS] Destroying subscription manager');

		// Unsubscribe from all
		this.unsubscribeFromDepartmentChanges();
		this.unsubscribeFromRoleChanges();

		// Clear all polling intervals
		for (const [key, interval] of this.pollingIntervals.entries()) {
			clearInterval(interval);
			this.pollingIntervals.delete(key);
		}

		// Clear stored data
		this.subscriptions.clear();
		this.pollingIntervals.clear();
	}
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a subscription manager instance
 * Should be called in +layout.svelte or root component
 */
export function createSubscriptionManager(
	userId: string | null,
	departmentId?: string,
	roles?: string[]
): SubscriptionManager {
	return new SubscriptionManager(userId, departmentId, roles);
}

/**
 * Set up department change listener in a component
 * Returns cleanup function
 */
export function onDepartmentChange(callback: (event: DepartmentChangeEvent) => void): () => void {
	if (!browser) return () => {};

	const handler = (event: Event) => callback(event as DepartmentChangeEvent);
	window.addEventListener('department-changed', handler);

	return () => {
		window.removeEventListener('department-changed', handler);
	};
}

/**
 * Set up role change listener in a component
 * Returns cleanup function
 */
export function onRoleChange(callback: (event: RoleChangeEvent) => void): () => void {
	if (!browser) return () => {};

	const handler = (event: Event) => callback(event as RoleChangeEvent);
	window.addEventListener('role-changed', handler);

	return () => {
		window.removeEventListener('role-changed', handler);
	};
}
