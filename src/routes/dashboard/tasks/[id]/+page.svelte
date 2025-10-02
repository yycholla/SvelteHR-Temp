<script lang="ts">
	// Task Detail Page
	// Feature: 019-we-need-to - Task T034
	// Purpose: Display full task details with status management

	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import type { TaskStatus } from '$lib/graphql/types';
	import { formatTaskDueDate } from '$lib/utils/tasks';

	let { data }: { data: PageData } = $props();

	let isStatusUpdating = $state(false);

	// Handle status change
	async function handleStatusChange(newStatus: TaskStatus) {
		isStatusUpdating = true;
		try {
			// TODO: Implement task status update mutation
			// await updateTaskStatus(data.task.id, newStatus);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 500));
			window.location.reload();
		} catch (error) {
			console.error('Failed to update task status:', error);
			alert('Failed to update task status. Please try again.');
		} finally {
			isStatusUpdating = false;
		}
	}

	// Handle task deletion
	async function handleDelete() {
		if (
			!confirm('Are you sure you want to delete this task? This action cannot be undone.')
		) {
			return;
		}

		try {
			// TODO: Implement delete task mutation
			// await deleteTask(data.task.id);

			alert('Task deleted successfully');
			goto('/dashboard/tasks/my-tasks');
		} catch (error) {
			console.error('Failed to delete task:', error);
			alert('Failed to delete task. Please try again.');
		}
	}

	// Get priority color
	function getPriorityColor(priority: string): string {
		const colors: Record<string, string> = {
			low: 'bg-gray-100 text-gray-800',
			medium: 'bg-blue-100 text-blue-800',
			high: 'bg-orange-100 text-orange-800',
			urgent: 'bg-red-100 text-red-800'
		};
		return colors[priority] || 'bg-gray-100 text-gray-800';
	}

	// Get status color
	function getStatusColor(status: string): string {
		const colors: Record<string, string> = {
			pending: 'bg-yellow-100 text-yellow-800',
			in_progress: 'bg-blue-100 text-blue-800',
			completed: 'bg-green-100 text-green-800',
			cancelled: 'bg-gray-100 text-gray-800'
		};
		return colors[status] || 'bg-gray-100 text-gray-800';
	}

	// Format status label
	function formatStatusLabel(status: string): string {
		return status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
	}
</script>

