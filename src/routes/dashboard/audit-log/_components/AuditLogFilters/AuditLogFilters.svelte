<!-- src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte -->
<script lang="ts">
	import type { FilterValues, AuditLogFiltersProps } from './filters.types';
	import * as Select from '$lib/components/ui/select';
	import * as Popover from '$lib/components/ui/popover';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';

	let {
		initialFilters = {},
		resourceTypes,
		onFilterChange,
		onClear
	}: AuditLogFiltersProps = $props();

	let filters = $state<FilterValues>(initialFilters);
	let resourceSearchQuery = $state('');
	let employeeSearchQuery = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	let filteredResourceTypes = $derived(
		resourceTypes.filter((rt) => rt.toLowerCase().includes(resourceSearchQuery.toLowerCase()))
	);

	function isValidAction(value: string): value is 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' {
		return ['CREATE', 'READ', 'UPDATE', 'DELETE'].includes(value);
	}

	function handleActionChange(value: string) {
		filters = {
			...filters,
			action: value === 'ALL' ? null : isValidAction(value) ? value : null
		};
		onFilterChange(filters);
	}

	function handleResourceTypeChange(value: string) {
		filters = { ...filters, resourceType: value || null };
		onFilterChange(filters);
	}

	function handleDateChange(field: 'startDate' | 'endDate', value: string) {
		filters = { ...filters, [field]: value || null };
		onFilterChange(filters);
	}

	function handleEmployeeSearch(value: string) {
		employeeSearchQuery = value;

		if (debounceTimer) clearTimeout(debounceTimer);

		debounceTimer = setTimeout(() => {
			filters = { ...filters, employeeId: value || null };
			onFilterChange(filters);
		}, 300);
	}

	function handleClearFilters() {
		filters = {};
		employeeSearchQuery = '';
		resourceSearchQuery = '';
		onClear();
	}
</script>

<div class="audit-log-filters space-y-4 p-4">
	<div class="filter-group">
		<label for="action-filter" class="block text-sm font-medium mb-2">Action Type</label>
		<Select.Root value={filters.action ?? 'ALL'} onValueChange={handleActionChange}>
			<Select.Trigger id="action-filter" class="w-full">
				<Select.Value placeholder="ALL" />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="ALL">ALL</Select.Item>
				<Select.Item value="CREATE">CREATE</Select.Item>
				<Select.Item value="READ">READ</Select.Item>
				<Select.Item value="UPDATE">UPDATE</Select.Item>
				<Select.Item value="DELETE">DELETE</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	<div class="filter-group">
		<label for="resource-filter" class="block text-sm font-medium mb-2">Resource Type</label>
		<Popover.Root>
			<Popover.Trigger asChild let:builder>
				<Button variant="outline" builders={[builder]} class="w-full justify-start">
					{filters.resourceType || 'Select resource type...'}
				</Button>
			</Popover.Trigger>
			<Popover.Content class="w-64">
				<Input type="text" placeholder="Search..." bind:value={resourceSearchQuery} class="mb-2" />
				<div class="max-h-48 overflow-y-auto">
					{#each filteredResourceTypes as rt}
						<button
							class="w-full text-left px-2 py-1 hover:bg-gray-100"
							onclick={() => handleResourceTypeChange(rt)}
						>
							{rt}
						</button>
					{/each}
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>

	<div class="filter-group">
		<label class="block text-sm font-medium mb-2">Date Range</label>
		<div class="flex gap-2">
			<Input
				type="date"
				placeholder="Start date"
				value={filters.startDate || ''}
				oninput={(e) => handleDateChange('startDate', e.currentTarget.value)}
			/>
			<Input
				type="date"
				placeholder="End date"
				value={filters.endDate || ''}
				oninput={(e) => handleDateChange('endDate', e.currentTarget.value)}
			/>
		</div>
		{#if filters.startDate && filters.endDate && filters.startDate > filters.endDate}
			<p class="text-red-500 text-sm mt-1">Start date must be before end date</p>
		{/if}
	</div>

	<div class="filter-group">
		<label for="employee-filter" class="block text-sm font-medium mb-2">Employee</label>
		<Input
			id="employee-filter"
			type="text"
			placeholder="Search by ID or name..."
			value={employeeSearchQuery}
			oninput={(e) => handleEmployeeSearch(e.currentTarget.value)}
		/>
	</div>

	<div class="filter-actions mt-4">
		<Button variant="outline" onclick={handleClearFilters} class="w-full">Clear Filters</Button>
	</div>
</div>
