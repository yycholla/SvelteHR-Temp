<!--
  Role-based visibility component
  Shows content only if user has required roles or permissions
-->
<script lang="ts">
	import { isAuthenticated, currentUser, hasCurrentUserPermission, hasCurrentUserRole } from '$lib/stores/auth.svelte';

	// Props using Svelte 5 $props
	interface Props {
		permissions?: string[];
		roles?: string[];
		requireAll?: boolean;
		fallback?: boolean; // Show alternative content if access denied
		loading?: boolean; // Show loading state
		children?: any;
	}

	let {
		permissions = [],
		roles = [],
		requireAll = false,
		fallback = false,
		loading = false,
		children
	}: Props = $props();

	// Check if user has access using $derived
	const hasRequiredAccess = $derived(() => {
		// Must be authenticated first
		if (!$isAuthenticated) return false;

		// If no restrictions, just need to be authenticated
		if (permissions.length === 0 && roles.length === 0) {
			return true;
		}

		// Check permissions
		const hasPermissions = permissions.length === 0 || 
			(requireAll 
				? permissions.every(permission => $hasCurrentUserPermission(permission))
				: permissions.some(permission => $hasCurrentUserPermission(permission))
			);

		// Check roles
		const hasRoles = roles.length === 0 || 
			(requireAll 
				? roles.every(role => $hasCurrentUserRole(role as any))
				: roles.some(role => $hasCurrentUserRole(role as any))
			);

		// If requireAll is true, need both permissions and roles (if specified)
		// If requireAll is false, need either permissions or roles (if specified)
		return requireAll ? hasPermissions && hasRoles : hasPermissions || hasRoles;
	});

	// Computed display states
	const showContent = $derived(hasRequiredAccess());
	const showFallback = $derived(fallback && !hasRequiredAccess() && $isAuthenticated);
</script>

{#if loading}
	<!-- Loading state -->
	<div class="flex items-center justify-center p-4">
		<div class="h-6 w-6 animate-spin rounded-full border-b-2 border-primary-500"></div>
		<span class="ml-2 text-sm text-surface-500">Loading...</span>
	</div>
{:else if showContent}
	<!-- Content for authorized users -->
	{@render children?.()}
{:else if showFallback}
	<!-- Fallback content for unauthorized but authenticated users -->
	{#if children?.fallback}
		{@render children.fallback()}
	{:else}
		<div class="rounded-lg border border-warning-200 bg-warning-50 p-4 text-center">
			<p class="text-sm text-warning-700">You don't have permission to view this content.</p>
		</div>
	{/if}
{/if}

<!-- 
Usage Examples (Updated for Svelte 5):

Basic role check:
<RoleGuard roles={['admin', 'hr']}>
  <AdminPanel />
</RoleGuard>

Permission check with fallback:
<RoleGuard permissions={['read:employees']} fallback>
  <EmployeeList />
  {#snippet fallback()}
    <p>Contact HR to access employee data</p>
  {/snippet}
</RoleGuard>

Multiple requirements (all must be met):
<RoleGuard roles={['manager']} permissions={['write:reports']} requireAll>
  <ReportEditor />
</RoleGuard>

With loading state:
<RoleGuard roles={['hr']} loading={isLoadingUserData}>
  <SensitiveData />
</RoleGuard>
-->