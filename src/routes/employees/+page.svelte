<!--
	Employee Management Page
	
	Comprehensive employee management with search, filtering, and CRUD operations
	Uses the EmployeeList component with server-side data loading and GraphQL integration
-->

<script lang="ts">
	import EmployeeList from '$lib/components/employees/EmployeeList.svelte';
	import type { PageData } from './$types';

	// Props from page data (server-side loaded)
	export let data: PageData;
</script>

<svelte:head>
	<title>Employee Management - SvelteHR</title>
	<meta name="description" content="Manage employees, departments, and organizational structure with GraphQL integration" />
</svelte:head>

<!-- Use the EmployeeList component with server-loaded data -->
<EmployeeList {data} />
