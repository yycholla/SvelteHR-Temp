<script lang="ts">
	import { onMount } from 'svelte';
	import { authActions } from '$lib/stores/auth';
	import { page } from '$app/stores';

	/**
	 * Authentication Guard Component
	 * Initializes auth state from server-loaded data
	 * Use this at the app root level to ensure auth is initialized
	 */

	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { authStore } from '$lib/stores/auth';

	let initComplete = false;

	onMount(async () => {
		// Check if auth is already initialized
		const currentState = get(authStore);
		if (currentState.isAuthenticated && currentState.user) {
			initComplete = true;
			return;
		}

		// Check if user data was loaded server-side via hooks.server.ts
		const pageData = get(page);
		const serverUser = pageData?.data?.user;

		if (serverUser?.id) {
			// Use server-loaded user data instead of making another verification call
			// This avoids duplicate /api/auth/verify requests since hooks.server.ts already validated
			await authActions.setUser({
				id: serverUser.id,
				email: serverUser.email,
				displayName: serverUser.displayName || serverUser.email.split('@')[0] || 'User',
				onboardingStatus: 'Active',
				isActive: true
			});
			initComplete = true;
			return;
		}

		// No server user data - likely on a public page, just mark as complete
		initComplete = true;
	});
</script>

{#if initComplete}
	<!-- Auth is initialized, render app -->
	<slot />
{:else}
	<!-- Show loading while initializing auth -->
	<div class="fixed inset-0 flex items-center justify-center bg-white">
		<div class="text-center">
			<!-- Loading Spinner -->
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
			<p class="mt-4 text-sm text-gray-600">Loading...</p>
		</div>
	</div>
{/if}

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
