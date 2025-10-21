<!--
  Task Details Page
  Feature: 028-task-system-expansion - Task T038

  Comprehensive task detail view with all components
  - Task information display
  - Subtask hierarchy
  - Dependencies management
  - Audit trail
  - Linked resources
  - Quick actions
-->

<script lang="ts">
	import type { PageData } from './$types';
	import type { Task, TaskStatus } from '$lib/types/task';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import TaskHierarchy from '$lib/components/tasks/TaskHierarchy.svelte';
	import TaskDependencies from '$lib/components/tasks/TaskDependencies.svelte';
	import TaskAuditTrail from '$lib/components/tasks/TaskAuditTrail.svelte';
	import LinkedResources from '$lib/components/tasks/LinkedResources.svelte';
	import SubtaskProgress from '$lib/components/tasks/SubtaskProgress.svelte';
	import {
		Edit,
		ArrowLeft,
		CheckCircle,
		Clock,
		AlertCircle,
		Calendar,
		User,
		Target,
		Building,
		Bell
	} from 'lucide-svelte';
	import { format } from 'date-fns';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Get task data
	let task = $derived(data.task);

	// Status configuration
	// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
	const statusConfig = {
		'TO_DO': {
			icon: Clock,
			color: 'text-amber-600',
			bgColor: 'bg-amber-100 dark:bg-amber-900/30'
		},
		'IN_PROGRESS': {
			icon: CheckCircle,
			color: 'text-blue-600',
			bgColor: 'bg-blue-100 dark:bg-blue-900/30'
		},
		'BLOCKED': {
			icon: AlertCircle,
			color: 'text-red-600',
			bgColor: 'bg-red-100 dark:bg-red-900/30'
		},
		'COMPLETED': {
			icon: CheckCircle,
			color: 'text-green-600',
			bgColor: 'bg-green-100 dark:bg-green-900/30'
		},
		'DEFERRED': {
			icon: Clock,
			color: 'text-gray-500',
			bgColor: 'bg-gray-100 dark:bg-gray-900/30'
		}
	};

	// Priority colors
	// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
	const priorityColors = {
		'LOW': 'bg-gray-500',
		'MEDIUM': 'bg-blue-500',
		'HIGH': 'bg-orange-500',
		'URGENT': 'bg-red-500'
	};

	// Handle navigation
	function handleBackClick() {
		goto('/dashboard/tasks');
	}

	function handleEditClick() {
		goto(`/dashboard/tasks/${task.id}/edit`);
	}

	// Handle status change (placeholder for now)
	function handleStatusChange(taskId: string, newStatus: TaskStatus) {
		console.log('[Task Details] Status change:', taskId, newStatus);
		// TODO: Implement status update mutation
	}

	// Handle dependency operations
	async function handleAddDependency(blockingTaskId: string, blockedTaskId: string) {
		console.log('[Task Details] Add dependency:', blockingTaskId, blockedTaskId);
		// TODO: Implement add dependency mutation
	}

	async function handleRemoveDependency(dependencyId: string) {
		console.log('[Task Details] Remove dependency:', dependencyId);
		// TODO: Implement remove dependency mutation
	}

	// Handle resource operations
	async function handleAddResource(resourceType: any, resourceId: string, resourceTitle: string) {
		console.log('[Task Details] Add resource:', resourceType, resourceId, resourceTitle);
		// TODO: Implement add resource mutation
	}

	async function handleRemoveResource(resourceId: string) {
		console.log('[Task Details] Remove resource:', resourceId);
		// TODO: Implement remove resource mutation
	}

	// Format date
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Not set';
		return format(new Date(dateString), 'MMM d, yyyy h:mm a');
	}

	// Format reminder time
	function formatReminderTime(minutes: number | null): string {
		if (!minutes) return 'None';
		const hours = minutes / 60;
		const days = minutes / 1440;
		
		if (minutes < 60) {
			return `${minutes} minutes before`;
		} else if (hours < 24) {
			const hourValue = hours | 0; // floor
			return `${hourValue} hours before`;
		} else {
			const dayValue = days | 0; // floor
			return `${dayValue} days before`;
		}
	}

	// Get status config
	let statusConfigForTask = $derived(statusConfig[task.status as keyof typeof statusConfig]);
</script>

<svelte:head>
	<title>{task.title} - Task Details - SvelteHR</title>
	<meta name="description" content={task.description || 'Task details'} />
</svelte:head>

