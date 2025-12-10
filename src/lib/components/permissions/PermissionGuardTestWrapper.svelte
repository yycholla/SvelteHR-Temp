<script lang="ts">
	import PermissionGuard from '$lib/components/permissions/PermissionGuard.svelte';
	import type { PermissionContext, PermissionString } from '$lib/types/permissions';

	interface Props {
		permissions: PermissionString[] | PermissionContext;
		requires?: PermissionString | PermissionString[];
		requireAll?: boolean;
		inverse?: boolean;
		as?: string | null;
		class?: string;
		showFallback?: boolean; // Flag to test fallback
	}

	let {
		permissions,
		requires,
		requireAll,
		inverse,
		as,
		class: className,
		showFallback
	}: Props = $props();
</script>

<PermissionGuard {permissions} {requires} {requireAll} {inverse} {as} class={className}>
	{#snippet children()}
		<span>Access Granted</span>
	{/snippet}
	{#snippet fallback()}
		{#if showFallback}
			<span>Access Denied</span>
		{/if}
	{/snippet}
</PermissionGuard>
