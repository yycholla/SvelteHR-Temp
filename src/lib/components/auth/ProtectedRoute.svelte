<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authStore, isAuthenticated, isLoading, userRoles } from '$lib/stores/auth';
	import { Loader2, AlertTriangle } from '@lucide/svelte';

	/**
	 * Protected Route Component
	 * Handles authentication and authorization for protected pages
	 */

	// Props
	export let requiredRoles: string[] = []; // Empty array means any authenticated user
	export let requiredPermissions: string[] = []; // Specific permissions required
	export let minRoleLevel: number | null = null; // Minimum role level required
	export let redirectTo = '/login'; // Where to redirect if not authorized
	export let showLoading = true; // Show loading spinner
	export let showUnauthorized = true; // Show unauthorized message

	// State
	let isAuthorized = false;
	let authCheckComplete = false;
	let unauthorizedReason = '';

	// Check authorization
	const checkAuthorization = () => {
		if (!$isAuthenticated) {
			unauthorizedReason = 'Authentication required';
			return false;
		}

		const currentRoles = $userRoles;

		// Check required roles
		if (requiredRoles.length > 0) {
			const hasRequiredRole = requiredRoles.some((role) => currentRoles.includes(role));
			if (!hasRequiredRole) {
				unauthorizedReason = `Required role: ${requiredRoles.join(' or ')}`;
				return false;
			}
		}

		// Check minimum role level
		if (minRoleLevel !== null) {
			const roleLevels: Record<string, number> = {
				admin: 80,
				hr_admin: 60,
				finance: 50,
				manager: 30,
				employee: 10
			};

			const currentLevel = Math.max(...currentRoles.map((role) => roleLevels[role] || 0));
			if (currentLevel < minRoleLevel) {
				unauthorizedReason = `Insufficient privileges (level ${currentLevel} < ${minRoleLevel})`;
				return false;
			}
		}

		// Check specific permissions (simplified - could be enhanced)
		if (requiredPermissions.length > 0) {
			// For now, just check if user has admin role for any permission requirement
			// This could be enhanced with a proper permission system
			if (!currentRoles.includes('admin') && !currentRoles.includes('hr_admin')) {
				unauthorizedReason = `Required permissions: ${requiredPermissions.join(', ')}`;
				return false;
			}
		}

		return true;
	};

	// Reactive statement to check authorization when auth state changes
	$: if (!$isLoading) {
		authCheckComplete = true;
		isAuthorized = checkAuthorization();

		// Redirect if not authorized
		if (!isAuthorized && !$isLoading) {
			// Add current path as redirect parameter
			const currentPath = $page.url.pathname + $page.url.search;
			const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
			goto(redirectUrl);
		}
	}
</script>

{#if $isLoading || !authCheckComplete}
	<!-- Loading State -->
	{#if showLoading}
		<div class="flex min-h-screen items-center justify-center bg-gray-50">
			<div class="text-center">
				<Loader2 class="mx-auto h-8 w-8 animate-spin text-blue-600" />
				<p class="mt-4 text-sm text-gray-600">Checking authentication...</p>
			</div>
		</div>
	{/if}
{:else if !isAuthorized}
	<!-- Unauthorized State -->
	{#if showUnauthorized}
		<div class="flex min-h-screen items-center justify-center bg-gray-50">
			<div class="mx-auto max-w-md px-4 text-center">
				<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
					<AlertTriangle class="h-8 w-8 text-red-600" />
				</div>

				<h1 class="mt-4 text-2xl font-semibold text-gray-900">Access Denied</h1>
				<p class="mt-2 text-sm text-gray-600">You don't have permission to access this page.</p>

				{#if unauthorizedReason}
					<div class="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
						<p class="text-sm text-red-700">
							<strong>Reason:</strong>
							{unauthorizedReason}
						</p>
					</div>
				{/if}

				<div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
					<button
						on:click={() => goto('/dashboard')}
						class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						Go to Dashboard
					</button>

					<button
						on:click={() => authStore.logout()}
						class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						Sign Out
					</button>
				</div>

				<div class="mt-6 text-xs text-gray-500">
					<p>If you believe this is an error, please contact your administrator.</p>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<!-- Authorized - Show Protected Content -->
	<slot />
{/if}

<style>
	/* Loading animation improvements */
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

	/* Focus styles for accessibility */
	button:focus {
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	/* Smooth transitions */
	button {
		transition: all 0.15s ease-in-out;
	}
</style>
