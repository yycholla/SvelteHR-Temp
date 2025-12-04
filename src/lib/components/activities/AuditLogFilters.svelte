<script lang="ts">
	/**
	 * AuditLogFilters Component
	 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
	 * Task: T041
	 * Created: 2025-10-02
	 *
	 * Advanced filtering component for audit logs with debounced search,
	 * date range selection, and multiple filter criteria.
	 */

	import { Calendar, Filter, RotateCcw, Search, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { onMount } from 'svelte';

	export interface FilterCriteria {
		dateFrom?: string;
		dateTo?: string;
		resourceType?: string;
		employeeId?: string;
		employeeName?: string;
		action?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | '';
		isRollback?: boolean;
		searchTerm?: string;
	}

	interface Props {
		initialFilters?: Partial<FilterCriteria>;
		resourceTypes?: string[];
		employees?: Array<{ id: string; full_name: string }>;
		onFilterChange: (filters: FilterCriteria) => void;
		onClear?: () => void;
	}

	const {
		initialFilters = {},
		resourceTypes = [
			'users',
			'departments',
			'roles',
			'permissions',
			'events',
			'tasks',
			'attendance_records'
		],
		employees = [],
		onFilterChange,
		onClear
	}: Props = $props();

	// Filter state
	let dateFrom = $state(initialFilters.dateFrom || '');
	let dateTo = $state(initialFilters.dateTo || '');
	let resourceType = $state(initialFilters.resourceType || '');
	let employeeId = $state(initialFilters.employeeId || '');
	let employeeName = $state(initialFilters.employeeName || '');
	let action = $state(initialFilters.action || '');
	let isRollback = $state(initialFilters.isRollback || false);
	let searchTerm = $state(initialFilters.searchTerm || '');

	// UI state
	let showAdvanced = $state(false);
	let employeeSearchTerm = $state('');
	let showEmployeeDropdown = $state(false);
	let resourceSearchTerm = $state('');
	let showResourceDropdown = $state(false);

	// Debounce timer
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Computed properties
	const filteredEmployees = $derived(() => {
		if (!employeeSearchTerm) return employees;
		const term = employeeSearchTerm.toLowerCase();
		return employees.filter((emp) => emp.full_name.toLowerCase().includes(term));
	});

	const filteredResourceTypes = $derived(() => {
		if (!resourceSearchTerm) return resourceTypes;
		const term = resourceSearchTerm.toLowerCase();
		return resourceTypes.filter((type) => type.toLowerCase().includes(term));
	});

	const hasActiveFilters = $derived(
		dateFrom || dateTo || resourceType || employeeId || action || isRollback || searchTerm
	);

	const activeFilterCount = $derived(() => {
		let count = 0;
		if (dateFrom) count++;
		if (dateTo) count++;
		if (resourceType) count++;
		if (employeeId) count++;
		if (action) count++;
		if (isRollback) count++;
		if (searchTerm) count++;
		return count;
	});

	// Quick date range presets
	const datePresets = [
		{ label: 'Today', days: 0 },
		{ label: 'Last 7 days', days: 7 },
		{ label: 'Last 30 days', days: 30 },
		{ label: 'Last 90 days', days: 90 }
	];

	function applyDatePreset(days: number) {
		const today = new Date();
		dateTo = today.toISOString().split('T')[0];

		if (days === 0) {
			dateFrom = dateTo;
		} else {
			const fromDate = new Date(today);
			fromDate.setDate(fromDate.getDate() - days);
			dateFrom = fromDate.toISOString().split('T')[0];
		}

		emitFilters();
	}

	function emitFilters() {
		// Clear debounce timer if exists
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Debounce for search term, immediate for other filters
		const delay = searchTerm !== initialFilters.searchTerm ? 500 : 0;

		debounceTimer = setTimeout(() => {
			const filters: FilterCriteria = {
				dateFrom: dateFrom || undefined,
				dateTo: dateTo || undefined,
				resourceType: resourceType || undefined,
				employeeId: employeeId || undefined,
				employeeName: employeeName || undefined,
				action: (action as any) || undefined,
				isRollback: isRollback || undefined,
				searchTerm: searchTerm || undefined
			};

			onFilterChange(filters);
		}, delay);
	}

	function handleEmployeeSelect(employee: { id: string; full_name: string }) {
		employeeId = employee.id;
		employeeName = employee.full_name;
		employeeSearchTerm = employee.full_name;
		showEmployeeDropdown = false;
		emitFilters();
	}

	function handleResourceTypeSelect(type: string) {
		resourceType = type;
		resourceSearchTerm = type;
		showResourceDropdown = false;
		emitFilters();
	}

	function clearEmployeeFilter() {
		employeeId = '';
		employeeName = '';
		employeeSearchTerm = '';
		emitFilters();
	}

	function clearResourceTypeFilter() {
		resourceType = '';
		resourceSearchTerm = '';
		emitFilters();
	}

	function handleClearAll() {
		dateFrom = '';
		dateTo = '';
		resourceType = '';
		employeeId = '';
		employeeName = '';
		action = '';
		isRollback = false;
		searchTerm = '';
		employeeSearchTerm = '';
		resourceSearchTerm = '';

		if (onClear) {
			onClear();
		} else {
			emitFilters();
		}
	}

	function toggleAdvanced() {
		showAdvanced = !showAdvanced;
	}

	// Close dropdowns when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.autocomplete-container')) {
			showEmployeeDropdown = false;
			showResourceDropdown = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}
		};
	});
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<Filter class="h-5 w-5 text-muted-foreground" />
			<h3 class="text-lg font-semibold">Filters</h3>
			{#if activeFilterCount() > 0}
				<Badge variant="default">{activeFilterCount()}</Badge>
			{/if}
		</div>

		<div class="flex gap-2">
			{#if hasActiveFilters}
				<Button variant="outline" size="sm" onclick={handleClearAll}>
					<RotateCcw class="mr-2 h-4 w-4" />
					Clear All
				</Button>
			{/if}

			<Button variant="outline" size="sm" onclick={toggleAdvanced}>
				{showAdvanced ? 'Simple' : 'Advanced'}
			</Button>
		</div>
	</div>

	<!-- Search Bar -->
	<div class="relative">
		<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
		<Input
			type="text"
			bind:value={searchTerm}
			oninput={emitFilters}
			placeholder="Search logs by resource ID, action, or details..."
			class="pl-10 pr-10"
		/>
		{#if searchTerm}
			<button
				type="button"
				onclick={() => ((searchTerm = ''), emitFilters())}
				class="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 hover:bg-accent"
			>
				<X class="h-4 w-4 text-muted-foreground" />
			</button>
		{/if}
	</div>

	<!-- Quick Date Presets -->
	<div class="flex flex-wrap gap-2">
		{#each datePresets as preset}
			<Button variant="outline" size="sm" onclick={() => applyDatePreset(preset.days)}>
				{preset.label}
			</Button>
		{/each}
	</div>

	<!-- Basic Filters -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
		<!-- Date From -->
		<div class="space-y-2">
			<label for="date-from" class="text-sm font-medium">From Date</label>
			<div class="relative">
				<Calendar class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="date"
					id="date-from"
					bind:value={dateFrom}
					onchange={emitFilters}
					class="pl-10"
				/>
			</div>
		</div>

		<!-- Date To -->
		<div class="space-y-2">
			<label for="date-to" class="text-sm font-medium">To Date</label>
			<div class="relative">
				<Calendar class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input type="date" id="date-to" bind:value={dateTo} onchange={emitFilters} class="pl-10" />
			</div>
		</div>

		<!-- Action Type -->
		<div class="space-y-2">
			<label for="action" class="text-sm font-medium">Action Type</label>
			<select
				id="action"
				bind:value={action}
				onchange={emitFilters}
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<option value="">All Actions</option>
				<option value="CREATE">Create</option>
				<option value="READ">Read</option>
				<option value="UPDATE">Update</option>
				<option value="DELETE">Delete</option>
			</select>
		</div>

		<!-- Rollback Filter -->
		<div class="flex items-end pb-2">
			<label class="flex items-center gap-2 text-sm font-medium cursor-pointer">
				<input
					type="checkbox"
					bind:checked={isRollback}
					onchange={emitFilters}
					class="h-4 w-4 rounded border-input"
				/>
				<span>Rollback Only</span>
			</label>
		</div>
	</div>

	<!-- Advanced Filters -->
	{#if showAdvanced}
		<div class="space-y-4 border-t pt-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Resource Type Autocomplete -->
				<div class="space-y-2">
					<label for="resource-type" class="text-sm font-medium">Resource Type</label>
					<div class="autocomplete-container relative">
						<div class="relative">
							<Search
								class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								type="text"
								id="resource-type"
								bind:value={resourceSearchTerm}
								onfocus={() => (showResourceDropdown = true)}
								oninput={() => (showResourceDropdown = true)}
								placeholder="Search resource types..."
								class="pl-10 pr-10"
							/>
							{#if resourceType}
								<button
									type="button"
									onclick={clearResourceTypeFilter}
									class="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 hover:bg-accent"
								>
									<X class="h-4 w-4 text-muted-foreground" />
								</button>
							{/if}
						</div>

						{#if showResourceDropdown && filteredResourceTypes().length > 0}
							<div
								class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
							>
								{#each filteredResourceTypes() as type}
									<button
										type="button"
										onclick={() => handleResourceTypeSelect(type)}
										class="w-full px-3 py-2 text-left text-sm hover:bg-accent"
									>
										{type}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Employee Autocomplete -->
				<div class="space-y-2">
					<label for="employee" class="text-sm font-medium">Employee</label>
					<div class="autocomplete-container relative">
						<div class="relative">
							<Search
								class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								type="text"
								id="employee"
								bind:value={employeeSearchTerm}
								onfocus={() => (showEmployeeDropdown = true)}
								oninput={() => (showEmployeeDropdown = true)}
								placeholder="Search employees..."
								class="pl-10 pr-10"
							/>
							{#if employeeId}
								<button
									type="button"
									onclick={clearEmployeeFilter}
									class="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 hover:bg-accent"
								>
									<X class="h-4 w-4 text-muted-foreground" />
								</button>
							{/if}
						</div>

						{#if showEmployeeDropdown && filteredEmployees().length > 0}
							<div
								class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
							>
								{#each filteredEmployees() as employee}
									<button
										type="button"
										onclick={() => handleEmployeeSelect(employee)}
										class="w-full px-3 py-2 text-left text-sm hover:bg-accent"
									>
										{employee.full_name}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
