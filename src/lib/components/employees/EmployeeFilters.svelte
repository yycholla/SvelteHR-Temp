<!--
	Employee Filters Component
	
	Provides comprehensive filtering options for employee list with
	GraphQL integration and real-time filter updates.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { X, RefreshCw } from 'lucide-svelte';
	
	// GraphQL and Auth
	import { createBrowserGraphQLClient } from '$lib/graphql/client.js';
	import { queries } from '$lib/graphql/queries.js';
	import { authStore } from '$lib/auth/store.js';

	// UI Components
	import Button from '$lib/components/ui/button/button.svelte';
	import Select from '$lib/components/ui/select/select.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	// Props
	interface Props {
		departmentFilter: string | null;
		statusFilter: string | null;
		locationFilter: string | null;
		roleFilter: string | null;
		showInactiveEmployees: boolean;
		onReset: () => void;
	}

	let { 
		departmentFilter = $bindable(null),
		statusFilter = $bindable(null),
		locationFilter = $bindable(null),
		roleFilter = $bindable(null),
		showInactiveEmployees = $bindable(false),
		onReset
	}: Props = $props();

	// GraphQL client
	let graphqlClient: ReturnType<typeof createBrowserGraphQLClient> | null = null;

	// Filter options state
	let departments = $state<Array<{id: string, name: string}>>([]);
	let locations = $state<string[]>([]);
	let roles = $state<string[]>([]);
	let loading = $state(true);

	// Status options (static)
	const statusOptions = [
		{ value: 'active', label: 'Active' },
		{ value: 'inactive', label: 'Inactive' },
		{ value: 'terminated', label: 'Terminated' },
		{ value: 'on_leave', label: 'On Leave' }
	];

	// Initialize filters
	async function initializeFilters() {
		try {
			if (browser && !graphqlClient) {
				graphqlClient = createBrowserGraphQLClient();
				
				if (authStore.token) {
					graphqlClient.setToken(authStore.token);
				}
			}

			await loadFilterOptions();

		} catch (err) {
			console.error('Failed to initialize filters:', err);
		} finally {
			loading = false;
		}
	}

	// Load filter options from GraphQL
	async function loadFilterOptions() {
		if (!graphqlClient) return;

		try {
			// Load departments
			const departmentsResponse = await graphqlClient.query(
				queries.departments.list,
				{ active: true, limit: 100 }
			);

			if (departmentsResponse.data?.departments) {
				departments = departmentsResponse.data.departments.data.map((dept: any) => ({
					id: dept.id,
					name: dept.name
				}));
			}

			// Load unique locations and roles from employees
			const filtersResponse = await graphqlClient.query(
				queries.employees.filterOptions,
				{}
			);

			if (filtersResponse.data?.employeeFilterOptions) {
				const options = filtersResponse.data.employeeFilterOptions;
				locations = options.locations || [];
				roles = options.roles || [];
			}

		} catch (err) {
			console.error('Failed to load filter options:', err);
		}
	}

	// Reset all filters
	function handleReset() {
		departmentFilter = null;
		statusFilter = null;
		locationFilter = null;
		roleFilter = null;
		showInactiveEmployees = false;
		onReset();
	}

	// Get active filter count
	const activeFilterCount = $derived(() => {
		let count = 0;
		if (departmentFilter) count++;
		if (statusFilter) count++;
		if (locationFilter) count++;
		if (roleFilter) count++;
		if (showInactiveEmployees) count++;
		return count;
	});

	// Component lifecycle
	onMount(() => {
		initializeFilters();
	});
</script>

