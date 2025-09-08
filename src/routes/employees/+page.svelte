<script lang="ts">
	import { Search, Filter, Plus, Download, Users, AlertCircle, Wifi, WifiOff } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Alert from '$lib/components/ui/alert/alert.svelte';
	import AlertDescription from '$lib/components/ui/alert/alert-description.svelte';
	import AdvancedEmployeeTable from '$lib/components/employees/AdvancedEmployeeTable/AdvancedEmployeeTable.svelte';
	import FilterPanel from '$lib/components/employees/FilterPanel.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import type { Employee } from '$lib/schemas/employee';

	// Get data from server loader
	let { data }: { data: PageData } = $props();

	// Extract data from server load
	const { employeesData, departments, positions, filters, isUsingMockData } = data;

	// Page state - initialize from server data
	let searchQuery = $state(filters.search || '');
	let showFilters = $state(false);
	let selectedDepartments = $state<string[]>(filters.departmentId ? [filters.departmentId] : []);
	let selectedStatuses = $state<string[]>(filters.status ? [filters.status] : []);

	// For real-time UI filtering (applied on top of server pagination)
	let localFilteredEmployees = $derived.by(() => {
		let employees = employeesData.employees;

		// Only apply local filters if they're different from server filters
		// This allows for real-time search without page reload
		if (searchQuery !== filters.search && searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			employees = employees.filter(
				(emp) =>
					emp.firstName.toLowerCase().includes(query) ||
					emp.lastName.toLowerCase().includes(query) ||
					emp.email.toLowerCase().includes(query) ||
					(emp.position?.title || '').toLowerCase().includes(query) ||
					(emp.department?.name || '').toLowerCase().includes(query) ||
					emp.employeeId.toLowerCase().includes(query)
			);
		}

		return employees;
	});

	// Active filters for display
	let activeFilters = $derived(() => {
		const filters = [];
		if (selectedDepartments.length > 0) {
			filters.push(
				`${selectedDepartments.length} Department${selectedDepartments.length > 1 ? 's' : ''}`
			);
		}
		if (selectedStatuses.length > 0) {
			filters.push(`${selectedStatuses.length} Status${selectedStatuses.length > 1 ? 'es' : ''}`);
		}
		return filters;
	});

	// Handle server-side filtering with URL updates
	async function applyServerFilters() {
		const params = new URLSearchParams($page.url.searchParams);

		// Update search param
		if (searchQuery.trim()) {
			params.set('search', searchQuery.trim());
		} else {
			params.delete('search');
		}

		// Update department filter
		if (selectedDepartments.length === 1) {
			params.set('departmentId', selectedDepartments[0]);
		} else {
			params.delete('departmentId');
		}

		// Update status filter
		if (selectedStatuses.length === 1) {
			params.set('status', selectedStatuses[0]);
		} else {
			params.delete('status');
		}

		// Reset to first page when filters change
		params.delete('page');

		// Navigate to update the URL and trigger server reload
		await goto(`${$page.route.id}?${params.toString()}`, {
			keepFocus: true,
			noScroll: true
		});
	}

	function clearFilters() {
		selectedDepartments = [];
		selectedStatuses = [];
		searchQuery = '';

		// Clear URL params and reload
		goto($page.route.id || '/employees', {
			keepFocus: true,
			noScroll: true
		});
	}

	function exportEmployees() {
		console.log('Exporting employees...', localFilteredEmployees);
		// TODO: Implement CSV/Excel export
	}

	let showAddEmployee = $state(false);
	function addEmployee() {
		showAddEmployee = true;
	}

	// Handle pagination
	async function handlePageChange(newPage: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', newPage.toString());

		await goto(`${$page.route.id}?${params.toString()}`, {
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<svelte:head>
	<title>Employees - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-6 pt-6 pb-6">
	<!-- Data Source Indicator -->
	{#if isUsingMockData}
		<div class="mb-4">
			<Alert class="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
				<WifiOff class="h-4 w-4 text-amber-600 dark:text-amber-400" />
				<AlertDescription class="text-amber-800 dark:text-amber-200">
					<strong>Demo Mode:</strong> Using mock data. Connect to your backend API for live employee
					data.
				</AlertDescription>
			</Alert>
		</div>
	{:else}
		<div class="mb-4">
			<Alert class="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
				<Wifi class="h-4 w-4 text-green-600 dark:text-green-400" />
				<AlertDescription class="text-green-800 dark:text-green-200">
					<strong>Live Data:</strong> Connected to backend API and showing real employee data.
				</AlertDescription>
			</Alert>
		</div>
	{/if}

	<!-- Filter Panel -->
	{#if showFilters}
		<div class="mb-6">
			<FilterPanel
				bind:selectedDepartments
				bind:selectedStatuses
				{departments}
				onApplyFilters={applyServerFilters}
			/>
		</div>
	{/if}

	<!-- Results Summary -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center space-x-2 text-sm text-muted-foreground">
			<Users class="h-4 w-4" />
			<span>
				Showing {localFilteredEmployees.length} of {employeesData.totalCount} employees
				{#if employeesData.totalPages > 1}
					(Page {employeesData.page} of {employeesData.totalPages})
				{/if}
			</span>
		</div>

		<!-- Pagination Controls -->
		{#if employeesData.totalPages > 1}
			<div class="flex items-center space-x-2">
				<Button
					variant="outline"
					size="sm"
					disabled={employeesData.page <= 1}
					onclick={() => handlePageChange(employeesData.page - 1)}
				>
					Previous
				</Button>
				<span class="text-sm">
					{employeesData.page} of {employeesData.totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={employeesData.page >= employeesData.totalPages}
					onclick={() => handlePageChange(employeesData.page + 1)}
				>
					Next
				</Button>
			</div>
		{/if}
	</div>

	<!-- Advanced Employee Table -->
	<AdvancedEmployeeTable
		employees={localFilteredEmployees}
		bind:searchQuery
		bind:showFilters
		{activeFilters}
		{clearFilters}
		{addEmployee}
		{exportEmployees}
		totalCount={employeesData.totalCount}
		currentPage={employeesData.page}
		totalPages={employeesData.totalPages}
		onPageChange={handlePageChange}
		onApplyFilters={applyServerFilters}
	/>
</div>

{#if showAddEmployee}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
		<div class="w-full max-w-md rounded-xl border border-border bg-background p-6">
			<h3 class="mb-2 font-semibold">Add Employee</h3>
			<p class="mb-4 text-sm text-muted-foreground">
				This is a placeholder modal. Hook up your form here.
			</p>
			<div class="flex justify-end">
				<button class="rounded-lg border px-3 py-2" onclick={() => (showAddEmployee = false)}
					>Close</button
				>
			</div>
		</div>
	</div>
{/if}
