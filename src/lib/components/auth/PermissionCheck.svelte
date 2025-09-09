<!--
  Simple permission checking component with inline text feedback
  Useful for showing permission status or quick checks
-->
<script lang="ts">
	import { isAuthenticated, currentUser } from '$lib/stores/auth';
	import { canAccess } from '$lib/auth/guards';
	import type { PermissionCheck } from '$lib/auth/guards';

	// Props
	export let permissions: string[] = [];
	export let roles: string[] = [];
	export let requireAll = false;
	export let showStatus = false; // Show permission status text
	export let statusText = 'Access';
	export let allowedText = 'Allowed';
	export let deniedText = 'Denied';

	// Build permission check
	$: permissionCheck: PermissionCheck = {
		permissions: permissions.length > 0 ? permissions : undefined,
		roles: roles.length > 0 ? roles : undefined,
		requireAll
	};

	// Check if user has access
	$: hasPermission = canAccess(permissionCheck);

	// Export access state for parent components
	export { hasPermission as allowed };
</script>

{#if hasPermission}
	<slot name="allowed" {hasPermission}>
		{#if showStatus}
			<span class="text-sm font-medium text-success-600">
				{statusText}: {allowedText}
			</span>
		{:else}
			<slot />
		{/if}
	</slot>
{:else}
	<slot name="denied" {hasPermission}>
		{#if showStatus}
			<span class="text-sm font-medium text-error-600">
				{statusText}: {deniedText}
			</span>
		{/if}
	</slot>
{/if}

<!-- 
Usage Examples:

Simple content switching:
<PermissionCheck permissions={['admin:system']}>
  <slot name="allowed">
    <AdminControls />
  </slot>
  <slot name="denied">
    <p>Administrator access required</p>
  </slot>
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
-->
