/**
 * Auth Service Re-export
 *
 * This file re-exports the authService for backwards compatibility.
 * Components importing from '$lib/services/auth' will get authService.
 */

export * from './authService';

// Re-export auth store functionality for backwards compatibility
import { auth } from '$lib/stores/auth.svelte';
import { type Readable, derived, writable } from 'svelte/store';

/**
 * Current user store for backwards compatibility
 * This is a derived store that tracks auth.user
 */
export const currentUser: Readable<typeof auth.user> = {
	subscribe(run) {
		// Create a subscription that watches auth.user
		let unsubscribe: (() => void) | undefined;

		const update = () => {
			run(auth.user);
		};

		// Initial update
		update();

		// Watch for changes (in Svelte 5, state changes are tracked automatically)
		// We use an effect-like pattern by creating an interval to check for changes
		const interval = setInterval(update, 100);

		return () => {
			clearInterval(interval);
			if (unsubscribe) unsubscribe();
		};
	}
};

/**
 * Check if the current user has a specific permission
 * @param permission - The permission string to check
 * @returns true if the user has the permission, false otherwise
 */
export function hasPermission(permission: string): boolean {
	return auth.hasPermission(permission);
}
