<script lang="ts">
	import { format } from 'date-fns';
	import { logger } from '$lib/utils/logger';
	import { CHANGE_TASK_STATUS } from '$lib/graphql/tasks-operations';
	import { client } from '$lib/graphql/client';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle } from '@lucide/svelte';
	import type { Task, TaskStatus } from '$lib/types/task';
	import { untrack } from 'svelte';

	// Import decomposed components
	import TaskHeader from './components/TaskHeader.svelte';
	import TaskStatusBanner from './components/TaskStatusBanner.svelte';
	import TaskDescription from './components/TaskDescription.svelte';
	import TaskSubtasks from './components/TaskSubtasks.svelte';
	import TaskAttachments from './components/TaskAttachments.svelte';
	import TaskActivity from './components/TaskActivity.svelte';
	import TaskSidebarDetails from './components/TaskSidebarDetails.svelte';
	import TaskTags from './components/TaskTags.svelte';

	// Page data from server
	const { data } = $props();

	// Get task data - safe access with fallback
	const task = $derived(data?.task);

	// Tags state
	let tags = $state<string[]>(untrack(() => task?.tags || []));

	$effect(() => {
		if (task?.tags) {
			tags = task.tags;
		}
	});

	let isUpdatingTags = $state(false);

	// Determine user permissions for assignee selection
	const canAssignToAnyone = $derived(
		data?.user?.role === 'hr_admin' ||
			data?.user?.role === 'system_admin' ||
			data?.user?.role === 'super_admin'
	);
	const canAssignToTeam = $derived(data?.user?.role === 'manager');
	const canAssign = $derived(canAssignToAnyone || canAssignToTeam);

	// Derived state for progress
	const subtaskProgress = $derived.by(() => {
		if (!task?.subtasks || task.subtasks.length === 0) return 0;
		const completed = task.subtasks.filter((st: Task) => st.status === 'DONE').length;
		return Math.round((completed / task.subtasks.length) * 100);
	});

	const completedSubtasksCount = $derived.by(() => {
		if (!task?.subtasks) return 0;
		return task.subtasks.filter((st: Task) => st.status === 'DONE').length;
	});

	// Helper to get initials
	function getInitials(name: string | undefined | null): string {
		if (!name) return '??';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Helper to format date
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Not set';
		return format(new Date(dateString), 'MMM d, yyyy');
	}

	// Format distance helper for activity
	import { formatDistanceToNow } from 'date-fns';

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
			toast.success('Task status updated');
			await invalidateAll();
		} catch (error) {
			logger.error('Failed to change task status:', error as Error);
			toast.error('Failed to update task status');
		}
	}

	// Handle tags update
	async function updateTags(newTags: string[]) {
		if (isUpdatingTags) return;
		isUpdatingTags = true;

		const formData = new FormData();
		formData.append('tags', JSON.stringify(newTags));

		try {
			const response = await fetch(`?/updateTags`, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success') {
				tags = newTags;
				toast.success('Tags updated');
				await invalidateAll();
			} else {
				toast.error('Failed to update tags');
			}
		} catch (error) {
			logger.error('Tag update error:', error as Error);
			toast.error('Failed to update tags');
		} finally {
			isUpdatingTags = false;
		}
	}

	// Navigation
	function handleEditClick() {
		if (task) {
			goto(`/dashboard/tasks/${task.id}/edit`);
		}
	}

	// Status configuration matching the mockup's aesthetic (moved from inline to allow passing to banner)
	// Actually, I moved the config *into* TaskStatusBanner.svelte.
	// But I need to pass the *resolved* config object to it, or pass the status string and let it resolve.
	// TaskStatusBanner takes `currentStatus` object.
	// So I need the config here to resolve it.
	const statusConfig: Record<
		TaskStatus,
		{
			label: string;
			color: string;
			bgColor: string;
			borderColor: string;
		}
	> = {
		TODO: {
			label: 'To Do',
			color: 'text-slate-600',
			bgColor: 'bg-slate-100',
			borderColor: 'border-slate-200'
		},
		IN_PROGRESS: {
			label: 'In Progress',
			color: 'text-blue-600',
			bgColor: 'bg-blue-100',
			borderColor: 'border-blue-200'
		},
		REVIEW: {
			label: 'In Review',
			color: 'text-indigo-600',
			bgColor: 'bg-indigo-100',
			borderColor: 'border-indigo-200'
		},
		BLOCKED: {
			label: 'Blocked',
			color: 'text-red-600',
			bgColor: 'bg-red-100',
			borderColor: 'border-red-200'
		},
		DONE: {
			label: 'Done',
			color: 'text-green-600',
			bgColor: 'bg-green-100',
			borderColor: 'border-green-200'
		},
		CANCELLED: {
			label: 'Cancelled',
			color: 'text-gray-500',
			bgColor: 'bg-gray-100',
			borderColor: 'border-gray-200'
		}
	};

	const priorityConfig = {
		LOW: {
			label: 'Low',
			color: 'text-slate-600',
			bgColor: 'bg-slate-100',
			borderColor: 'border-slate-200'
		},
		MEDIUM: {
			label: 'Medium',
			color: 'text-blue-600',
			bgColor: 'bg-blue-100',
			borderColor: 'border-blue-200'
		},
		HIGH: {
			label: 'High',
			color: 'text-orange-600',
			bgColor: 'bg-orange-100',
			borderColor: 'border-orange-200'
		},
		URGENT: {
			label: 'Urgent',
			color: 'text-red-600',
			bgColor: 'bg-red-100',
			borderColor: 'border-red-200'
		}
	};

	const currentStatus = $derived(
		task ? statusConfig[task.status as TaskStatus] || statusConfig.TODO : statusConfig.TODO
	);
	const currentPriority = $derived(
		task
			? priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.MEDIUM
			: priorityConfig.MEDIUM
	);
