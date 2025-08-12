<script lang="ts">
	import { onMount } from 'svelte';
	import { taskApi, employeeApi } from '../utils/api-helpers';
	import { notifications } from '../utils/notifications';
	import type { Task } from '$lib/stores/hr/tasks';
	import type { Employee } from '$lib/stores/hr/employees';

	let {
		taskId,
		onEdit,
		onDelete,
		onStatusChange
	}: {
		taskId: string;
		onEdit?: (task: Task) => void;
		onDelete?: (task: Task) => void;
		onStatusChange?: (task: Task, newStatus: Task['status']) => void;
	} = $props();

	let task: Task | null = null;
	let assignedEmployee: Employee | null = null;
	let assignedByEmployee: Employee | null = null;
	let loading = true;
	let updatingStatus = false;

	onMount(async () => {
		await loadTask();
	});

	async function loadTask() {
		loading = true;
		try {
			const response = await taskApi.getById(taskId);
			task = response.data;
			
			// Load employee details
			if (task.assigned_to) {
				const assignedResponse = await employeeApi.getById(task.assigned_to);
				assignedEmployee = assignedResponse.data;
			}
			
			if (task.assigned_by) {
				const assignedByResponse = await employeeApi.getById(task.assigned_by);
				assignedByEmployee = assignedByResponse.data;
			}
		} catch (error) {
			notifications.apiError('Failed to load task details');
		} finally {
			loading = false;
		}
	}

	async function updateTaskStatus(newStatus: Task['status']) {
		if (!task) return;
		
		updatingStatus = true;
		try {
			const response = await taskApi.updateStatus(task.id, newStatus);
			const updatedTask = response.data;
			task = updatedTask;
			
			notifications.success(`Task status updated to ${newStatus.replace('_', ' ')}`);
			
			if (onStatusChange) {
				onStatusChange(updatedTask, newStatus);
			}
		} catch (error) {
			notifications.apiError('Failed to update task status');
		} finally {
			updatingStatus = false;
		}
	}

	function handleEdit() {
		if (task && onEdit) {
			onEdit(task);
		}
	}

	function handleDelete() {
		if (task && onDelete) {
			onDelete(task);
		}
	}

	function getStatusBadgeClass(status: string): string {
		switch (status) {
			case 'completed':
				return 'variant-filled-success';
			case 'in_progress':
				return 'variant-filled-primary';
			case 'pending':
				return 'variant-filled-warning';
			case 'cancelled':
				return 'variant-filled-error';
			default:
				return 'variant-filled-surface';
		}
	}

	function getPriorityBadgeClass(priority: string): string {
		switch (priority) {
			case 'urgent':
				return 'variant-filled-error';
			case 'high':
				return 'variant-filled-warning';
			case 'medium':
				return 'variant-filled-primary';
			case 'low':
				return 'variant-filled-success';
			default:
				return 'variant-filled-surface';
		}
	}

	function isOverdue(dueDate: string, status: string): boolean {
		if (status === 'completed' || status === 'cancelled') return false;
		const due = new Date(dueDate);
		const today = new Date();
		return due < today;
	}

	function getTimeDifference(date: string): string {
		const target = new Date(date);
		const now = new Date();
		const diffInMs = target.getTime() - now.getTime();
		const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
		
		if (diffInDays < 0) {
			return `${Math.abs(diffInDays)} days overdue`;
		} else if (diffInDays === 0) {
			return 'Due today';
		} else if (diffInDays === 1) {
			return 'Due tomorrow';
		} else {
			return `Due in ${diffInDays} days`;
		}
	}

	function getEmployeeName(employee: Employee | null): string {
		return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
	}

	const statusOptions: { value: Task['status']; label: string; class: string }[] = [
		{ value: 'pending', label: 'Pending', class: 'variant-filled-warning' },
		{ value: 'in_progress', label: 'In Progress', class: 'variant-filled-primary' },
		{ value: 'completed', label: 'Completed', class: 'variant-filled-success' },
		{ value: 'cancelled', label: 'Cancelled', class: 'variant-filled-error' }
	];
</script>

