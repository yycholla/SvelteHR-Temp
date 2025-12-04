<!-- Re-export the main data table component -->
<script lang="ts">
	import DataTable from '../data-table.svelte';

	const { ...props } = $props();
</script>

<DataTable {...props}>
	{#if children}
		{@render children()}
	{/if}
</DataTable>
