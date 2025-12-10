<script lang="ts">
	import { workflowActions } from '$lib/stores/workflow';
	import { auth } from '$lib/stores/auth.svelte';
	import type { WorkflowTask } from '$lib/stores/workflow';

	// Props
	const {
		task,
		onupdate = undefined
	}: {
		task: WorkflowTask;
		onupdate?: ((detail: { task: WorkflowTask; newStatus: string }) => void) | undefined;
	} = $props();

	// Local state
	let isUpdating = $state(false);

	// Derived values
	const statusColor = $derived(getStatusColor(task.status));
	const priorityColor = $derived(getPriorityColor(task.priority));
	const canUpdate = $derived(canUpdateTask());
	const isOverdue = $derived(
		task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
	);

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			case 'in_progress':
				return 'bg-blue-100 text-blue-800';
			case 'completed':
				return 'bg-green-100 text-green-800';
			case 'failed':
				return 'bg-red-100 text-red-800';
			case 'cancelled':
				return 'bg-gray-100 text-gray-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getPriorityColor(priority: string) {
		switch (priority?.toLowerCase()) {
			case 'critical':
				return 'bg-red-100 text-red-800';
			case 'high':
				return 'bg-orange-100 text-orange-800';
			case 'medium':
				return 'bg-yellow-100 text-yellow-800';
			case 'low':
				return 'bg-green-100 text-green-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function canUpdateTask(): boolean {
		// User can update if they are assigned to the task or have workflow management permissions
		return task.assignedToId === auth.user?.id || auth.canManageWorkflows;
	}

	async function updateTaskStatus(newStatus: string) {
		if (!canUpdate) return;

		isUpdating = true;

		const patch = {
			status: newStatus,
			completedAt: newStatus === 'completed' ? new Date().toISOString() : null
		};

		const success = await workflowActions.updateTask(task.id, patch);

		if (success) {
			onupdate?.({ task, newStatus });
		}

		isUpdating = false;
	}
</script>

<div
	class={`workflow-task-card rounded-lg border bg-white p-6 shadow-sm transition-all duration-200 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:shadow-md'}`}
>
	<!-- Header -->
	<div class="mb-4 flex items-start justify-between">
		<div class="flex-1">
			<div class="mb-2 flex items-center gap-3">
				<h3 class="text-lg font-semibold text-gray-900">
					{task.title}
				</h3>

				{#if isOverdue}
					<span
						class="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-800"
					>
						<svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
						Overdue
					</span>
				{/if}
			</div>

			{#if task.description}
				<p class="mb-3 line-clamp-2 text-sm text-gray-600">
					{task.description}
				</p>
			{/if}
		</div>

		<!-- Status Badge -->
		<span
			class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
		>
			<span class="mr-1">
				{#if task.status === 'pending'}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{:else if task.status === 'in_progress'}
					<svg class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				{:else if task.status === 'completed'}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{:else if task.status === 'failed'}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{:else}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{/if}
			</span>
			{task.status.replace('_', ' ')}
		</span>
	</div>

	<!-- Task Details Grid -->
	<div class="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
		<!-- Priority -->
		<div>
			<dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Priority</dt>
			<dd class="mt-1">
				<span
					class={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${priorityColor}`}
				>
					<span class="mr-1">
						{#if task.priority?.toLowerCase() === 'critical'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						{:else if task.priority?.toLowerCase() === 'high'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 11l5-5m0 0l5 5m-5-5v12"
								/>
							</svg>
						{:else if task.priority?.toLowerCase() === 'medium'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4"
								/>
							</svg>
						{:else if task.priority?.toLowerCase() === 'low'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 13l-5 5m0 0l-5-5m5 5V6"
								/>
							</svg>
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6h16M4 12h16M4 18h16"
								/>
							</svg>
						{/if}
					</span>
					{task.priority}
				</span>
			</dd>
		</div>

		<!-- Task Type -->
		<div>
			<dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Type</dt>
			<dd class="mt-1 text-sm text-gray-900">{task.taskType}</dd>
		</div>

		<!-- Due Date -->
		{#if task.dueDate}
			<div>
				<dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Due Date</dt>
				<dd class={`mt-1 text-sm ${isOverdue ? 'font-medium text-red-600' : 'text-gray-900'}`}>
					{formatDate(task.dueDate)}
				</dd>
			</div>
		{/if}

		<!-- Completed At -->
		{#if task.completedAt}
			<div>
				<dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Completed</dt>
				<dd class="mt-1 text-sm text-gray-900">{formatDate(task.completedAt)}</dd>
			</div>
		{/if}
	</div>

	<!-- Workflow Information -->
	<div class="mb-4">
		<dt class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Workflow</dt>
		<div class="rounded-md bg-gray-50 p-3">
			<p class="text-sm font-medium text-gray-900">
				{task.workflowInstanceByWorkflowInstanceId?.workflowDefinitionByWorkflowDefinitionId
					?.name || 'Unknown Workflow'}
			</p>
			{#if task.workflowInstanceByWorkflowInstanceId?.workflowDefinitionByWorkflowDefinitionId?.category}
				<p class="text-xs text-gray-500">
					Category: {task.workflowInstanceByWorkflowInstanceId
						.workflowDefinitionByWorkflowDefinitionId.category}
				</p>
			{/if}
		</div>
	</div>

	<!-- Assigned To -->
	{#if task.userByAssignedToId}
		<div class="mb-4">
			<dt class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Assigned To</dt>
			<div class="flex items-center">
				<div
					class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100"
				>
					<svg class="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<p class="text-sm font-medium text-gray-900">
						{task.userByAssignedToId.displayName}
					</p>
					<p class="text-xs text-gray-500">
						{task.userByAssignedToId.email}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Actions -->
	{#if canUpdate && task.status !== 'completed' && task.status !== 'cancelled'}
		<div class="flex items-center justify-between border-t border-gray-200 pt-4">
			<div class="text-xs text-gray-500">
				Created: {formatDate(task.createdAt)}
			</div>

			<div class="flex gap-2">
				{#if task.status === 'pending'}
					<button
						onclick={() => updateTaskStatus('in_progress')}
						disabled={isUpdating}
						class="btn btn-primary btn-sm"
					>
						{#if isUpdating}
							<svg class="mr-1 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{/if}
						Start Task
					</button>
				{:else if task.status === 'in_progress'}
					<button
						onclick={() => updateTaskStatus('completed')}
						disabled={isUpdating}
						class="btn btn-success btn-sm"
					>
						{#if isUpdating}
							<svg class="mr-1 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{/if}
						Complete Task
					</button>

					<button
						onclick={() => updateTaskStatus('failed')}
						disabled={isUpdating}
						class="btn btn-danger btn-sm"
					>
						Mark Failed
					</button>
				{/if}
			</div>
		</div>
	{:else}
		<div class="border-t border-gray-200 pt-4">
			<div class="text-xs text-gray-500">
				Created: {formatDate(task.createdAt)}
				{#if task.completedAt}
					• Completed: {formatDate(task.completedAt)}
				{/if}
			</div>
		</div>
	{/if}
</div>
