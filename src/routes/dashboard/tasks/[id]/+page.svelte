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
	import { goto, invalidateAll } from '$app/navigation';
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
		AlertCircle,
		Bell,
		Building,
		Calendar,
		CheckCircle,
		Clock,
		Edit,
		Target,
		User
	} from '@lucide/svelte';
	import { format } from 'date-fns';
	import { CHANGE_TASK_STATUS } from '$lib/graphql/tasks-operations';
	import { client } from '$lib/graphql/client';
	import { toast } from 'svelte-sonner';

	// Page data from server
	const { data }: { data: PageData } = $props();

	// Get task data
	const task = $derived(data.task);

	// Status configuration
	// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
	const statusConfig = {
		TO_DO: {
			icon: Clock,
			color: 'text-amber-600',
			bgColor: 'bg-amber-100 dark:bg-amber-900/30'
		},
		IN_PROGRESS: {
			icon: CheckCircle,
			color: 'text-blue-600',
			bgColor: 'bg-blue-100 dark:bg-blue-900/30'
		},
		BLOCKED: {
			icon: AlertCircle,
			color: 'text-red-600',
			bgColor: 'bg-red-100 dark:bg-red-900/30'
		},
		COMPLETED: {
			icon: CheckCircle,
			color: 'text-green-600',
			bgColor: 'bg-green-100 dark:bg-green-900/30'
		},
		DEFERRED: {
			icon: Clock,
			color: 'text-gray-500',
			bgColor: 'bg-gray-100 dark:bg-gray-900/30'
		}
	};

	// Priority colors
	// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
	const priorityColors = {
		LOW: 'bg-gray-500',
		MEDIUM: 'bg-blue-500',
		HIGH: 'bg-orange-500',
		URGENT: 'bg-red-500'
	};

	// Handle navigation
	function handleEditClick() {
		goto(`/dashboard/tasks/${task.id}/edit`);
	}

	// Handle status change
	async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
		try {
			const result = await client
				.mutation(CHANGE_TASK_STATUS, {
					input: {
						taskId,
						status: newStatus
					}
				})
				.toPromise();

			if (result.error) {
				throw result.error;
			}

			// Show success message
			toast.success('Task status updated successfully');

			// Refresh the task data
			await invalidateAll();
		} catch (error) {
			console.error('Failed to change task status:', error);
			toast.error('Failed to update task status');
		}
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
	// Transform GraphQL status format to config key format
	const statusConfigForTask = $derived(() => {
		// Map GraphQL status values to config keys
		const statusMap: Record<string, keyof typeof statusConfig> = {
			TODO: 'TO_DO',
			IN_PROGRESS: 'IN_PROGRESS',
			BLOCKED: 'BLOCKED',
			REVIEW: 'REVIEW',
			DONE: 'COMPLETED',
			CANCELLED: 'CANCELLED'
		};

		const statusKey = statusMap[task.status] || 'TO_DO';
		return statusConfig[statusKey];
	});
</script>

<svelte:head>
	<title>{task.title} - Task Details - MountainHR</title>
	<meta name="description" content={task.description || 'Task details'} />
</svelte:head>

<div class="task-details-page">
	<!-- Page Header -->
	<div class="page-header">
		<Button onclick={handleEditClick}>
			<Edit class="mr-2 h-4 w-4" />
			Edit Task
		</Button>
	</div>

	<!-- Task Overview Card -->
	<Card.Root>
		{@const StatusIcon = statusConfigForTask.icon}
		<Card.Header>
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1">
					<div class="mb-2 flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full {statusConfigForTask.bgColor}"
						>
							<StatusIcon class="h-5 w-5 {statusConfigForTask.color}" />
						</div>
						<div>
							<Card.Title class="text-2xl">{task.title}</Card.Title>
							<div class="mt-1 flex items-center gap-2">
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
					<h3 class="mb-2 text-sm font-medium">Description</h3>
					<p class="text-sm whitespace-pre-wrap text-muted-foreground">{task.description}</p>
				</div>
			{/if}

			<!-- Task Metadata -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<!-- Assignment (Department or User) -->
				<div class="flex items-start gap-3">
					{#if task.department}
						<!-- Department Assignment -->
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
							<Building class="h-4 w-4 text-primary" />
						</div>
						<div class="flex-1">
							<p class="text-xs text-muted-foreground">Assigned to</p>
							<p class="text-sm font-medium">{task.department.name}</p>
							{#if task.department.description}
								<p class="text-xs text-muted-foreground">{task.department.description}</p>
							{/if}
						</div>
					{:else}
						<!-- User Assignment -->
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
							<User class="h-4 w-4 text-primary" />
						</div>
						<div class="flex-1">
							<p class="text-xs text-muted-foreground">Assigned to</p>
							<p class="text-sm font-medium">
								{task.assignee?.displayName || 'Unassigned'}
							</p>
							{#if task.assignee}
								<p class="text-xs text-muted-foreground">{task.assignee.email}</p>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Task Type -->
				<div class="flex items-start gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<Target class="h-4 w-4 text-primary" />
					</div>
					<div class="flex-1">
						<p class="text-xs text-muted-foreground">Task Type</p>
						<p class="text-sm font-medium">
							{task.taskType?.name || 'No type'}
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
							<div class="mt-1 flex items-center gap-1">
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
			{#if task.parentTask}
				<div class="rounded-lg border bg-muted/30 p-3">
					<div class="flex items-center gap-2">
						<Target class="h-4 w-4 text-muted-foreground" />
						<span class="text-sm text-muted-foreground">Subtask of:</span>
						<Button
							variant="link"
							size="sm"
							class="h-auto p-0"
							onclick={() => goto(`/dashboard/tasks/${task.parentTask.id}`)}
						>
							{task.parentTask.title}
						</Button>
					</div>
				</div>
			{/if}

			<!-- Subtask Progress -->
			{#if task.subtasks && task.subtasks.length > 0}
				<div>
					<h3 class="mb-3 text-sm font-medium">Subtask Progress</h3>
					<SubtaskProgress {task} showDetails={true} showOnTrack={true} />
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Tabbed Content -->
	<Tabs.Root value="subtasks" class="w-full">
		<Tabs.List class="w-full">
			<Tabs.Trigger value="subtasks">
				Subtasks ({task.subtasks?.length || 0})
			</Tabs.Trigger>
			<Tabs.Trigger value="dependencies">Dependencies (0)</Tabs.Trigger>
			<Tabs.Trigger value="resources">Resources (0)</Tabs.Trigger>
			<Tabs.Trigger value="activity">Activity ({data.auditTotalCount})</Tabs.Trigger>
		</Tabs.List>

		<!-- Subtasks Tab -->
		<Tabs.Content value="subtasks">
			{#if task.subtasks && task.subtasks.length > 0}
				<div class="space-y-4">
					{#each task.subtasks as subtask}
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
						<Target class="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
						<h3 class="mb-2 text-lg font-medium">No subtasks</h3>
						<p class="mb-4 text-sm text-muted-foreground">
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
				resources={[]}
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