</script>

<svelte:head>
	<title>{task?.title || 'Task Not Found'} - Task Details - MountainHR</title>
	<meta name="description" content={task?.description || 'Task details'} />
</svelte:head>

<div class="min-h-screen bg-background p-4 md:p-8">
	{#if !task}
		<div class="mx-auto max-w-md space-y-4 py-12 text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"
			>
				<AlertCircle class="h-8 w-8 text-muted-foreground" />
			</div>
			<h1 class="text-2xl font-bold">Task Not Found</h1>
			<p class="text-muted-foreground">
				The task you are looking for does not exist or you do not have permission to view it.
			</p>
			<div class="pt-4">
				<Button href="/dashboard/tasks/my-tasks" variant="outline">Back to My Tasks</Button>
			</div>
		</div>
	{:else}
		<div class="mx-auto max-w-7xl space-y-8">
			<!-- Breadcrumb / Header Area -->
			<TaskHeader
				taskId={task.id}
				title={task.title}
				onEdit={handleEditClick}
			/>

			<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<!-- Main Content Column (Left/Center) -->
				<div class="space-y-6 lg:col-span-2">
					<!-- Status and Priority Header -->
					<TaskStatusBanner
						{currentStatus}
						{currentPriority}
						taskType={task.taskType}
					/>

					<!-- Description -->
					<TaskDescription description={task.description} />

					<!-- Subtasks / Checklist -->
					<TaskSubtasks
						subtasks={task.subtasks}
						completedCount={completedSubtasksCount}
						progress={subtaskProgress}
						currentUser={data.user}
						assignees={data.assignees}
						taskTypes={data.taskTypes}
						{canAssign}
						parentTaskId={task.id}
						onStatusChange={handleStatusChange}
						onSuccess={async () => await invalidateAll()}
					/>

					<!-- Attachments -->
					<TaskAttachments
						linkedResources={task.linkedResources}
						{formatDate}
					/>

					<!-- Comments / Activity -->
					<TaskActivity
						auditTrail={data.auditTrail}
						taskCreatedAt={task.createdAt}
						user={data.user}
						{formatDate}
						{getInitials}
						{formatDistanceToNow}
					/>
				</div>

				<!-- Sidebar Column (Right) -->
				<div class="space-y-6">
					<!-- Details Card -->
					<TaskSidebarDetails
						{task}
						{getInitials}
						{formatDate}
					/>

					<!-- Tags -->
					<TaskTags
						bind:tags
						taskType={task.taskType}
						onUpdateTags={updateTags}
					/>
				</div>
			</div>
		</div>
	{/if}
</div>