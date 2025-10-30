<script lang="ts">
	// Task Create Page
	// Feature: 019-we-need-to - Task T036
	// Purpose: Form for creating new tasks

	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import type { TaskPriority, TaskStatus } from '$lib/graphql/types';

	let { data }: { data: PageData } = $props();

	// Form state
	let title = $state('');
	let description = $state('');
	let priority = $state<TaskPriority>('medium');
	let status = $state<TaskStatus>('pending');
	let dueDate = $state(data.defaultDueDate);
	let assignmentType = $state<'employee' | 'department'>('employee');
	let assigneeId = $state('');
	let departmentId = $state('');
	let isSubmitting = $state(false);
	let errors = $state<Record<string, string>>({});

	// Form validation
	function validateForm(): boolean {
		const newErrors: Record<string, string> = {};

		if (!title.trim()) {
			newErrors.title = 'Title is required';
		}

		if (assignmentType === 'employee' && !assigneeId) {
			newErrors.assigneeId = 'Assignee is required for employee tasks';
		}

		if (assignmentType === 'department' && !departmentId) {
			newErrors.departmentId = 'Department is required for department tasks';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	// Handle form submission
	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!validateForm()) {
			return;
		}

		isSubmitting = true;

		try {
			// TODO: Implement create task mutation
			// const input = {
			//   title,
			//   description,
			//   priority,
			//   status,
			//   dueDate,
			//   assigneeId: assignmentType === 'employee' ? assigneeId : null,
			//   assignedToDepartmentId: assignmentType === 'department' ? departmentId : null
			// };
			// await createTask(input);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Navigate to tasks list on success
			goto('/dashboard/tasks/my-tasks');
		} catch (error) {
			console.error('Failed to create task:', error);
			alert('Failed to create task. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create Task - SvelteHR</title>
	<meta name="description" content="Create a new task" />
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<!-- Back Button -->
	<div class="mb-6">
		<a
			href="/dashboard/tasks/my-tasks"
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

	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Create Task</h1>
		<p class="mt-2 text-gray-600">Create a new task and assign it to an employee or department</p>
	</div>

	<!-- Task Creation Form -->
	<form onsubmit={handleSubmit} class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<!-- Title -->
		<div class="mb-6">
			<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
				Task Title <span class="text-red-600">*</span>
			</label>
			<input
				type="text"
				id="title"
				bind:value={title}
				required
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.title
					? 'border-red-500'
					: ''}"
				placeholder="Enter task title"
			/>
			{#if errors.title}
				<p class="mt-1 text-sm text-red-600">{errors.title}</p>
			{/if}
		</div>

		<!-- Description -->
		<div class="mb-6">
			<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
				Description
			</label>
			<textarea
				id="description"
				bind:value={description}
				rows="4"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				placeholder="Enter task description"
			></textarea>
		</div>

		<!-- Priority and Status Row -->
		<div class="mb-6 grid gap-4 sm:grid-cols-2">
			<!-- Priority -->
			<div>
				<label for="priority" class="block text-sm font-medium text-gray-700 mb-2">
					Priority <span class="text-red-600">*</span>
				</label>
				<select
					id="priority"
					bind:value={priority}
					required
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
					<option value="urgent">Urgent</option>
				</select>
			</div>

			<!-- Status -->
			<div>
				<label for="status" class="block text-sm font-medium text-gray-700 mb-2">
					Initial Status <span class="text-red-600">*</span>
				</label>
				<select
					id="status"
					bind:value={status}
					required
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="pending">Pending</option>
					<option value="in_progress">In Progress</option>
				</select>
			</div>
		</div>

		<!-- Due Date -->
		<div class="mb-6">
			<label for="dueDate" class="block text-sm font-medium text-gray-700 mb-2">
				Due Date
			</label>
			<input
				type="date"
				id="dueDate"
				bind:value={dueDate}
				min={data.minDate}
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>

		<!-- Assignment Type -->
		<div class="mb-6">
			<div class="block text-sm font-medium text-gray-700 mb-2">
				Assignment Type <span class="text-red-600">*</span>
			</div>
			<div class="flex gap-4">
				<label class="flex items-center">
					<input
						type="radio"
						bind:group={assignmentType}
						value="employee"
						class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<span class="ml-2 text-sm text-gray-700">Assign to Employee</span>
				</label>
				<label class="flex items-center">
					<input
						type="radio"
						bind:group={assignmentType}
						value="department"
						class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<span class="ml-2 text-sm text-gray-700">Assign to Department</span>
				</label>
			</div>
		</div>

		<!-- Conditional Assignment Fields -->
		{#if assignmentType === 'employee'}
			<!-- Employee Selection -->
			<div class="mb-6">
				<label for="assigneeId" class="block text-sm font-medium text-gray-700 mb-2">
					Assign to Employee <span class="text-red-600">*</span>
				</label>
				<div
					class="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
				>
					<p>Employee selection will be available here.</p>
					<p class="mt-1 text-xs">(Feature coming soon - will show dropdown of employees)</p>
				</div>
				<input
					type="text"
					id="assigneeId"
					bind:value={assigneeId}
					placeholder="Enter employee ID (temporary)"
					class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.assigneeId
						? 'border-red-500'
						: ''}"
				/>
				{#if errors.assigneeId}
					<p class="mt-1 text-sm text-red-600">{errors.assigneeId}</p>
				{/if}
			</div>
		{:else}
			<!-- Department Selection -->
			<div class="mb-6">
				<label for="departmentId" class="block text-sm font-medium text-gray-700 mb-2">
					Assign to Department <span class="text-red-600">*</span>
				</label>
				<div
					class="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
				>
					<p>Department selection will be available here.</p>
					<p class="mt-1 text-xs">(Feature coming soon - will show dropdown of departments)</p>
				</div>
				<input
					type="text"
					id="departmentId"
					bind:value={departmentId}
					placeholder="Enter department ID (temporary)"
					class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.departmentId
						? 'border-red-500'
						: ''}"
				/>
				{#if errors.departmentId}
					<p class="mt-1 text-sm text-red-600">{errors.departmentId}</p>
				{/if}
			</div>
		{/if}

		<!-- Assignment Info -->
		<div class="mb-6">
			<div
				class="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
			>
				<p class="font-medium">
					{#if assignmentType === 'employee'}
						📋 Task will be assigned to a specific employee
					{:else}
						🏢 Task will be assigned to a department (visible to all department members)
					{/if}
				</p>
				<p class="mt-1 text-xs">
					{#if assignmentType === 'employee'}
						The assignee will receive a notification and can update the task status.
					{:else}
						All department members can view and update this task. No specific assignee required.
					{/if}
				</p>
			</div>
		</div>

		<!-- Form Actions -->
		<div class="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
			<a
				href="/dashboard/tasks/my-tasks"
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={isSubmitting}
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isSubmitting}
					<span class="flex items-center">
						<svg
							class="animate-spin mr-2 h-4 w-4 text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
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
						Creating...
					</span>
				{:else}
					Create Task
				{/if}
			</button>
		</div>
	</form>
</div>
