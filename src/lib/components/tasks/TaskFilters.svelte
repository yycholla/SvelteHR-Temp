<!--
  TaskFilters Component
  Feature: 028-task-system-expansion - Task T034
  
  Advanced filtering UI component for task lists
  - Multiple filter criteria (status, priority, assignee, due date range, task type)
  - Search input for title/description
  - Active filter badges with individual clear buttons
  - Clear all filters button
  - Filter count indicator
  - Compact and expanded modes
  - Export filter state for URL params or persistence
-->

<script lang="ts">
	import type { Task, TaskPriority, TaskStatus } from '$lib/types/task';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as NativeSelect from '$lib/components/ui/native-select';
	import * as Popover from '$lib/components/ui/popover';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		AlertCircle,
		Calendar,
		CheckCircle,
		ChevronDown,
		Clock,
		Filter,
		GitBranch,
		Search,
		Target,
		User,
		X,
		XCircle
	} from '@lucide/svelte';
	import { format } from 'date-fns';

	// Filter state interface
	export interface TaskFilterState {
		search: string;
		statuses: TaskStatus[];
		priorities: TaskPriority[];
		assigneeId: string | null;
		taskTypeId: string | null;
		dueDateStart: string | null;
		dueDateEnd: string | null;
		hasParent: boolean | null; // null = all, true = subtasks only, false = top-level only
		hasDependencies: boolean | null; // null = all, true = with deps, false = without deps
	}

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

	// Status options - NOTE: Using GraphQL enum format (SCREAMING_SNAKE_CASE)
	const statusOptions: Array<{ value: TaskStatus; label: string; icon: any; color: string }> = [
		{
			value: 'TODO',
			label: 'To Do',
			icon: Clock,
			color: 'text-amber-600'
		},
		{
			value: 'IN_PROGRESS',
			label: 'In Progress',
			icon: CheckCircle,
			color: 'text-blue-600'
		},
		{
			value: 'BLOCKED',
			label: 'Blocked',
			icon: AlertCircle,
			color: 'text-red-600'
		},
		{
			value: 'REVIEW',
			label: 'Deferred',
			icon: XCircle,
			color: 'text-gray-600'
		},
		{
			value: 'DONE',
			label: 'Completed',
			icon: CheckCircle,
			color: 'text-green-600'
		}
	];

	// Priority options - NOTE: Using GraphQL enum format (SCREAMING_SNAKE_CASE)
	const priorityOptions: Array<{ value: TaskPriority; label: string; color: string }> = [
		{ value: 'LOW', label: 'Low', color: 'bg-gray-500' },
		{ value: 'MEDIUM', label: 'Medium', color: 'bg-blue-500' },
		{ value: 'HIGH', label: 'High', color: 'bg-orange-500' },
		{ value: 'URGENT', label: 'Urgent', color: 'bg-red-500' }
	];

	// Calculate active filter count
	const activeFilterCount = $derived(() => {
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
	const hasActiveFilters = $derived(activeFilterCount() > 0);

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

	// Get assignee display name
	function getAssigneeName(id: string): string {
		return availableAssignees.find((a) => a.id === id)?.display_name || 'Unknown';
	}

	// Get task type name
	function getTaskTypeName(id: string): string {
		return availableTaskTypes.find((t) => t.id === id)?.name || 'Unknown';
	}
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4">
	<!-- Filter Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Filter class="h-4 w-4 text-primary" />
			<span class="font-medium">Filters</span>
			{#if hasActiveFilters}
				<Badge variant="secondary">{activeFilterCount()}</Badge>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if hasActiveFilters}
				<Button size="sm" variant="ghost" onclick={clearAllFilters}>
					<X class="mr-1 h-3 w-3" />
					Clear All
				</Button>
			{/if}
			{#if compact}
				<Button size="sm" variant="ghost" onclick={toggleExpanded}>
					<ChevronDown class="h-4 w-4 transition-transform {isExpanded ? 'rotate-180' : ''}" />
				</Button>
			{/if}
		</div>
	</div>

	<!-- Filter Content -->
	{#if isExpanded}
		<div class="space-y-4">
			<!-- Search - Full Width -->
			<div class="space-y-2">
				<Label for="search">Search</Label>
				<div class="relative">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						id="search"
						type="text"
						placeholder="Search tasks by title or description..."
						value={filters.search}
						oninput={(e) => updateSearch(e.currentTarget.value)}
						class="pl-9"
					/>
				</div>
			</div>

			<!-- Status and Priority in Grid -->
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Status Filter -->
				<div class="space-y-2">
					<Label>Status</Label>
					<div class="grid grid-cols-2 gap-2">
						{#each statusOptions as option}
							{@const StatusIcon = option.icon}
							<label
								class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
								class:bg-accent={filters.statuses.includes(option.value)}
							>
								<Checkbox
									checked={filters.statuses.includes(option.value)}
									onCheckedChange={() => toggleStatus(option.value)}
								/>
								<div class="flex items-center gap-1.5 flex-1 min-w-0">
									<StatusIcon class="h-3 w-3 flex-shrink-0 {option.color}" />
									<span class="text-sm truncate">{option.label}</span>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<!-- Priority Filter -->
				<div class="space-y-2">
					<Label>Priority</Label>
					<div class="grid grid-cols-2 gap-2">
						{#each priorityOptions as option}
							<label
								class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
								class:bg-accent={filters.priorities.includes(option.value)}
							>
								<Checkbox
									checked={filters.priorities.includes(option.value)}
									onCheckedChange={() => togglePriority(option.value)}
								/>
								<div class="flex items-center gap-1.5 flex-1 min-w-0">
									<div class="h-2 w-2 rounded-full flex-shrink-0 {option.color}"></div>
									<span class="text-sm truncate">{option.label}</span>
								</div>
							</label>
						{/each}
					</div>
				</div>
			</div>

			<!-- Assignee and Task Type in Grid -->
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Assignee Filter -->
				<div class="space-y-2">
					<Label for="assignee">Assignee</Label>
					<NativeSelect.Root
						value={filters.assigneeId || ''}
						onchange={(e) => updateAssignee(e.currentTarget.value || null)}
					>
						<NativeSelect.Option value="">All assignees</NativeSelect.Option>
						{#each availableAssignees as assignee}
							<NativeSelect.Option value={assignee.id}>{assignee.display_name}</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
				</div>

				<!-- Task Type Filter -->
				<div class="space-y-2">
					<Label for="taskType">Task Type</Label>
					<NativeSelect.Root
						value={filters.taskTypeId || ''}
						onchange={(e) => updateTaskType(e.currentTarget.value || null)}
					>
						<NativeSelect.Option value="">All types</NativeSelect.Option>
						{#each availableTaskTypes as type}
							<NativeSelect.Option value={type.id}>{type.name}</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
				</div>
			</div>

			<!-- Due Date Range -->
			<div class="space-y-2">
				<Label>Due Date Range</Label>
				<div class="grid grid-cols-2 gap-2">
					<div class="space-y-1.5">
						<Label for="startDate" class="text-xs text-muted-foreground">From</Label>
						<Input
							id="startDate"
							type="date"
							value={filters.dueDateStart || ''}
							oninput={(e) => updateDateRange(e.currentTarget.value || null, filters.dueDateEnd)}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="endDate" class="text-xs text-muted-foreground">To</Label>
						<Input
							id="endDate"
							type="date"
							value={filters.dueDateEnd || ''}
							oninput={(e) => updateDateRange(filters.dueDateStart, e.currentTarget.value || null)}
						/>
					</div>
				</div>
			</div>

			<!-- Advanced Filters -->
			{#if showAdvanced}
				<Popover.Root bind:open={isAdvancedOpen}>
					<Popover.Trigger class="w-full">
						<Button variant="outline" size="sm" class="w-full">
							<Filter class="mr-2 h-3 w-3" />
							Advanced Filters
							<ChevronDown class="ml-auto h-3 w-3" />
						</Button>
					</Popover.Trigger>
					<Popover.Content class="w-80">
						<div class="space-y-4">
							<h4 class="font-medium">Advanced Options</h4>

							<!-- Hierarchy Filter -->
							<div class="space-y-2">
								<Label>Task Hierarchy</Label>
								<div class="space-y-2">
									<label
										class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
										class:bg-accent={filters.hasParent === null}
									>
										<Checkbox
											checked={filters.hasParent === null}
											onCheckedChange={() => updateHasParent(null)}
										/>
										<span class="text-sm">All tasks</span>
									</label>
									<label
										class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
										class:bg-accent={filters.hasParent === false}
									>
										<Checkbox
											checked={filters.hasParent === false}
											onCheckedChange={() => updateHasParent(false)}
										/>
										<span class="text-sm">Top-level tasks only</span>
									</label>
									<label
										class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
										class:bg-accent={filters.hasParent === true}
									>
										<Checkbox
											checked={filters.hasParent === true}
											onCheckedChange={() => updateHasParent(true)}
										/>
										<span class="text-sm">Subtasks only</span>
									</label>
								</div>
							</div>

							<!-- Dependencies Filter -->
							<div class="space-y-2">
								<Label>Dependencies</Label>
								<div class="space-y-2">
									<label
										class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
										class:bg-accent={filters.hasDependencies === null}
									>
										<Checkbox
											checked={filters.hasDependencies === null}
											onCheckedChange={() => updateHasDependencies(null)}
										/>
										<span class="text-sm">All tasks</span>
									</label>
									<label
										class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
										class:bg-accent={filters.hasDependencies === true}
									>
										<Checkbox
											checked={filters.hasDependencies === true}
											onCheckedChange={() => updateHasDependencies(true)}
										/>
										<div class="flex items-center gap-1.5">
											<GitBranch class="h-3 w-3" />
											<span class="text-sm">With dependencies</span>
										</div>
									</label>
									<label
										class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
										class:bg-accent={filters.hasDependencies === false}
									>
										<Checkbox
											checked={filters.hasDependencies === false}
											onCheckedChange={() => updateHasDependencies(false)}
										/>
										<span class="text-sm">Without dependencies</span>
									</label>
								</div>
							</div>
						</div>
					</Popover.Content>
				</Popover.Root>
			{/if}
		</div>

		<!-- Active Filter Badges -->
		{#if hasActiveFilters}
			<div class="flex flex-wrap gap-2 pt-2 border-t">
				{#if filters.search}
					<Badge variant="secondary" class="flex items-center gap-1">
						<Search class="h-3 w-3" />
						Search: {filters.search}
						<button
							onclick={() => clearFilter('search')}
							class="ml-1 hover:text-destructive transition-colors"
						>
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if filters.statuses.length > 0}
					<Badge variant="secondary" class="flex items-center gap-1">
						Status: {filters.statuses.join(', ')}
						<button
							onclick={() => clearFilter('statuses')}
							class="ml-1 hover:text-destructive transition-colors"
						>
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if filters.priorities.length > 0}
					<Badge variant="secondary" class="flex items-center gap-1">
						Priority: {filters.priorities.join(', ')}
						<button
							onclick={() => clearFilter('priorities')}
							class="ml-1 hover:text-destructive transition-colors"
						>
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if filters.assigneeId}
					<Badge variant="secondary" class="flex items-center gap-1">
						<User class="h-3 w-3" />
						{getAssigneeName(filters.assigneeId)}
						<button
							onclick={() => clearFilter('assigneeId')}
							class="ml-1 hover:text-destructive transition-colors"
						>
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if filters.taskTypeId}
					<Badge variant="secondary" class="flex items-center gap-1">
						<Target class="h-3 w-3" />
						{getTaskTypeName(filters.taskTypeId)}
						<button
							onclick={() => clearFilter('taskTypeId')}
							class="ml-1 hover:text-destructive transition-colors"
						>
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if filters.dueDateStart || filters.dueDateEnd}
					<Badge variant="secondary" class="flex items-center gap-1">
						<Calendar class="h-3 w-3" />
						{filters.dueDateStart ? format(new Date(filters.dueDateStart), 'MMM d') : 'Start'}
						-
						{filters.dueDateEnd ? format(new Date(filters.dueDateEnd), 'MMM d') : 'End'}
						<button
							onclick={() => clearFilter('dueDateStart')}
							class="ml-1 hover:text-destructive transition-colors"
						>
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if filters.hasParent !== null}
					<Badge variant="secondary" class="flex items-center gap-1">
						{filters.hasParent ? 'Subtasks only' : 'Top-level only'}
						<button
							onclick={() => clearFilter('hasParent')}
							class="ml-1 hover:text-destructive transition-colors"
						>
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}

				{#if filters.hasDependencies !== null}
					<Badge variant="secondary" class="flex items-center gap-1">
						<GitBranch class="h-3 w-3" />
						{filters.hasDependencies ? 'With dependencies' : 'Without dependencies'}
						<button
							onclick={() => clearFilter('hasDependencies')}
							class="ml-1 hover:text-destructive transition-colors"
						>
							<X class="h-3 w-3" />
						</button>
					</Badge>
				{/if}
			</div>
		{/if}
	{/if}
</div>