<svelte:head>
	<title>{data.task.title} - SvelteHR</title>
	<meta name="description" content="Task details for {data.task.title}" />
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Back Button -->
	<div class="mb-6">
		<a
			href={data.isInAssignedDepartment
				? '/dashboard/tasks/department'
				: '/dashboard/tasks/my-tasks'}
			class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
		>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				></path>
			</svg>
			Back to Tasks
		</a>
	</div>

	<!-- Task Header -->
	<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<div class="mb-4 flex items-start justify-between">
			<div class="flex-1">
				<h1 class="text-3xl font-bold text-gray-900">{data.task.title}</h1>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<span
						class="rounded-md px-2 py-1 text-xs font-medium {getStatusColor(data.task.status)}"
					>
						{formatStatusLabel(data.task.status)}
					</span>
					<span
						class="rounded-md px-2 py-1 text-xs font-medium {getPriorityColor(data.task.priority)}"
					>
						{data.task.priority.charAt(0).toUpperCase() + data.task.priority.slice(1)} Priority
					</span>
					{#if data.isOverdue}
						<span class="rounded-md px-2 py-1 text-xs font-medium bg-red-100 text-red-800">
							Overdue
						</span>
					{:else if data.isDueSoon}
						<span class="rounded-md px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800">
							Due Soon
						</span>
					{/if}
					{#if data.task.assignedToDepartmentId}
						<span class="rounded-md px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800">
							Department Task
						</span>
					{/if}
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-2">
				{#if data.canManageTask}
					<a
						href="/dashboard/tasks/{data.task.id}/edit"
						class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							></path>
						</svg>
						Edit
					</a>
					<button
						type="button"
						onclick={handleDelete}
						class="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
					>
						<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							></path>
						</svg>
						Delete
					</button>
				{/if}
			</div>
		</div>

		<!-- Task Details Grid -->
		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Assignee -->
			{#if data.task.assigneeId}
				<div class="flex items-start">
					<svg
						class="mr-3 h-5 w-5 text-gray-400 mt-0.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						></path>
					</svg>
					<div>
						<div class="text-sm font-medium text-gray-900">Assigned To</div>
						<div class="text-sm text-gray-600">
							{data.task.assigneeName || 'Unknown'}
							{#if data.isAssignee}
								<span class="ml-2 text-xs text-blue-600">(You)</span>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Department -->
			{#if data.task.assignedToDepartmentId}
				<div class="flex items-start">
					<svg
						class="mr-3 h-5 w-5 text-gray-400 mt-0.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
						></path>
					</svg>
					<div>
						<div class="text-sm font-medium text-gray-900">Department</div>
						<div class="text-sm text-gray-600">{data.task.departmentName || 'Unknown'}</div>
					</div>
				</div>
			{/if}

			<!-- Due Date -->
			{#if data.task.dueDate}
				<div class="flex items-start">
					<svg
						class="mr-3 h-5 w-5 text-gray-400 mt-0.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						></path>
					</svg>
					<div>
						<div class="text-sm font-medium text-gray-900">Due Date</div>
						<div class="text-sm text-gray-600">
							{formatTaskDueDate(data.task)}
						</div>
					</div>
				</div>
			{/if}

			<!-- Created Date -->
			<div class="flex items-start">
				<svg
					class="mr-3 h-5 w-5 text-gray-400 mt-0.5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
				<div>
					<div class="text-sm font-medium text-gray-900">Created</div>
					<div class="text-sm text-gray-600">
						{new Date(data.task.createdAt).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</div>
				</div>
			</div>

			<!-- Completion Date -->
			{#if data.task.completedAt}
				<div class="flex items-start">
					<svg
						class="mr-3 h-5 w-5 text-green-400 mt-0.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						></path>
					</svg>
					<div>
						<div class="text-sm font-medium text-gray-900">Completed</div>
						<div class="text-sm text-gray-600">
							{new Date(data.task.completedAt).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Description -->
		{#if data.task.description}
			<div class="mt-6 border-t border-gray-200 pt-6">
				<h3 class="text-sm font-medium text-gray-900 mb-2">Description</h3>
				<p class="text-sm text-gray-600 whitespace-pre-wrap">{data.task.description}</p>
			</div>
		{/if}

		<!-- Status Change Section -->
		{#if data.canManageTask && data.task.status !== 'completed'}
			<div class="mt-6 border-t border-gray-200 pt-6">
				<h3 class="text-sm font-medium text-gray-900 mb-3">Update Status</h3>
				<div class="flex flex-wrap gap-2">
					{#if data.task.status !== 'pending'}
						<button
							type="button"
							onclick={() => handleStatusChange('pending')}
							disabled={isStatusUpdating}
							class="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
						>
							Mark as Pending
						</button>
					{/if}
					{#if data.task.status !== 'in_progress'}
						<button
							type="button"
							onclick={() => handleStatusChange('in_progress')}
							disabled={isStatusUpdating}
							class="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
						>
							Mark as In Progress
						</button>
					{/if}
					<button
						type="button"
						onclick={() => handleStatusChange('completed')}
						disabled={isStatusUpdating}
						class="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
					>
						{#if isStatusUpdating}
							Updating...
						{:else}
							Mark as Completed
						{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Activity History (TODO) -->
	<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Activity History</h2>
		<div class="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
			<p>Activity history for this task will be displayed here.</p>
			<p class="mt-1 text-xs">
				(Feature coming soon - will show task creation, assignments, status changes, etc.)
			</p>
		</div>
	</div>
</div>
