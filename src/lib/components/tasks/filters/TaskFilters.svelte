<script lang="ts">
	import type { TaskPriority, TaskStatus } from '$lib/types/task';
	import type { TaskFilterState } from './types';

	// Import sub-components
	import FilterHeader from './FilterHeader.svelte';
	import SearchFilter from './SearchFilter.svelte';
	import StatusPriorityFilter from './StatusPriorityFilter.svelte';
	import AssigneeTypeFilter from './AssigneeTypeFilter.svelte';
	import DateRangeFilter from './DateRangeFilter.svelte';
	import AdvancedFilters from './AdvancedFilters.svelte';
	import ActiveFilterBadges from './ActiveFilterBadges.svelte';

	interface Props {
		filters: TaskFilterState;
		onFiltersChange: (filters: TaskFilterState) => void;
		availableAssignees?: Array<{ id: string; displayName: string }>;
		availableTaskTypes?: Array<{ id: string; name: string }>;
		compact?: boolean;
		showAdvanced?: boolean;
	}

	const {
		filters,
		onFiltersChange,
		availableAssignees = [],
		availableTaskTypes = [],
		compact = false,
		showAdvanced = true
	}: Props = $props();

	// Local state
	let isExpanded = $state(!compact);
	let isAdvancedOpen = $state(false);

	// Calculate active filter count
	const activeFilterCount = $derived.by(() => {
		let count = 0;
		if (filters.search) count++;
		if (filters.statuses.length > 0) count++;
		if (filters.priorities.length > 0) count++;
		if (filters.assigneeId) count++;
		if (filters.taskTypeId) count++;
		if (filters.dueDateStart || filters.dueDateEnd) count++;
		if (filters.hasParent !== null) count++;
		if (filters.hasDependencies !== null) count++;
		return count;
	});

	// Check if any filters are active
	const hasActiveFilters = $derived(activeFilterCount > 0);

	// Toggle expanded state
	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	// Update search
	function updateSearch(value: string) {
		onFiltersChange({ ...filters, search: value });
	}

	// Toggle status filter
	function toggleStatus(status: TaskStatus) {
		const statuses = filters.statuses.includes(status)
			? filters.statuses.filter((s) => s !== status)
			: [...filters.statuses, status];
		onFiltersChange({ ...filters, statuses });
	}

	// Toggle priority filter
	function togglePriority(priority: TaskPriority) {
		const priorities = filters.priorities.includes(priority)
			? filters.priorities.filter((p) => p !== priority)
			: [...filters.priorities, priority];
		onFiltersChange({ ...filters, priorities });
	}

	// Update assignee filter
	function updateAssignee(assigneeId: string | null) {
		onFiltersChange({ ...filters, assigneeId });
	}

	// Update task type filter
	function updateTaskType(taskTypeId: string | null) {
		onFiltersChange({ ...filters, taskTypeId });
	}

	// Update date range
	function updateDateRange(start: string | null, end: string | null) {
		onFiltersChange({ ...filters, dueDateStart: start, dueDateEnd: end });
	}

	// Update hierarchy filter
	function updateHasParent(value: boolean | null) {
		onFiltersChange({ ...filters, hasParent: value });
	}

	// Update dependencies filter
	function updateHasDependencies(value: boolean | null) {
		onFiltersChange({ ...filters, hasDependencies: value });
	}

	// Clear all filters
	function clearAllFilters() {
		onFiltersChange({
			search: '',
			statuses: [],
			priorities: [],
			assigneeId: null,
			taskTypeId: null,
			dueDateStart: null,
			dueDateEnd: null,
			hasParent: null,
			hasDependencies: null
		});
	}

	// Clear individual filter
	function clearFilter(filterKey: keyof TaskFilterState) {
		switch (filterKey) {
			case 'search':
				updateSearch('');
				break;
			case 'statuses':
				onFiltersChange({ ...filters, statuses: [] });
				break;
			case 'priorities':
				onFiltersChange({ ...filters, priorities: [] });
				break;
			case 'assigneeId':
				updateAssignee(null);
				break;
			case 'taskTypeId':
				updateTaskType(null);
				break;
			case 'dueDateStart':
			case 'dueDateEnd':
				updateDateRange(null, null);
				break;
			case 'hasParent':
				updateHasParent(null);
				break;
			case 'hasDependencies':
				updateHasDependencies(null);
				break;
		}
	}
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4">
	<!-- Filter Header -->
	<FilterHeader
		{hasActiveFilters}
		{activeFilterCount}
		{compact}
		{isExpanded}
		onClearAll={clearAllFilters}
		onToggleExpanded={toggleExpanded}
	/>

	<!-- Filter Content -->
	{#if isExpanded}
		<div class="space-y-4">
			<!-- Search - Full Width -->
			<SearchFilter search={filters.search} onSearchChange={updateSearch} />

			<!-- Status and Priority in Grid -->
			<StatusPriorityFilter
				statuses={filters.statuses}
				priorities={filters.priorities}
				onToggleStatus={toggleStatus}
				onTogglePriority={togglePriority}
			/>

			<!-- Assignee and Task Type in Grid -->
			<AssigneeTypeFilter
				assigneeId={filters.assigneeId}
				taskTypeId={filters.taskTypeId}
				{availableAssignees}
				{availableTaskTypes}
				onUpdateAssignee={updateAssignee}
				onUpdateTaskType={updateTaskType}
			/>

			<!-- Due Date Range -->
			<DateRangeFilter
				dueDateStart={filters.dueDateStart}
				dueDateEnd={filters.dueDateEnd}
				onUpdateDateRange={updateDateRange}
			/>

			<!-- Advanced Filters -->
			<AdvancedFilters
				hasParent={filters.hasParent}
				hasDependencies={filters.hasDependencies}
				{showAdvanced}
				bind:isAdvancedOpen
				onUpdateHasParent={updateHasParent}
				onUpdateHasDependencies={updateHasDependencies}
			/>
		</div>

		<!-- Active Filter Badges -->
		<ActiveFilterBadges
			{filters}
			{hasActiveFilters}
			{availableAssignees}
			{availableTaskTypes}
			onClearFilter={clearFilter}
		/>
	{/if}
</div>
