<script lang="ts">
	import DataTable from '$lib/components/data-table/DataTable.svelte';
	import type { Schema } from '$lib/components/data-table/schemas.js';

	let { data }: { data: Schema[] } = $props();
</script>

<DataTable {data} />
