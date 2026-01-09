<script lang="ts">
	import { goto } from '$app/navigation';
	import { logger } from '$lib/utils/logger';
	import { page } from '$app/stores';
	import { Check, Edit, Plus, Search, Trash2, X } from '@lucide/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import {
		CREATE_TASK_TYPE,
		DELETE_TASK_TYPE,
		UPDATE_TASK_TYPE
	} from '$lib/graphql/tasks-operations';
	import type { CreateTaskTypeInput, TaskType, UpdateTaskTypeInput } from '$lib/types/task';

	const { data } = $props();

	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let selectedTaskType = $state<TaskType | null>(null);
	let searchQuery = $state('');
	let loading = $state(false);
	let errorMessage = $state('');

	// Form state for create/edit
	let formData = $state<CreateTaskTypeInput & { isActive?: boolean }>({
		name: '',
		description: '',
		defaultPriority: '',
		colorCode: '#3B82F6'
	});

	// Filtered task types based on search query
	const filteredTaskTypes = $derived(
		data.taskTypes.filter((taskType: { name?: string; description?: string }) => {
			if (!searchQuery) return true;
			const query = searchQuery.toLowerCase();
			return (
				taskType.name?.toLowerCase().includes(query) ||
				taskType.description?.toLowerCase().includes(query)
			);
		})
	);

	function openCreateModal() {
		formData = {
			name: '',
			description: '',
			defaultPriority: 'Medium',
			colorCode: '#3B82F6'
		};
		showCreateModal = true;
		errorMessage = '';
	}

	function openEditModal(taskType: TaskType) {
		selectedTaskType = taskType;
		formData = {
			name: taskType.name,
			description: taskType.description || '',
			defaultPriority: taskType.defaultPriority || 'Medium',
			colorCode: taskType.colorCode || '#3B82F6',
			isActive: taskType.isActive
		};
		showEditModal = true;
		errorMessage = '';
	}

	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		selectedTaskType = null;
		errorMessage = '';
	}

	async function handleCreateTaskType() {
		if (!formData.name) {
			errorMessage = 'Name is required';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const client = createUrqlClient();

			await client.mutation(CREATE_TASK_TYPE, {
				input: {
					name: formData.name,
					description: formData.description || undefined,
					defaultPriority: formData.defaultPriority || undefined,
					colorCode: formData.colorCode || undefined
				}
			});

			closeModals();
			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			logger.error('Create task type error:', error as Error);
			errorMessage = 'Failed to create task type';
		} finally {
			loading = false;
		}
	}

	async function handleUpdateTaskType() {
		if (!selectedTaskType || !formData.name) {
			errorMessage = 'Invalid task type data';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const client = createUrqlClient();

			const updateInput: UpdateTaskTypeInput = {
				name: formData.name,
				description: formData.description || undefined,
				defaultPriority: formData.defaultPriority || undefined,
				colorCode: formData.colorCode || undefined,
				isActive: formData.isActive
			};

			await client.mutation(UPDATE_TASK_TYPE, {
				id: selectedTaskType.id,
				input: updateInput
			});

			closeModals();
			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			logger.error('Update task type error:', error as Error);
			errorMessage = 'Failed to update task type';
		} finally {
			loading = false;
		}
	}

	async function handleDeleteTaskType(taskTypeId: string) {
		if (!confirm('Are you sure you want to delete this task type?')) {
			return;
		}

		loading = true;
		try {
			const client = createUrqlClient();

			await client.mutation(DELETE_TASK_TYPE, {
				id: taskTypeId
			});

			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			logger.error('Delete task type error:', error as Error);
			errorMessage = 'Failed to delete task type';
		} finally {
			loading = false;
		}
	}

	async function toggleTaskTypeStatus(taskType: TaskType) {
		loading = true;
		try {
			const client = createUrqlClient();

			await client.mutation(UPDATE_TASK_TYPE, {
				id: taskType.id,
				input: {
					isActive: !taskType.isActive
				}
			});

			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			logger.error('Toggle status error:', error as Error);
			errorMessage = 'Failed to update task type status';
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Task Types Management</h1>
			<p class="text-muted-foreground">Manage task types for task classification</p>
		</div>
		<button
			onclick={openCreateModal}
			class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
		>
			<Plus class="h-4 w-4" />
			Create Task Type
		</button>
	</div>

	<!-- Error message -->
	{#if data.error}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			{data.error}
		</div>
	{/if}

	{#if errorMessage}
		<div class="rounded-md bg-destructive/10 p-4 text-destructive">
			{errorMessage}
		</div>
	{/if}

	<!-- Search -->
	<div class="relative flex-1">
		<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search task types by name or description..."
			class="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
		/>
	</div>

	<!-- Task Types Table -->
	<div class="overflow-x-auto rounded-md border">
		<table class="w-full text-sm">
			<thead class="border-b bg-muted/50">
				<tr>
					<th class="px-4 py-3 text-left font-medium">Name</th>
					<th class="px-4 py-3 text-left font-medium">Description</th>
					<th class="px-4 py-3 text-left font-medium">Default Priority</th>
					<th class="px-4 py-3 text-left font-medium">Color</th>
					<th class="px-4 py-3 text-left font-medium">Status</th>
					<th class="px-4 py-3 text-right font-medium">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredTaskTypes as taskType (taskType.id)}
					<tr class="border-b hover:bg-muted/50">
						<td class="px-4 py-3 font-medium">{taskType.name}</td>
						<td class="px-4 py-3 text-muted-foreground">
							{taskType.description || '—'}
						</td>
						<td class="px-4 py-3">
							{taskType.defaultPriority || '—'}
						</td>
						<td class="px-4 py-3">
							{#if taskType.colorCode}
								<div class="flex items-center gap-2">
									<div
										class="h-4 w-4 rounded border"
										style="background-color: {taskType.colorCode}"
									></div>
									<span class="text-xs text-muted-foreground">{taskType.colorCode}</span>
								</div>
							{:else}
								—
							{/if}
						</td>
						<td class="px-4 py-3">
							<button
								onclick={() => toggleTaskTypeStatus(taskType)}
								disabled={loading}
								class="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
								class:bg-green-100={taskType.isActive}
								class:text-green-700={taskType.isActive}
								class:bg-red-100={!taskType.isActive}
								class:text-red-700={!taskType.isActive}
							>
								{#if taskType.isActive}
									<Check class="h-3 w-3" />
									Active
								{:else}
									<X class="h-3 w-3" />
									Inactive
								{/if}
							</button>
						</td>
						<td class="px-4 py-3 text-right">
							<div class="flex justify-end gap-2">
								<button
									onclick={() => openEditModal(taskType)}
									disabled={loading}
									class="rounded-md p-2 hover:bg-accent"
									title="Edit task type"
								>
									<Edit class="h-4 w-4" />
								</button>
								<button
									onclick={() => handleDeleteTaskType(taskType.id)}
									disabled={loading}
									class="rounded-md p-2 text-destructive hover:bg-destructive/10"
									title="Delete task type"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
							No task types found
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Summary -->
	<div class="text-sm text-muted-foreground">
		Total: {data.totalCount} task type{data.totalCount === 1 ? '' : 's'}
	</div>
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-bold">Create Task Type</h2>

			{#if errorMessage}
				<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{errorMessage}
				</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label class="mb-1 block text-sm font-medium" for="create-name">
						Name <span class="text-destructive">*</span>
					</label>
					<input
						id="create-name"
						type="text"
						bind:value={formData.name}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						placeholder="e.g., Bug, Feature, Enhancement"
						required
					/>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium" for="create-description">
						Description
					</label>
					<textarea
						id="create-description"
						bind:value={formData.description}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						placeholder="Brief description of this task type..."
						rows="3"
					></textarea>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium" for="create-priority">
						Default Priority
					</label>
					<select
						id="create-priority"
						bind:value={formData.defaultPriority}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="Low">Low</option>
						<option value="Medium">Medium</option>
						<option value="High">High</option>
						<option value="Urgent">Urgent</option>
					</select>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium" for="create-color"> Color Code </label>
					<div class="flex gap-2">
						<input
							id="create-color"
							type="color"
							bind:value={formData.colorCode}
							class="h-10 w-16 rounded-md border border-input"
						/>
						<input
							type="text"
							bind:value={formData.colorCode}
							class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							placeholder="#3B82F6"
						/>
					</div>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-2">
				<button
					onclick={closeModals}
					disabled={loading}
					class="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
				>
					Cancel
				</button>
				<button
					onclick={handleCreateTaskType}
					disabled={loading}
					class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{loading ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Modal -->
{#if showEditModal && selectedTaskType}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-bold">Edit Task Type</h2>

			{#if errorMessage}
				<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{errorMessage}
				</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label class="mb-1 block text-sm font-medium" for="edit-name">
						Name <span class="text-destructive">*</span>
					</label>
					<input
						id="edit-name"
						type="text"
						bind:value={formData.name}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						required
					/>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium" for="edit-description"> Description </label>
					<textarea
						id="edit-description"
						bind:value={formData.description}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						rows="3"
					></textarea>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium" for="edit-priority">
						Default Priority
					</label>
					<select
						id="edit-priority"
						bind:value={formData.defaultPriority}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="Low">Low</option>
						<option value="Medium">Medium</option>
						<option value="High">High</option>
						<option value="Urgent">Urgent</option>
					</select>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium" for="edit-color"> Color Code </label>
					<div class="flex gap-2">
						<input
							id="edit-color"
							type="color"
							bind:value={formData.colorCode}
							class="h-10 w-16 rounded-md border border-input"
						/>
						<input
							type="text"
							bind:value={formData.colorCode}
							class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						/>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<input
						id="edit-active"
						type="checkbox"
						bind:checked={formData.isActive}
						class="h-4 w-4 rounded border-input"
					/>
					<label for="edit-active" class="text-sm font-medium">Active</label>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-2">
				<button
					onclick={closeModals}
					disabled={loading}
					class="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
				>
					Cancel
				</button>
				<button
					onclick={handleUpdateTaskType}
					disabled={loading}
					class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{loading ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</div>
	</div>
{/if}
