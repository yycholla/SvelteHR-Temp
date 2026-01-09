<!-- Re-export the main data table component -->
<script lang="ts">
	import DataTable from '../tables/DataTable.svelte';

	const { cellRenderer, ...props } = $props();
</script>

<DataTable {cellRenderer} {...props} />
