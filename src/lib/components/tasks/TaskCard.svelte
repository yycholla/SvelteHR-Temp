<script lang="ts">
	// TaskCard Component - Modern Compact Row Style
	import type { Task } from '$lib/types/task';
	import { formatDistance } from 'date-fns';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, Clock, MoreHorizontal } from '@lucide/svelte';

	interface Props {
		task: Task;
		userId?: string;
		onClick?: () => void;
		onStatusChange?: (newStatus: Task['status']) => void;
		compact?: boolean;
		showAssignee?: boolean;
		showDescription?: boolean;
		showProgress?: boolean;
		level?: number;
	}

	const { task, userId, onClick, onStatusChange, level = 0 }: Props = $props();

	// Simple derived values
	const isOverdue = $derived(
		task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE'
	);
	const isDueSoon = $derived(
		task.dueDate &&
			!isOverdue &&
			new Date(task.dueDate).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000
	);

	const dueDateDisplay = $derived(
		task.dueDate
			? isOverdue
				? `Overdue ${formatDistance(new Date(task.dueDate), new Date())}`
				: formatDistance(new Date(task.dueDate), new Date())
			: null
	);

	function handleClick() {
		if (onClick) onClick();
	}

	const statusColors = {
		TODO: 'bg-gray-500',
		IN_PROGRESS: 'bg-blue-500',
		REVIEW: 'bg-yellow-500',
		BLOCKED: 'bg-red-500',
		DONE: 'bg-green-500'
	};

	const statusOptions = [
		{ value: 'TODO', label: 'To Do', color: 'bg-gray-500' },
		{ value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
		{ value: 'REVIEW', label: 'Review', color: 'bg-yellow-500' },
		{ value: 'BLOCKED', label: 'Blocked', color: 'bg-red-500' },
		{ value: 'DONE', label: 'Done', color: 'bg-green-500' }
	];
</script>

<div
	class="group flex items-center gap-3 rounded-lg border border-transparent bg-background p-2.5 transition-all hover:border-border hover:shadow-sm cursor-pointer"
	style="margin-left: {level * 24}px"
	onclick={handleClick}
	onkeypress={(e) => e.key === 'Enter' && handleClick()}
	role="button"
	tabindex="0"
>
	<!-- Status Indicator / Action -->
	{#if onStatusChange}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="flex-shrink-0 focus:outline-none"
				onclick={(e) => e.stopPropagation()}
			>
				<div
					class="flex h-5 w-5 items-center justify-center rounded border border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors"
				>
					{#if task.status === 'DONE'}
						<div class="h-3.5 w-3.5 rounded-sm bg-green-500"></div>
					{:else}
						<div class="h-2 w-2 rounded-full {statusColors[task.status] || 'bg-gray-300'}"></div>
					{/if}
				</div>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start">
				{#each statusOptions as option}
					<DropdownMenu.Item
						onclick={(e) => {
							e.stopPropagation();
							onStatusChange(option.value);
						}}
					>
						<div class="flex items-center gap-2">
							<div class="h-2 w-2 rounded-full {option.color}"></div>
							<span>{option.label}</span>
						</div>
					</DropdownMenu.Item>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{:else}
		<div class="h-2 w-2 rounded-full {statusColors[task.status] || 'bg-gray-300'}"></div>
	{/if}

	<!-- Content -->
	<div class="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
		<span
			class="truncate text-sm font-medium text-foreground {task.status === 'DONE'
				? 'line-through text-muted-foreground'
				: ''}"
		>
			{task.title}
		</span>

		<div class="flex items-center gap-2 sm:ml-auto">
			<!-- Project/Type Tag -->
			{#if task.taskType}
				<span
					class="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
				>
					{task.taskType.name}
				</span>
			{/if}

			<!-- Priority Dot -->
			{#if task.priority === 'URGENT'}
				<span
					class="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/20"
				>
					<AlertCircle class="h-3 w-3" /> Urgent
				</span>
			{:else if task.priority === 'HIGH'}
				<span class="h-2 w-2 rounded-full bg-orange-500" title="High Priority"></span>
			{/if}
		</div>
	</div>

	<!-- Meta -->
	<div
		class="hidden items-center gap-4 sm:flex text-xs text-muted-foreground min-w-[120px] justify-end"
	>
		{#if dueDateDisplay}
			<div
				class="flex items-center gap-1 {isOverdue
					? 'text-red-600'
					: isDueSoon
						? 'text-orange-600'
						: ''}"
			>
				<Clock class="h-3.5 w-3.5" />
				{dueDateDisplay}
			</div>
		{/if}

		{#if task.assignee}
			<Avatar.Root class="h-6 w-6 border">
				<Avatar.Fallback class="text-[10px] bg-primary/10 text-primary">
					{task.assignee.display_name?.substring(0, 2).toUpperCase() || 'UN'}
				</Avatar.Fallback>
			</Avatar.Root>
		{/if}
	</div>

	<!-- Actions -->
	<Button
		variant="ghost"
		size="icon"
		class="h-7 w-7 opacity-0 group-hover:opacity-100"
		onclick={(e) => {
			e.stopPropagation(); /* Add menu trigger */
		}}
	>
		<MoreHorizontal class="h-4 w-4 text-muted-foreground" />
	</Button>
</div>
