<!--
	Modern Dashboard Page
	
	Role-based dashboard with dynamic widgets, real-time updates, and GraphQL integration
	Uses the Dashboard component with server-side data loading
-->

<script lang="ts">
	import Dashboard from '$lib/components/dashboard/Dashboard.svelte';
	import type { PageData } from './$types';

	// Props from page data (server-side loaded)
	export let data: PageData;
</script>

<svelte:head>
	<title>Dashboard - SvelteHR</title>
	<meta name="description" content="Modern HR Dashboard with real-time insights and role-based access" />
</svelte:head>

<!-- Use the Dashboard component with server-loaded data -->
<Dashboard {data} />