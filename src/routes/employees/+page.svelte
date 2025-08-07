<script lang="ts">
	import { Search, Filter, Plus, Download, Users } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { mockEmployees, departments, type Employee } from '$lib/data/mockEmployees.js';
	import AdvancedEmployeeTable from '$lib/components/employees/AdvancedEmployeeTable/AdvancedEmployeeTable.svelte';
	import FilterPanel from '$lib/components/employees/FilterPanel.svelte';

	// Page state
	let searchQuery = $state('');
	let showFilters = $state(false);
	let selectedDepartments = $state<string[]>([]);
	let selectedStatuses = $state<string[]>([]);

	// Computed values
	let filteredEmployees = $derived.by(() => {
		let employees = mockEmployees;

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			employees = employees.filter(emp => 
				emp.firstName.toLowerCase().includes(query) ||
				emp.lastName.toLowerCase().includes(query) ||
				emp.email.toLowerCase().includes(query) ||
				emp.position.title.toLowerCase().includes(query) ||
				emp.department.name.toLowerCase().includes(query) ||
				emp.employeeId.toLowerCase().includes(query)
			);
		}

		// Filter by departments
		if (selectedDepartments.length > 0) {
			employees = employees.filter(emp => selectedDepartments.includes(emp.department.id));
		}

		// Filter by status
		if (selectedStatuses.length > 0) {
			employees = employees.filter(emp => selectedStatuses.includes(emp.status));
		}

		return employees;
	});

	let activeFilters = $derived(() => {
		const filters = [];
		if (selectedDepartments.length > 0) {
			filters.push(`${selectedDepartments.length} Department${selectedDepartments.length > 1 ? 's' : ''}`);
		}
		if (selectedStatuses.length > 0) {
			filters.push(`${selectedStatuses.length} Status${selectedStatuses.length > 1 ? 'es' : ''}`);
		}
		return filters;
	});

	function clearFilters() {
		selectedDepartments = [];
		selectedStatuses = [];
		searchQuery = '';
	}

	function exportEmployees() {
		console.log('Exporting employees...', filteredEmployees);
		// TODO: Implement CSV/Excel export
	}

	function addEmployee() {
		console.log('Adding new employee...');
		// TODO: Open add employee modal
	}
</script>

<svelte:head>
	<title>Employees - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-6 pb-6 pt-6">


	<!-- Filter Panel -->
	{#if showFilters}
		<div class="mb-6">
			<FilterPanel
				bind:selectedDepartments
				bind:selectedStatuses
				{departments}
			/>
		</div>
	{/if}

	<!-- Results Summary -->
	{#if searchQuery || activeFilters.length > 0}
		<div class="mb-4 flex items-center space-x-2 text-sm text-muted-foreground">
			<Users class="h-4 w-4" />
			<span>
				Showing {filteredEmployees.length} of {mockEmployees.length} employees
			</span>
		</div>
	{/if}

	<!-- Advanced Employee Table -->
	<AdvancedEmployeeTable 
		employees={filteredEmployees} 
		bind:searchQuery
		bind:showFilters
		{activeFilters}
		{clearFilters}
		{addEmployee}
		{exportEmployees}
	/>
</div>