<script lang="ts">
	import { onMount } from 'svelte';
	import { authActions } from '$lib/stores/auth';
	import { page } from '$app/stores';

	/**
	 * Authentication Guard Component
	 * Syncs server-validated user to client-side auth store
	 *
	 * Auth is enforced server-side in:
	 * - hooks.server.ts (validates session)
	 * - +layout.server.ts (redirects if not authenticated)
	 *
	 * This component just syncs the validated user to the client store
	 */

	import { get } from 'svelte/store';
	import { authStore } from '$lib/stores/auth';

	// Sync server-validated user to client store (non-blocking)
	onMount(() => {
		// Check if auth is already initialized
		const currentState = get(authStore);
		if (currentState.isAuthenticated && currentState.user) {
			return;
		}

		// Sync user data from server (already validated by hooks.server.ts + layout.server.ts)
		const pageData = get(page);
		const serverUser = pageData?.data?.user;

		if (serverUser?.id) {
			// No await needed - this is just syncing to client store
			authActions.setUser({
				id: serverUser.id,
				email: serverUser.email,
				displayName: serverUser.displayName || serverUser.email.split('@')[0] || 'User',
				onboardingStatus: 'Active',
				isActive: true
			});
		}
	});
</script>

<!-- Render immediately - server already validated auth -->
<slot />

<style>
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