{#if loading}
	<div class="space-y-6">
		<div class="placeholder animate-pulse h-8 w-64 rounded"></div>
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="lg:col-span-2 space-y-6">
				<div class="card p-6">
					<div class="space-y-4">
						{#each Array(6) as _}
							<div class="placeholder animate-pulse h-4 w-full rounded"></div>
						{/each}
					</div>
				</div>
			</div>
			<div class="space-y-6">
				<div class="card p-6">
					<div class="space-y-4">
						{#each Array(4) as _}
							<div class="placeholder animate-pulse h-4 w-full rounded"></div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{:else if task}
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
			<div class="flex-1">
				<h1 class="h1 font-bold mb-2">{task.title}</h1>
				<div class="flex flex-wrap gap-2 items-center">
					<span class="badge {getStatusBadgeClass(task.status)}">
						{task.status.replace('_', ' ')}
					</span>
					<span class="badge {getPriorityBadgeClass(task.priority)}">
						{task.priority} priority
					</span>
					<span class="badge variant-soft">
						{task.category}
					</span>
					{#if isOverdue(task.due_date, task.status)}
						<span class="badge variant-filled-error">
							Overdue
						</span>
					{/if}
				</div>
			</div>
			
			<div class="flex gap-2">
				{#if onEdit}
					<button class="btn variant-filled-primary" on:click={handleEdit}>
						Edit
					</button>
				{/if}
				{#if onDelete}
					<button class="btn variant-filled-error" on:click={handleDelete}>
						Delete
					</button>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Main Content -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Description -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Description</h3>
					</header>
					<section class="p-6">
						<div class="prose prose-sm max-w-none dark:prose-invert">
							<p class="whitespace-pre-wrap">{task.description}</p>
						</div>
					</section>
				</div>

				<!-- Task Details -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Task Information</h3>
					</header>
					<section class="p-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
							<div>
								<span class="font-semibold text-surface-600-300-token">Assigned To:</span>
								<div class="mt-1 text-base">
									{assignedEmployee ? `${assignedEmployee.first_name} ${assignedEmployee.last_name}` : 'Unknown'}
									{#if assignedEmployee}
										<div class="text-xs text-surface-600-300-token">
											{assignedEmployee.department} • {assignedEmployee.position}
										</div>
									{/if}
								</div>
							</div>
							
							{#if assignedByEmployee}
								<div>
									<span class="font-semibold text-surface-600-300-token">Assigned By:</span>
									<div class="mt-1 text-base">
										{assignedByEmployee.first_name} {assignedByEmployee.last_name}
										<div class="text-xs text-surface-600-300-token">
											{assignedByEmployee.department} • {assignedByEmployee.position}
										</div>
									</div>
								</div>
							{/if}
							
							<div>
								<span class="font-semibold text-surface-600-300-token">Due Date:</span>
								<div class="mt-1 text-base">
									{new Date(task.due_date).toLocaleDateString()}
									<div class="text-xs" 
										class:text-error-500={isOverdue(task.due_date, task.status)}
										class:text-warning-500={!isOverdue(task.due_date, task.status) && getTimeDifference(task.due_date).includes('today')}
									>
										{getTimeDifference(task.due_date)}
									</div>
								</div>
							</div>
							
							<div>
								<span class="font-semibold text-surface-600-300-token">Created:</span>
								<div class="mt-1 text-base">
									{new Date(task.created_at).toLocaleDateString()}
									<div class="text-xs text-surface-600-300-token">
										{new Date(task.created_at).toLocaleTimeString()}
									</div>
								</div>
							</div>
							
							{#if task.completed_at}
								<div>
									<span class="font-semibold text-surface-600-300-token">Completed:</span>
									<div class="mt-1 text-base">
										{new Date(task.completed_at).toLocaleDateString()}
										<div class="text-xs text-surface-600-300-token">
											{new Date(task.completed_at).toLocaleTimeString()}
										</div>
									</div>
								</div>
							{/if}
						</div>
					</section>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Status Control -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Status</h3>
					</header>
					<section class="p-6 space-y-4">
						<div class="text-center">
							<div class="badge {getStatusBadgeClass(task.status)} text-lg px-4 py-2">
								{task.status.replace('_', ' ')}
							</div>
						</div>
						
						<div class="space-y-2">
							<label class="label text-sm">Update Status:</label>
							<div class="grid grid-cols-1 gap-2">
								{#each statusOptions as option}
									<button
										class="btn btn-sm {option.class}"
										class:variant-ghost={task.status !== option.value}
										disabled={updatingStatus || task.status === option.value}
										on:click={() => updateTaskStatus(option.value)}
									>
										{#if updatingStatus && task.status !== option.value}
											<span class="animate-pulse">Updating...</span>
										{:else}
											{option.label}
										{/if}
									</button>
								{/each}
							</div>
						</div>
					</section>
				</div>

				<!-- Priority & Category -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Details</h3>
					</header>
					<section class="p-6 space-y-4">
						<div>
							<div class="text-sm font-semibold text-surface-600-300-token mb-2">
								Priority
							</div>
							<div class="badge {getPriorityBadgeClass(task.priority)} capitalize">
								{task.priority}
							</div>
						</div>
						
						<div>
							<div class="text-sm font-semibold text-surface-600-300-token mb-2">
								Category
							</div>
							<div class="badge variant-soft">
								{task.category}
							</div>
						</div>
						
						<div>
							<div class="text-sm font-semibold text-surface-600-300-token mb-1">
								Task ID
							</div>
							<div class="font-mono text-xs bg-surface-100-800-token px-2 py-1 rounded">
								{task.id}
							</div>
						</div>
					</section>
				</div>

				<!-- Assignment Details -->
				{#if assignedEmployee}
					<div class="card">
						<header class="card-header">
							<h3 class="h3 font-semibold">Assignee</h3>
						</header>
						<section class="p-6 space-y-3">
							<div class="flex items-center gap-3">
								<div class="avatar bg-primary-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
									{assignedEmployee.first_name[0]}{assignedEmployee.last_name[0]}
								</div>
								<div>
									<div class="font-semibold">
										{assignedEmployee.first_name} {assignedEmployee.last_name}
									</div>
									<div class="text-sm text-surface-600-300-token">
										{assignedEmployee.position}
									</div>
								</div>
							</div>
							
							<div class="text-sm space-y-1">
								<div>
									<span class="font-semibold">Department:</span>
									{assignedEmployee.department}
								</div>
								<div>
									<span class="font-semibold">Email:</span>
									<a href="mailto:{assignedEmployee.email}" class="anchor">
										{assignedEmployee.email}
									</a>
								</div>
							</div>
						</section>
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="card p-8 text-center">
		<h2 class="h2 mb-4">Task Not Found</h2>
		<p class="text-surface-600-300-token">
			The task you're looking for could not be found.
		</p>
	</div>
{/if}

<style>
	.avatar {
		flex-shrink: 0;
	}
</style>