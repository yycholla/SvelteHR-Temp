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

<PermissionGuard
	{permissions}
	{requires}
	{requireAll}
	{inverse}
	{as}
	class={className}
	{...restProps}
>
	{#snippet children()}
		<span data-testid="children">{childrenText}</span>
	{/snippet}
	{#if fallbackText}
		{#snippet fallback()}
			<span data-testid="fallback">{fallbackText}</span>
		{/snippet}
	{/if}
</PermissionGuard>
