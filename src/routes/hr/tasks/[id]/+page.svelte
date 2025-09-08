<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { modalStore } from '$lib/stores/hr/modals';
	import { taskStore } from '$lib/stores/hr/tasks';
	import { notifications } from '$lib/components/hr/utils/notifications';
	import { taskApi } from '$lib/components/hr/utils/api-helpers';
	import TaskDetail from '$lib/components/hr/pages/TaskDetail.svelte';
	import TaskModal from '$lib/components/hr/modals/TaskModal.svelte';
	import type { PageData } from './$types';
	import type { Task } from '$lib/stores/hr/tasks';

	let { data }: { data: PageData } = $props();

	let showEditModal = $state(false);
	let showDeleteConfirm = $state(false);

	// Set the selected task in the store
	$effect(() => {
		if (data.task) {
			taskStore.setSelectedTask(data.task);
		}
	});

	function handleEdit(task: Task) {
		modalStore.open('task', task, 'edit');
		showEditModal = true;
	}

	function handleDelete(task: Task) {
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (!data.task) return;

		try {
			await taskApi.delete(data.task.id);
			notifications.success(`Task "${data.task.title}" has been deleted`);
			taskStore.removeTask(data.task.id);

			// Navigate back to tasks list
			goto('/hr/tasks');
		} catch (error) {
			notifications.apiError('Failed to delete task');
		} finally {
			showDeleteConfirm = false;
		}
	}

	function handleEditSuccess(updatedTask: Task) {
		// Update the page data
		data.task = updatedTask;
		taskStore.updateTask(updatedTask);
		showEditModal = false;
	}

	function handleStatusChange(updatedTask: Task, newStatus: Task['status']) {
		// Update the page data
		data.task = updatedTask;
		taskStore.updateTask(updatedTask);

		// Show appropriate notification based on status
		switch (newStatus) {
			case 'completed':
				notifications.taskCompleted(updatedTask.title);
				break;
			case 'in_progress':
				notifications.success(`Task "${updatedTask.title}" is now in progress`);
				break;
			case 'cancelled':
				notifications.warning(`Task "${updatedTask.title}" has been cancelled`);
				break;
			default:
				notifications.success(`Task status updated to ${newStatus.replace('_', ' ')}`);
		}
	}
</script>

<svelte:head>
	<title>
		{data.task ? `${data.task.title} - Task Details` : 'Task Details'} | SvelteHR
	</title>
	<meta name="description" content="Task details and information" />
</svelte:head>

<div class="container mx-auto p-6">
	<!-- Breadcrumb -->
	<nav class="breadcrumb mb-6">
		<ol class="flex items-center space-x-2 text-sm">
			<li><a href="/" class="anchor">Home</a></li>
			<li class="text-surface-400">/</li>
			<li><a href="/hr" class="anchor">HR</a></li>
			<li class="text-surface-400">/</li>
			<li><a href="/hr/tasks" class="anchor">Tasks</a></li>
			<li class="text-surface-400">/</li>
			<li class="text-surface-600-300-token">
				{data.task ? data.task.title : 'Task'}
			</li>
		</ol>
	</nav>

	<!-- Main Content -->
	{#if data.task}
		<TaskDetail
			taskId={data.task.id}
			onEdit={handleEdit}
			onDelete={handleDelete}
			onStatusChange={handleStatusChange}
		/>
	{:else}
		<div class="card p-8 text-center">
			<h2 class="mb-4 h2">Task Not Found</h2>
			<p class="text-surface-600-300-token mb-6">The task you're looking for could not be found.</p>
			<a href="/hr/tasks" class="variant-filled-primary btn"> Back to Tasks </a>
		</div>
	{/if}
</div>

<!-- Edit Modal -->
<TaskModal bind:open={showEditModal} task={data.task} mode="edit" onSuccess={handleEditSuccess} />

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div
		class="modal-backdrop fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
	>
		<div class="w-full max-w-md card p-6">
			<header class="mb-4">
				<h3 class="h3 font-bold text-error-500">Confirm Delete</h3>
			</header>

			<section class="mb-6">
				<p class="text-surface-600-300-token">
					Are you sure you want to delete task
					<strong>"{data.task?.title}"</strong>?
				</p>
				<p class="mt-2 text-sm text-error-500">This action cannot be undone.</p>
			</section>

			<footer class="flex justify-end gap-3">
				<button class="variant-ghost-surface btn" on:click={() => (showDeleteConfirm = false)}>
					Cancel
				</button>
				<button class="variant-filled-error btn" on:click={confirmDelete}> Delete Task </button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
