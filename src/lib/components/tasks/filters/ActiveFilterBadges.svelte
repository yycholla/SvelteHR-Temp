<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Calendar, GitBranch, Search, Target, User, X } from '@lucide/svelte';
	import { format } from 'date-fns';
	import type { TaskFilterState } from './types';

	interface Props {
		filters: TaskFilterState;
		hasActiveFilters: boolean;
		availableAssignees: Array<{ id: string; displayName: string }>;
		availableTaskTypes: Array<{ id: string; name: string }>;
		onClearFilter: (key: keyof TaskFilterState) => void;
	}

	let {
		filters,
		hasActiveFilters,
		availableAssignees,
		availableTaskTypes,
		onClearFilter
	}: Props = $props();

	// Get assignee display name
	function getAssigneeName(id: string): string {
		return availableAssignees.find((a) => a.id === id)?.displayName || 'Unknown';
	}

	// Get task type name
	function getTaskTypeName(id: string): string {
		return availableTaskTypes.find((t) => t.id === id)?.name || 'Unknown';
	}
</script>

{#if hasActiveFilters}
	<div class="flex flex-wrap gap-2 pt-2 border-t">
		{#if filters.search}
			<Badge variant="secondary" class="flex items-center gap-1">
				<Search class="h-3 w-3" />
				Search: {filters.search}
				<button
					onclick={() => onClearFilter('search')}
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
					onclick={() => onClearFilter('statuses')}
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
					onclick={() => onClearFilter('priorities')}
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
					onclick={() => onClearFilter('assigneeId')}
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
					onclick={() => onClearFilter('taskTypeId')}
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
					onclick={() => onClearFilter('dueDateStart')}
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
					onclick={() => onClearFilter('hasParent')}
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
					onclick={() => onClearFilter('hasDependencies')}
					class="ml-1 hover:text-destructive transition-colors"
				>
					<X class="h-3 w-3" />
				</button>
			</Badge>
		{/if}
	</div>
{/if}
