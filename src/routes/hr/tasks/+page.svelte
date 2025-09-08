<script lang="ts">
	import StatCard from '$lib/components/common/StatCard.svelte';
	import TaskList from '$lib/components/common/TaskList.svelte';
	import TaskModal from '$lib/components/hr/modals/TaskModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import { CheckSquare, Clock, Users, AlertCircle, Plus, Edit, Trash2, Eye } from 'lucide-svelte';
	import { transformTaskStats } from '$lib/utils/dataTransformers.js';
	import { modalStore } from '$lib/stores/hr/modals';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import type { Task } from '$lib/api/types-v2';

	let { data }: { data: PageData } = $props();

	// Transform server data
	const tasksData = data.tasks || [];
	const taskStats = transformTaskStats({ data: tasksData, total: tasksData.length });

	// Modal state
	let showTaskModal = $state(false);
	let modalMode = $state<'create' | 'edit' | 'view'>('create');
	let selectedTask = $state<Task | null>(null);

	// Subscribe to modal store
	$effect(() => {
		const unsubscribe = modalStore.subscribe((state) => {
			if (state.type === 'task') {
				showTaskModal = state.isOpen;
				modalMode = state.mode;
				selectedTask = state.data;
			}
		});
		return unsubscribe;
	});

	// CRUD Operations
	function handleAddTask() {
		modalStore.open('task', null, 'create');
	}

	function handleViewTask(task: Task) {
		modalStore.open('task', task, 'view');
	}

	function handleEditTask(task: Task) {
		modalStore.open('task', task, 'edit');
	}

	async function handleDeleteTask(task: Task) {
		if (confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
			try {
				const response = await fetch(`/api/v2/tasks/${task.id}`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (response.ok) {
					console.log('✅ Task deleted successfully, refreshing data...');
					await invalidateAll();
				} else {
					const error = await response.text();
					alert(`Failed to delete task: ${error}`);
				}
			} catch (error) {
				console.error('Delete error:', error);
				alert('Failed to delete task. Please try again.');
			}
		}
	}

	function handleModalClose() {
		modalStore.close();
	}

	async function handleTaskSuccess(task: Task) {
		modalStore.close();
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>HR - Task Management - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Task Management</h1>
		<p class="text-gray-600 dark:text-gray-400">Manage and track tasks across your organization</p>
	</div>

	<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		<StatCard
			title="Total Tasks"
			value={taskStats.totalTasks}
			icon={CheckSquare}
			tag="#hr"
			loading={false}
		/>
		<StatCard
			title="Completed"
			value={taskStats.completedTasks}
			icon={CheckSquare}
			tag="#hr"
			loading={false}
		/>
		<StatCard
			title="Pending"
			value={taskStats.pendingTasks}
			icon={Clock}
			tag="#hr"
			loading={false}
		/>
		<StatCard
			title="In Progress"
			value={taskStats.inProgressTasks}
			icon={Users}
			tag="#hr"
			loading={false}
		/>
	</div>

	<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
		<div class="mb-6 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<CheckSquare class="h-5 w-5 text-blue-600" />
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">All Tasks</h2>
			</div>
			<Button onclick={handleAddTask} class="flex items-center gap-2">
				<Plus class="h-4 w-4" />
				Add Task
			</Button>
		</div>

		{#if taskStats.totalTasks === 0}
			<div class="py-8 text-center">
				<CheckSquare class="mx-auto mb-4 h-12 w-12 text-gray-400" />
				<p class="mb-4 text-gray-500">No tasks found</p>
				<Button onclick={handleAddTask} class="flex items-center gap-2">
					<Plus class="h-4 w-4" />
					Create Your First Task
				</Button>
			</div>
		{:else}
			<!-- Enhanced Task List with Action Buttons -->
			<div class="space-y-4">
				{#each tasksData as task}
					<div class="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1">
								<div class="mb-2 flex items-center gap-3">
									<h3 class="truncate font-medium text-gray-900">{task.title}</h3>
									<span
										class="rounded-full px-2 py-1 text-xs {task.status === 'completed'
											? 'bg-green-100 text-green-800'
											: task.status === 'in_progress'
												? 'bg-blue-100 text-blue-800'
												: task.status === 'blocked'
													? 'bg-red-100 text-red-800'
													: 'bg-yellow-100 text-yellow-800'}"
									>
										{task.status}
									</span>
									{#if task.priority}
										<span
											class="rounded-full px-2 py-1 text-xs {task.priority === 'high'
												? 'bg-red-100 text-red-800'
												: task.priority === 'medium'
													? 'bg-orange-100 text-orange-800'
													: 'bg-gray-100 text-gray-800'}"
										>
											{task.priority}
										</span>
									{/if}
								</div>
								{#if task.description}
									<p class="mb-2 truncate text-sm text-gray-600">{task.description}</p>
								{/if}
								<div class="flex items-center gap-4 text-xs text-gray-500">
									{#if task.due_date}
										<span class="flex items-center gap-1">
											<Clock class="h-3 w-3" />
											Due: {new Date(task.due_date).toLocaleDateString()}
										</span>
									{/if}
									{#if task.assigned_to_name}
										<span class="flex items-center gap-1">
											<Users class="h-3 w-3" />
											Assigned to: {task.assigned_to_name}
										</span>
									{/if}
								</div>
							</div>
							<div class="ml-4 flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleViewTask(task)}
									title="View task"
								>
									<Eye class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleEditTask(task)}
									title="Edit task"
								>
									<Edit class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleDeleteTask(task)}
									title="Delete task"
									class="text-red-600 hover:text-red-700"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Task Modal -->
<TaskModal
	bind:open={showTaskModal}
	bind:task={selectedTask}
	bind:mode={modalMode}
	availableEmployees={data.employees || []}
	currentUser={data.user}
	onCancel={handleModalClose}
	onSuccess={handleTaskSuccess}
/>