<div class="mt-4 space-y-4 border-t border-gray-200 pt-4">
	<!-- Filter Header -->
	<div class="flex items-center justify-between">
		<h3 class="font-medium text-gray-900">Filter Employees</h3>
		<div class="flex items-center gap-2">
			{#if activeFilterCount > 0}
				<Badge variant="secondary">
					{activeFilterCount} active
				</Badge>
				<Button
					variant="ghost"
					size="sm"
					onclick={handleReset}
					class="text-gray-500 hover:text-gray-700"
				>
					<X class="mr-1 h-3 w-3" />
					Reset
				</Button>
			{/if}
		</div>
	</div>

	{#if loading}
		<!-- Loading State -->
		<div class="flex items-center justify-center py-4">
			<RefreshCw class="h-4 w-4 animate-spin text-gray-400" />
			<span class="ml-2 text-sm text-gray-500">Loading filter options...</span>
		</div>
	{:else}
		<!-- Filter Controls Grid -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<!-- Department Filter -->
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">
					Department
				</label>
				<select
					bind:value={departmentFilter}
					class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value={null}>All departments</option>
					{#each departments as department}
						<option value={department.id}>{department.name}</option>
					{/each}
				</select>
			</div>

			<!-- Status Filter -->
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">
					Status
				</label>
				<select
					bind:value={statusFilter}
					class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value={null}>All statuses</option>
					{#each statusOptions as status}
						<option value={status.value}>{status.label}</option>
					{/each}
				</select>
			</div>

			<!-- Location Filter -->
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">
					Location
				</label>
				<select
					bind:value={locationFilter}
					class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value={null}>All locations</option>
					{#each locations as location}
						<option value={location}>{location}</option>
					{/each}
				</select>
			</div>

			<!-- Role Filter -->
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">
					Position/Role
				</label>
				<select
					bind:value={roleFilter}
					class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value={null}>All positions</option>
					{#each roles as role}
						<option value={role}>{role}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Additional Options -->
		<div class="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
			<!-- Include Inactive Toggle -->
			<div class="flex items-center space-x-2">
				<Checkbox
					id="show-inactive"
					bind:checked={showInactiveEmployees}
				/>
				<label for="show-inactive" class="text-sm font-medium text-gray-700">
					Include inactive employees
				</label>
			</div>

			<!-- Quick Filters -->
			<div class="flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => {
						statusFilter = 'active';
						showInactiveEmployees = false;
					}}
					class={statusFilter === 'active' ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}
				>
					Active Only
				</Button>

				<Button
					variant="outline"
					size="sm"
					onclick={() => {
						const thisMonth = new Date();
						thisMonth.setMonth(thisMonth.getMonth() - 1);
						// This would need additional backend support for hire date filtering
						// For now, just apply active status
						statusFilter = 'active';
					}}
					class="text-green-700 hover:bg-green-50"
				>
					Recent Hires
				</Button>

				<Button
					variant="outline"
					size="sm"
					onclick={() => {
						statusFilter = 'on_leave';
					}}
					class={statusFilter === 'on_leave' ? 'bg-orange-50 border-orange-200 text-orange-700' : ''}
				>
					On Leave
				</Button>
			</div>
		</div>

		<!-- Active Filters Summary -->
		{#if activeFilterCount > 0}
			<div class="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
				<span class="text-sm text-gray-600">Active filters:</span>
				
				{#if departmentFilter}
					{@const dept = departments.find(d => d.id === departmentFilter)}
					<Badge variant="secondary" class="flex items-center gap-1">
						Dept: {dept?.name || 'Unknown'}
						<button onclick={() => departmentFilter = null} class="ml-1 hover:text-gray-700">
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if statusFilter}
					{@const status = statusOptions.find(s => s.value === statusFilter)}
					<Badge variant="secondary" class="flex items-center gap-1">
						Status: {status?.label || statusFilter}
						<button onclick={() => statusFilter = null} class="ml-1 hover:text-gray-700">
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if locationFilter}
					<Badge variant="secondary" class="flex items-center gap-1">
						Location: {locationFilter}
						<button onclick={() => locationFilter = null} class="ml-1 hover:text-gray-700">
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if roleFilter}
					<Badge variant="secondary" class="flex items-center gap-1">
						Role: {roleFilter}
						<button onclick={() => roleFilter = null} class="ml-1 hover:text-gray-700">
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if showInactiveEmployees}
					<Badge variant="secondary" class="flex items-center gap-1">
						Include Inactive
						<button onclick={() => showInactiveEmployees = false} class="ml-1 hover:text-gray-700">
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Custom select styling */
	select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
		padding-right: 2.5rem;
	}
</style>