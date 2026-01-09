<script lang="ts">
	// Test wrapper component for PermissionGuard testing
	import PermissionGuard from './PermissionGuard.svelte';
	import type { PermissionContext, PermissionString } from '$lib/types/permissions';

	const {
		permissions,
		requires,
		requireAll = false,
		inverse = false,
		as = 'div',
		class: className = '',
		childrenText = '',
		fallbackText = '',
		...restProps
	}: {
		permissions: PermissionString[] | PermissionContext;
		requires?: PermissionString | PermissionString[];
		requireAll?: boolean;
		inverse?: boolean;
		as?: string | null;
		class?: string;
		childrenText?: string;
		fallbackText?: string;
		[key: string]: unknown;
	} = $props();
</script>

{#snippet childrenSnippet()}
	<span data-testid="children">{childrenText}</span>
{/snippet}

{#snippet fallbackSnippet()}
	<span data-testid="fallback">{fallbackText}</span>
{/snippet}

<PermissionGuard
	{permissions}
	{requires}
	{requireAll}
	{inverse}
	{as}
	class={className}
	children={childrenSnippet}
	fallback={fallbackText ? fallbackSnippet : undefined}
	{...restProps}
/>
