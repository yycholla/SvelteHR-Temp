<script lang="ts">
	// TaskCard Component
	// Feature: 028-task-system-expansion - Task T026 (Enhanced from 019-we-need-to)
	// Purpose: Display task summary with status badges, hierarchy, progress, and dependencies

	import type { Task } from '$lib/types/task';
	import {
		getTaskStatusColor,
		getTaskPriorityColor,
		isTaskOverdue
	} from '$lib/graphql/tasks-operations';
	import { formatDistance } from 'date-fns';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	interface Props {
		task: Task;
		userId?: string;
		onClick?: () => void;
		onStatusChange?: (newStatus: Task['status']) => void;
		compact?: boolean;
		showAssignee?: boolean;
		showDescription?: boolean;
		showProgress?: boolean;
		level?: number; // For hierarchical display (indentation)
	}

	let {
		task,
		userId,
		onClick,
		onStatusChange,
		compact = false,
		showAssignee = true,
		showDescription = true,
		showProgress = false,
		level = 0
	}: Props = $props();

	// Derived state
	let isOverdue = $derived(isTaskOverdue(task));
	let isAssignedToUser = $derived(userId ? task.assigneeId === userId : false);
	let isCreatedByUser = $derived(userId ? task.creatorId === userId : false);
	let statusColor = $derived(getTaskStatusColor(task.status));
	let priorityColor = $derived(getTaskPriorityColor(task.priority));
	let hasSubtasks = $derived(task.subtasks && task.subtasks.length > 0);
	let hasDependencies = $derived(false); // Backend not implemented yet
	let hasLinkedResources = $derived(false); // Backend not implemented yet

	let isDueSoon = $derived(() => {
		if (!task.dueDate || isOverdue) return false;
		const dueDate = new Date(task.dueDate);
		const now = new Date();
		const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		return daysUntilDue <= 3 && daysUntilDue > 0;
	});

	let dueDateDisplay = $derived(
		task.dueDate
			? isOverdue
				? `Overdue by ${formatDistance(new Date(task.dueDate), new Date())}`
				: `Due ${formatDistance(new Date(), new Date(task.dueDate))}`
			: null
	);

	let subtaskProgress = $derived(() => {
		if (!hasSubtasks || !task.subtasks) return null;
		const subtasks = task.subtasks || [];
		return {
			total: subtasks.length,
			completed: subtasks.filter((t: any) => t.status === 'Done').length
		};
	});

	let progressPercentage = $derived(() => {
		const progress = subtaskProgress();
		return progress ? Math.round((progress.completed / progress.total) * 100) : 0;
	});

	function handleClick() {
		if (onClick) {
			onClick();
		}
	}

	function handleKeyPress(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && onClick) {
			e.preventDefault();
			onClick();
		}
	}

	// Status options with display labels and colors
	const statusOptions = [
		{ value: 'TODO', label: 'To Do', icon: 'circle' },
		{ value: 'IN_PROGRESS', label: 'In Progress', icon: 'circle-dot' },
		{ value: 'REVIEW', label: 'Review', icon: 'eye' },
		{ value: 'BLOCKED', label: 'Blocked', icon: 'x-circle' },
		{ value: 'DONE', label: 'Done', icon: 'check-circle' }
	];

	function handleStatusChange(newStatus: Task['status']) {
		if (onStatusChange) {
			onStatusChange(newStatus);
		}
	}

	// Get status icon SVG
	function getStatusIconSVG(status: Task['status']) {
		switch (status) {
			case 'DONE':
				return '<svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>';
			case 'IN_PROGRESS':
				return '<svg class="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd" /><circle cx="10" cy="10" r="3" fill="currentColor" /></svg>';
			case 'REVIEW':
				return '<svg class="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>';
			case 'BLOCKED':
				return '<svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>';
			default: // TODO
				return '<svg class="h-5 w-5 text-muted-foreground hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke-width="2" /></svg>';
		}
	}
</script>

<div
	class="task-card group relative rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
	class:cursor-pointer={onClick}
	class:hover:border-primary={onClick}
	class:compact
	class:overdue={isOverdue}
	class:assigned-to-user={isAssignedToUser}
	class:opacity-60={task.status === 'DONE' || task.status === 'REVIEW'}
	style="margin-left: {level * 24}px"
	role={onClick ? 'button' : 'article'}
	{...onClick ? { tabindex: 0 } : {}}
	onclick={handleClick}
	onkeypress={handleKeyPress}
	data-testid="task-card"
