<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { Loader2, AlertTriangle } from '@lucide/svelte';

	/**
	 * Protected Route Component
	 * Handles authentication and authorization for protected pages
	 */

	// Props
	interface Props {
		requiredRoles?: string[];
		requiredPermissions?: string[];
		minRoleLevel?: number | null;
		redirectTo?: string;
		showLoading?: boolean;
		showUnauthorized?: boolean;
		children?: any;
	}

	let {
		requiredRoles = [],
		requiredPermissions = [],
		minRoleLevel = null,
		redirectTo = '/login',
		showLoading = true,
		showUnauthorized = true,
		children
	}: Props = $props();

	// State
	let isAuthorized = $state(false);
	let authCheckComplete = $state(false);
	let unauthorizedReason = $state('');

	// Check authorization
	const checkAuthorization = () => {
		if (!auth.isAuthenticated) {
			unauthorizedReason = 'Authentication required';
			return false;
		}

		// Assuming auth.roles is correct. If it's UserRoleAssignment[], we might need to map.
		// But if previous code worked with includes, maybe it's strings.
		// For safety, I will use auth.hasRole(role) if available, or just check auth.roles.
		// auth.hasRole takes a string.
		
		// Check required roles
		if (requiredRoles.length > 0) {
			// Use auth.hasRole which encapsulates the logic
			const hasRequiredRole = requiredRoles.some((role) => auth.hasRole(role));
			if (!hasRequiredRole) {
				unauthorizedReason = `Required role: ${requiredRoles.join(' or ')}`;
				return false;
			}
		}

		// Check minimum role level
		if (minRoleLevel !== null) {
			if (!auth.hasMinimumRoleLevel(minRoleLevel)) {
				// We can't easily get current level to display, but we know it failed
				unauthorizedReason = `Insufficient privileges (min level ${minRoleLevel})`;
				return false;
			}
		}

		// Check specific permissions
		if (requiredPermissions.length > 0) {
			const hasRequiredPermissions = requiredPermissions.every((permission) => auth.hasPermission(permission));
			if (!hasRequiredPermissions) {
				unauthorizedReason = `Required permissions: ${requiredPermissions.join(', ')}`;
				return false;
			}
		}

		return true;
	};

	// Reactive statement to check authorization when auth state changes
	$effect(() => {
		if (!auth.isLoading) {
			authCheckComplete = true;
			isAuthorized = checkAuthorization();

			// Redirect if not authorized
			if (!isAuthorized && !auth.isLoading) {
				// Add current path as redirect parameter
				const currentPath = $page.url.pathname + $page.url.search;
				const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
				goto(redirectUrl);
			}
		}
	});
</script>

{#if auth.isLoading || !authCheckComplete}
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
						onclick={() => goto('/dashboard')}
						class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						Go to Dashboard
					</button>

					<button
						onclick={() => auth.logout()}
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
	{@render children?.()}
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
