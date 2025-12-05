<script lang="ts">
	// T004: PermissionGuard Svelte 5 component for permission-based conditional rendering
	// UX-only component - server-side enforcement is MANDATORY for security

	import type { PermissionContext, PermissionString } from '$lib/types/permissions';
	import { hasAllPermissions, hasAnyPermission, hasPermission } from '$lib/utils/permissions';
	import type { Snippet } from 'svelte';

	interface Props {
		/**
		 * User's permission context from page data
		 * Example: data.userPermissions or data.permissionContext
		 */
		permissions: PermissionString[] | PermissionContext;

		/**
		 * Single required permission or array of permissions
		 * Examples:
		 * - 'employees:read'
		 * - ['employees:read', 'employees:write']
		 */
		requires?: PermissionString | PermissionString[];

		/**
		 * Require ALL permissions (true) or ANY permission (false)
		 * Default: false (ANY)
		 */
		requireAll?: boolean;

		/**
		 * Show content when permission check FAILS instead of passes
		 * Useful for "You don't have access" messages
		 * Default: false
		 */
		inverse?: boolean;

		/**
		 * Content to render when permission check passes
		 */
		children?: Snippet;

		/**
		 * Content to render when permission check fails (optional)
		 * If not provided, renders nothing on failure
		 */
		fallback?: Snippet;

		/**
		 * HTML element type to render as wrapper
		 * Set to null to render children without wrapper
		 * Default: 'div'
		 */
		as?: string | null;

		/**
		 * CSS class for wrapper element (only used if as !== null)
		 */
		class?: string;

		/**
		 * Additional HTML attributes for wrapper element
		 */
		[key: string]: unknown;
	}

	const {
		permissions,
		requires,
		requireAll = false,
		inverse = false,
		children,
		fallback,
		as = 'div',
		class: className = '',
		...restProps
	}: Props = $props();

	// Extract permission array from context or use directly
	const permissionArray = $derived(
		Array.isArray(permissions) ? permissions : permissions.permissions
	);

	// Check if user has required permissions
	const hasRequiredPermissions = $derived.by(() => {
		if (!requires) {
			// No permission requirement - always show
			return true;
		}

		if (Array.isArray(requires)) {
			// Multiple permissions - check based on requireAll flag
			return requireAll
				? hasAllPermissions(permissionArray, requires)
				: hasAnyPermission(permissionArray, requires);
		}

		// Single permission
		return hasPermission(permissionArray, requires);
	});

	// Determine if content should be shown based on inverse flag
	const shouldShow = $derived(inverse ? !hasRequiredPermissions : hasRequiredPermissions);
</script>

{#if shouldShow}
	{#if as}
		<svelte:element this={as} class={className} {...restProps}>
			{@render children?.()}
		</svelte:element>
	{:else}
		{@render children?.()}
	{/if}
{:else if fallback}
	{#if as}
		<svelte:element this={as} class={className} {...restProps}>
			{@render fallback()}
		</svelte:element>
	{:else}
		{@render fallback()}
	{/if}
{/if}