>
	<!-- Priority Indicator Strip -->
	<div class="absolute left-0 top-0 h-full w-1 rounded-l-lg {priorityColor}"></div>

	<div class="pl-3">
		<!-- Task Header -->
		<div class="mb-2 flex items-start justify-between gap-3">
			<div class="flex flex-1 items-start gap-3">
				<!-- Status Dropdown -->
				{#if onStatusChange}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="mt-0.5 flex-shrink-0 transition-transform hover:scale-110 focus:outline-none"
							onclick={(e) => e.stopPropagation()}
							aria-label="Change task status"
						>
								{#if task.status === 'DONE'}
									<svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
									</svg>
								{:else if task.status === 'IN_PROGRESS'}
									<svg class="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd" />
										<circle cx="10" cy="10" r="3" fill="currentColor" />
									</svg>
								{:else if task.status === 'REVIEW'}
									<svg class="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
										<path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
										<path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
									</svg>
								{:else if task.status === 'BLOCKED'}
									<svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
									</svg>
								{:else}
									<svg class="h-5 w-5 text-muted-foreground hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 20 20">
										<circle cx="10" cy="10" r="8" stroke-width="2" />
									</svg>
								{/if}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="start" class="w-48">
							<DropdownMenu.Label>Change Status</DropdownMenu.Label>
							<DropdownMenu.Separator />
							{#each statusOptions as statusOption}
								<DropdownMenu.Item
									onclick={(e) => {
										e.stopPropagation();
										handleStatusChange(statusOption.value as Task['status']);
									}}
									class="flex items-center gap-2"
									disabled={task.status === statusOption.value}
								>
									{#if statusOption.value === 'DONE'}
										<svg class="h-4 w-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
										</svg>
									{:else if statusOption.value === 'IN_PROGRESS'}
										<svg class="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd" />
											<circle cx="10" cy="10" r="3" fill="currentColor" />
										</svg>
									{:else if statusOption.value === 'REVIEW'}
										<svg class="h-4 w-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
											<path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
											<path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
										</svg>
									{:else if statusOption.value === 'BLOCKED'}
										<svg class="h-4 w-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
										</svg>
									{:else}
										<svg class="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 20 20">
											<circle cx="10" cy="10" r="8" stroke-width="2" />
										</svg>
									{/if}
									<span class="flex-1">{statusOption.label}</span>
									{#if task.status === statusOption.value}
										<svg class="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
										</svg>
									{/if}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}

				<!-- Title and Badges -->
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<h3
							class="text-base font-semibold text-foreground group-hover:text-primary"
							class:line-through={task.status === 'DONE' || task.status === 'REVIEW'}
						>
							{task.title}
						</h3>

						{#if task.requiresManualReassignment}
							<span class="inline-flex items-center rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
								⚠️ Needs Reassignment
							</span>
						{/if}
					</div>

					{#if !compact}
						<div class="mt-1.5 flex flex-wrap items-center gap-2">
							<!-- Status Badge -->
							<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium {statusColor}">
								<span>{task.status}</span>
							</span>

							<!-- Priority Badge -->
							<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium {priorityColor}">
								<span>{task.priority}</span>
							</span>

							<!-- Task Type Badge -->
							{#if task.taskType}
								<span class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
									{task.taskType.name}
								</span>
							{/if}

							<!-- Overdue Badge -->
							{#if isOverdue}
								<span class="inline-flex items-center gap-1 rounded-full bg-destructive/20 px-2.5 py-0.5 text-xs font-medium text-destructive">
									⚠️ Overdue
								</span>
							{:else if isDueSoon()}
								<span class="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning">
									⏰ Due Soon
								</span>
							{/if}

							<!-- Subtasks Badge -->
							{#if hasSubtasks}
								{@const progress = subtaskProgress()}
								<span class="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
									📋 {progress?.completed}/{progress?.total} subtasks
								</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- User Badges -->
			<div class="ml-4 flex flex-col gap-1 items-end">
				{#if isAssignedToUser}
					<span class="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
						Assigned to you
					</span>
				{/if}
				{#if isCreatedByUser}
					<span class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
						Created by you
					</span>
				{/if}
			</div>
		</div>

		<!-- Task Description -->
		{#if showDescription && task.description && !compact}
			<div class="mb-3 text-sm text-muted-foreground">
				<p class="line-clamp-2">{task.description}</p>
			</div>
		{/if}

		<!-- Due Date -->
		{#if dueDateDisplay}
			<div class="mb-2 flex items-center text-sm" class:text-destructive={isOverdue} class:text-foreground={!isOverdue}>
				<svg class="mr-2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<span>{dueDateDisplay}</span>
			</div>
		{/if}

		<!-- Subtask Progress Bar -->
		{#if showProgress && hasSubtasks}
			{@const progress = subtaskProgress()}
			{@const percentage = progressPercentage()}
			<div class="mb-3">
				<div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
					<span>Subtask Progress</span>
					<span>{percentage}%</span>
				</div>
				<div class="w-full bg-muted rounded-full h-2">
					<div
						class="bg-primary h-2 rounded-full transition-all"
						style="width: {percentage}%"
					></div>
				</div>
			</div>
		{/if}

		<!-- Task Footer -->
		{#if !compact}
			<div class="flex items-center justify-between border-t pt-3">
				<!-- Assignment (Department or User) -->
				{#if showAssignee}
					{#if task.department}
						<!-- Department Task -->
						<div class="flex items-center text-sm text-muted-foreground">
							<svg class="mr-1.5 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
							<span>Assigned to <span class="font-medium text-foreground">{task.department.name}</span></span>
						</div>
					{:else if task.assignee}
						<!-- User Task -->
						<div class="flex items-center text-sm text-muted-foreground">
							<svg class="mr-1.5 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							<span>Assigned to <span class="font-medium text-foreground">{task.assignee.displayName}</span></span>
						</div>
					{/if}
				{/if}

				<!-- Creator -->
				{#if task.creator}
					<div class="flex items-center text-sm text-muted-foreground">
						<span>Created by <span class="font-medium text-foreground">{task.creator.displayName}</span></span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Dependencies Indicator -->
		{#if hasDependencies}
			<div class="mt-2 flex items-center text-xs text-muted-foreground">
				<svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
				</svg>
				<span>Blocked by {task.taskDependenciesByBlockedTaskId.nodes.length} task{task.taskDependenciesByBlockedTaskId.nodes.length > 1 ? 's' : ''}</span>
			</div>
		{/if}

		<!-- Linked Resources Indicator -->
		{#if hasLinkedResources}
			<div class="mt-2 flex items-center text-xs text-muted-foreground">
				<svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
				</svg>
				<span>{task.linkedResourcesByTaskId.nodes.length} linked resource{task.linkedResourcesByTaskId.nodes.length > 1 ? 's' : ''}</span>
			</div>
		{/if}
	</div>
</div>


