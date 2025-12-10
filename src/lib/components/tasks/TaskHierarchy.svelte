<!--
  TaskHierarchy Component
  Feature: 028-task-system-expansion - Task T029
  
  Recursive hierarchy visualization for parent-child task relationships
  - Tree structure with up to 3 levels of nesting
  - Expand/collapse functionality
  - Visual connection lines and indentation
  - Integration with TaskCard component
  - Click handlers for task selection
-->

<script lang="ts">
	import type { Task } from '$lib/types/task';
	import TaskCard from './TaskCard.svelte';
	import TaskHierarchy from './TaskHierarchy.svelte';
	import { ChevronDown, ChevronRight, GitBranch, Minus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		task: Task; // Root task with populated subtasks
		userId?: string;
		onTaskClick?: (taskId: string) => void;
		onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
		maxDepth?: number; // Maximum nesting depth (default: 3)
		currentDepth?: number; // Current depth level (for recursion tracking)
		showProgress?: boolean;
		compact?: boolean;
	}

	const {
		task,
		userId,
		onTaskClick,
		onStatusChange,
		maxDepth = 3,
		currentDepth = 0,
		showProgress = false,
		compact = false
	}: Props = $props();

	// State for expand/collapse
	let isExpanded = $state(currentDepth < 2); // Auto-expand first 2 levels

	// Derived state
	const hasSubtasks = $derived(task.subtasks && task.subtasks.length > 0);
	const canExpand = $derived(hasSubtasks && currentDepth < maxDepth);
	const subtasks = $derived(task.subtasks || []);
	const subtaskCount = $derived(task.subtasks?.length || 0);
	const completedSubtasks = $derived(subtasks.filter((t: Task) => t.status === 'DONE').length);

	// Calculate completion percentage for subtasks
	const completionPercentage = $derived(() => {
		if (subtaskCount === 0) return 0;
		return Math.round((completedSubtasks / subtaskCount) * 100);
	});

	// Toggle expand/collapse
	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	// Handle task click
	function handleTaskClick() {
		if (onTaskClick) {
			onTaskClick(task.id);
		}
	}

	// Handle status change
	function handleStatusChange(newStatus: Task['status']) {
		if (onStatusChange) {
			onStatusChange(task.id, newStatus);
		}
	}
</script>

<div class="task-hierarchy-node" data-depth={currentDepth}>
	<!-- Task Node -->
	<div class="flex items-start gap-2">
		<!-- Expand/Collapse Button -->
		{#if canExpand}
			<Button
				variant="ghost"
				size="sm"
				onclick={toggleExpanded}
				class="flex-shrink-0 h-8 w-8 p-0 hover:bg-muted"
				aria-label={isExpanded ? 'Collapse' : 'Expand'}
			>
				{#if isExpanded}
					<ChevronDown class="h-4 w-4 text-muted-foreground" />
				{:else}
					<ChevronRight class="h-4 w-4 text-muted-foreground" />
				{/if}
			</Button>
		{:else if currentDepth > 0}
			<!-- Placeholder for alignment when no expand button -->
			<div class="h-8 w-8 flex items-center justify-center flex-shrink-0">
				<Minus class="h-3 w-3 text-muted-foreground" />
			</div>
		{/if}

		<!-- Task Card -->
		<div class="flex-1">
			<TaskCard
				{task}
				{userId}
				onClick={handleTaskClick}
				onStatusChange={handleStatusChange}
				{showProgress}
				{compact}
				level={currentDepth}
			/>

			<!-- Subtask Summary Badge (shown when collapsed) -->
			{#if hasSubtasks && !isExpanded}
				<div class="mt-2 ml-2 flex items-center gap-2 text-sm text-muted-foreground">
					<GitBranch class="h-3 w-3" />
					<span>
						{subtaskCount} subtask{subtaskCount > 1 ? 's' : ''}
						({completedSubtasks} completed, {completionPercentage()}%)
					</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Subtasks (Recursive) -->
	{#if hasSubtasks && isExpanded && currentDepth < maxDepth}
		<div class="subtasks-container" class:has-connection-line={currentDepth > 0}>
			{#each subtasks as subtask (subtask.id)}
				<!-- Connection line indicator -->
				{#if currentDepth > 0}
					<div class="connection-line"></div>
				{/if}

				<!-- Recursive TaskHierarchy for subtask -->
				<TaskHierarchy
					task={subtask}
					{userId}
					{onTaskClick}
					{onStatusChange}
					{maxDepth}
					currentDepth={currentDepth + 1}
					{showProgress}
					{compact}
				/>
			{/each}
		</div>
	{/if}

	<!-- Max Depth Warning -->
	{#if hasSubtasks && currentDepth >= maxDepth}
		<div class="ml-10 mt-2 rounded-lg border border-warning bg-warning/10 p-3 text-sm text-warning">
			<div class="flex items-center gap-2">
				<GitBranch class="h-4 w-4 flex-shrink-0" />
				<span>
					Maximum nesting depth reached. This task has {subtaskCount} more subtask{subtaskCount > 1
						? 's'
						: ''}.
				</span>
			</div>
		</div>
	{/if}
</div>
