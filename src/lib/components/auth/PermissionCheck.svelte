<!--
  Simple permission checking component with inline text feedback
  Useful for showing permission status or quick checks
-->
<script lang="ts">
	import { isAuthenticated, currentUser, hasCurrentUserPermission, hasCurrentUserRole } from '$lib/stores/auth.svelte';

	// Props using Svelte 5 $props
	interface Props {
		permissions?: string[];
		roles?: string[];
		requireAll?: boolean;
		showStatus?: boolean; // Show permission status text
		statusText?: string;
		allowedText?: string;
		deniedText?: string;
		children?: any;
		allowed?: boolean; // Bindable prop for external access to permission state
	}

	let {
		permissions = [],
		roles = [],
		requireAll = false,
		showStatus = false,
		statusText = 'Access',
		allowedText = 'Allowed',
		deniedText = 'Denied',
		children,
		allowed = $bindable()
	}: Props = $props();

	// Check if user has permission using $derived
	const hasPermission = $derived(() => {
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

	// Update bindable prop
	$effect(() => {
		allowed = hasPermission();
	});
</script>

{#if hasPermission()}
	{#if children?.allowed}
		{@render children.allowed({ hasPermission: hasPermission() })}
	{:else if showStatus}
		<span class="text-sm font-medium text-success-600">
			{statusText}: {allowedText}
		</span>
	{:else}
		{@render children?.()}
	{/if}
{:else}
	{#if children?.denied}
		{@render children.denied({ hasPermission: hasPermission() })}
	{:else if showStatus}
		<span class="text-sm font-medium text-error-600">
			{statusText}: {deniedText}
		</span>
	{/if}
{/if}

<!-- 
Usage Examples (Updated for Svelte 5):

Simple content switching:
<PermissionCheck permissions={['admin:system']}>
  {#snippet allowed()}
    <AdminControls />
  {/snippet}
  {#snippet denied()}
    <p>Administrator access required</p>
  {/snippet}
</PermissionCheck>

Status indicator:
<PermissionCheck 
  roles={['hr']} 
  showStatus 
  statusText="HR Access"
  allowedText="✓ Granted"
  deniedText="✗ Denied"
/>

Access state binding:
<PermissionCheck permissions={['write:employees']} bind:allowed={canEdit}>
  {#if canEdit}
    <EditEmployeeForm />
  {:else}
    <ViewEmployeeDetails />
  {/if}
</PermissionCheck>

Complex permission checks:
<PermissionCheck 
  permissions={['write:employees', 'manage:department']} 
  roles={['hr', 'manager']} 
  requireAll={false}
>
  <ManagementPanel />
  {#snippet denied()}
    <p class="text-warning-600">HR or Manager access required</p>
  {/snippet}
</PermissionCheck>
-->