<div class="task-details-page">
	<!-- Page Header -->
	<div class="page-header">
		<Button variant="ghost" size="sm" onclick={handleBackClick}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Tasks
		</Button>

		<Button onclick={handleEditClick}>
			<Edit class="mr-2 h-4 w-4" />
			Edit Task
		</Button>
	</div>

	<!-- Task Overview Card -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1">
					<div class="flex items-center gap-3 mb-2">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full {statusConfigForTask.bgColor}"
						>
							<svelte:component
								this={statusConfigForTask.icon}
								class="h-5 w-5 {statusConfigForTask.color}"
							/>
						</div>
						<div>
							<Card.Title class="text-2xl">{task.title}</Card.Title>
							<div class="flex items-center gap-2 mt-1">
								<Badge variant="outline">{task.status}</Badge>
								<div class="flex items-center gap-1">
									<div class="h-2 w-2 rounded-full {priorityColors[task.priority]}"></div>
									<span class="text-sm text-muted-foreground">{task.priority} Priority</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Description -->
			{#if task.description}
				<div>
					<h3 class="text-sm font-medium mb-2">Description</h3>
					<p class="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
				</div>
			{/if}

			<!-- Task Metadata -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<!-- Assignee -->
				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<User class="h-4 w-4 text-primary" />
					</div>
					<div class="flex-1">
						<p class="text-xs text-muted-foreground">Assigned to</p>
						<p class="text-sm font-medium">
							{task.userByAssigneeId?.displayName || 'Unassigned'}
						</p>
						{#if task.userByAssigneeId}
							<p class="text-xs text-muted-foreground">{task.userByAssigneeId.email}</p>
						{/if}
					</div>
				</div>

				<!-- Task Type -->
				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<Target class="h-4 w-4 text-primary" />
					</div>
					<div class="flex-1">
						<p class="text-xs text-muted-foreground">Task Type</p>
						<p class="text-sm font-medium">
							{task.taskTypeByTaskTypeId?.name || 'No type'}
						</p>
					</div>
				</div>

				<!-- Due Date -->
				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<Calendar class="h-4 w-4 text-primary" />
					</div>
					<div class="flex-1">
						<p class="text-xs text-muted-foreground">Due Date</p>
						<p class="text-sm font-medium">{formatDate(task.dueDate)}</p>
						{#if task.reminderTime}
							<div class="flex items-center gap-1 mt-1">
								<Bell class="h-3 w-3 text-muted-foreground" />
								<p class="text-xs text-muted-foreground">
									{formatReminderTime(task.reminderTime)}
								</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Created -->
				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<Clock class="h-4 w-4 text-primary" />
					</div>
					<div class="flex-1">
						<p class="text-xs text-muted-foreground">Created</p>
						<p class="text-sm font-medium">{formatDate(task.createdAt)}</p>
						{#if task.updatedAt !== task.createdAt}
							<p class="text-xs text-muted-foreground">Updated {formatDate(task.updatedAt)}</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Parent Task Link -->
			{#if task.taskByParentTaskId}
				<div class="rounded-lg border bg-muted/30 p-3">
					<div class="flex items-center gap-2">
						<Target class="h-4 w-4 text-muted-foreground" />
						<span class="text-sm text-muted-foreground">Subtask of:</span>
						<Button
							variant="link"
							size="sm"
							class="h-auto p-0"
							onclick={() => goto(`/dashboard/tasks/${task.taskByParentTaskId.id}`)}
						>
							{task.taskByParentTaskId.title}
						</Button>
					</div>
				</div>
			{/if}

			<!-- Subtask Progress -->
			{#if task.tasksByParentTaskId?.totalCount > 0}
				<div>
					<h3 class="text-sm font-medium mb-3">Subtask Progress</h3>
					<SubtaskProgress {task} showDetails={true} showOnTrack={true} />
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Tabbed Content -->
	<Tabs.Root value="subtasks" class="w-full">
		<Tabs.List class="w-full">
			<Tabs.Trigger value="subtasks">
				Subtasks ({task.tasksByParentTaskId?.totalCount || 0})
			</Tabs.Trigger>
			<Tabs.Trigger value="dependencies">
				Dependencies (
				{(task.taskDependenciesByBlockingTaskId?.totalCount || 0) +
					(task.taskDependenciesByBlockedTaskId?.totalCount || 0)}
				)
			</Tabs.Trigger>
			<Tabs.Trigger value="resources">
				Resources ({task.linkedResourcesByTaskId?.totalCount || 0})
			</Tabs.Trigger>
			<Tabs.Trigger value="activity">Activity ({data.auditTotalCount})</Tabs.Trigger>
		</Tabs.List>

		<!-- Subtasks Tab -->
		<Tabs.Content value="subtasks">
			{#if task.tasksByParentTaskId?.totalCount > 0}
				<div class="space-y-4">
					{#each task.tasksByParentTaskId.nodes as subtask}
						<TaskHierarchy
							task={subtask}
							userId={data.user.id}
							onTaskClick={(id) => goto(`/dashboard/tasks/${id}`)}
							onStatusChange={handleStatusChange}
							maxDepth={2}
							currentDepth={1}
							showProgress={true}
							compact={false}
						/>
					{/each}
				</div>
			{:else}
				<Card.Root>
					<Card.Content class="flex flex-col items-center justify-center py-12">
						<Target class="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
						<h3 class="text-lg font-medium mb-2">No subtasks</h3>
						<p class="text-sm text-muted-foreground mb-4">
							Break this task down into smaller subtasks for better tracking
						</p>
						<Button variant="outline" onclick={handleEditClick}>Add Subtasks</Button>
					</Card.Content>
				</Card.Root>
			{/if}
		</Tabs.Content>

		<!-- Dependencies Tab -->
		<Tabs.Content value="dependencies">
			<TaskDependencies
				{task}
				availableTasks={data.availableTasks}
				onAddDependency={handleAddDependency}
				onRemoveDependency={handleRemoveDependency}
			/>
		</Tabs.Content>

		<!-- Resources Tab -->
		<Tabs.Content value="resources">
			<LinkedResources
				resources={task.linkedResourcesByTaskId?.nodes || []}
				availableResources={data.availableResources}
				onAddResource={handleAddResource}
				onRemoveResource={handleRemoveResource}
			/>
		</Tabs.Content>

		<!-- Activity Tab -->
		<Tabs.Content value="activity">
			<TaskAuditTrail
				entries={data.auditTrail}
				totalCount={data.auditTotalCount}
				hasMore={data.auditHasMore}
			/>
		</Tabs.Content>
	</Tabs.Root>
</div>

<style>
	/* Page Layout */
	.task-details-page {
		@apply container mx-auto px-4 py-8 space-y-6;
	}

	/* Page Header */
	.page-header {
		@apply flex items-center justify-between gap-4;
	}

	@media (max-width: 640px) {
		.page-header {
			@apply flex-col items-stretch;
		}
	}
</style>
