<script lang="ts">
	import EmployeeList from '$lib/components/employees/EmployeeListShadcn.svelte';
</script>

<svelte:head>
	<title>Employees - SvelteHR</title>
	<meta name="description" content="View and manage all employees in your organization" />
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Employees</h1>
			<p class="text-muted-foreground">View and manage all employees in your organization</p>
		</div>
	</div>

	<EmployeeList />
</div>
