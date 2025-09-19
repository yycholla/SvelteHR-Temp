<script lang="ts">
	import { userRoles, hasPermission, hasRole, hasMinimumRoleLevel } from '$lib/stores/auth';

	/**
	 * Role Guard Component
	 * Controls access to UI elements based on user roles and permissions
	 */

	interface Props {
		children?: any;
		roles?: string[]; // Required roles (user must have at least one)
		permissions?: string[]; // Required permissions (user must have at least one)
		minimumLevel?: number; // Minimum role level required
		requireAll?: boolean; // Whether user must have ALL roles/permissions (default: false)
		fallback?: any; // Content to show when access is denied
		hideOnDenied?: boolean; // Hide content instead of showing fallback (default: true)
	}

	let {
		children,
		roles = [],
		permissions = [],
		minimumLevel,
		requireAll = false,
		fallback,
		hideOnDenied = true
	}: Props = $props();

	// Check access based on roles
	const hasRequiredRoles = $derived(() => {
		if (roles.length === 0) return true;

		if (requireAll) {
			return roles.every((role) => hasRole(role));
		} else {
			return roles.some((role) => hasRole(role));
		}
	});

	// Check access based on permissions
	const hasRequiredPermissions = $derived(() => {
		if (permissions.length === 0) return true;

		if (requireAll) {
			return permissions.every((permission) => hasPermission(permission));
		} else {
			return permissions.some((permission) => hasPermission(permission));
		}
	});

	// Check minimum role level
	const hasMinimumLevel = $derived(() => {
		if (minimumLevel === undefined) return true;
		return hasMinimumRoleLevel(minimumLevel);
	});

	// Overall access control
	const hasAccess = $derived(hasRequiredRoles() && hasRequiredPermissions() && hasMinimumLevel());
</script>

{#if hasAccess}
	{@render children?.()}
{:else if !hideOnDenied}
	{#if fallback}
		{@render fallback?.()}
	{:else}
		<div class="access-denied">
			<div class="text-sm text-gray-500">Access denied. Insufficient permissions.</div>
		</div>
	{/if}
{/if}

<style>
	.access-denied {
		padding: var(--cds-spacing-06);
		text-align: center;
		border: 1px dashed var(--cds-border-subtle);
		border-radius: var(--cds-border-radius);
		background-color: var(--cds-layer-01);
	}
</style>
