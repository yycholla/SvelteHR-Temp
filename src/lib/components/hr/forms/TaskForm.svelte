<script lang="ts">
	import { createTaskForm } from '$lib/forms/task-form';
	import type { Task, Employee } from '$lib/api/types-v2';

	let {
		task = null,
		mode = 'create',
		availableEmployees = [],
		currentUser = null,
		onCancel,
		onSuccess
	}: {
		task: Task | null;
		mode: 'create' | 'edit' | 'view';
		availableEmployees?: Employee[];
		currentUser?: any;
		onCancel: () => void;
		onSuccess: (task: Task) => void;
	} = $props();

	const isReadonly = $derived(mode === 'view');
	const isEditing = $derived(mode === 'edit');

	// Use the custom task form helper
	const { form: formData, errors, enhance, submitting } = createTaskForm({ 
		onSuccess: (createdTask) => onSuccess(createdTask)
	});

	// Debug logging
	$effect(() => {
		console.log('📋 TaskForm Debug:', {
			availableEmployees: availableEmployees?.length || 0,
			currentUser: currentUser?.full_name || 'None',
			mode
		});
	});

	// Initialize form data for create/edit modes  
	$effect(() => {
		if (mode === 'create') {
			// Set default assignee to current user for new tasks
			$formData = {
				title: '',
				description: '',
				status: 'Pending',
				dueDate: '',
				assignedToId: currentUser?.id || '',
				relatedEntityType: 'General'
			};
		} else if (isEditing && task) {
			$formData = {
				title: task.title || '',
				description: task.description || '',
				status: task.status === 'todo' ? 'Pending' : 
					   task.status === 'in_progress' ? 'InProgress' : 
					   task.status === 'completed' ? 'Completed' : 'Pending',
				dueDate: task.due_date || '',
				assignedToId: task.assigned_to || '',
				relatedEntityType: 'General' // Default since API doesn't have this field
			};
		}
	});
</script>

{#if isReadonly && task}
	<!-- View Mode - Read-only display -->
	<div class="space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<div class="label"><span>Title</span></div>
				<p class="font-medium text-lg">{task.title}</p>
			</div>
			<div>
				<div class="label"><span>Status</span></div>
				<p>{task.status}</p>
			</div>
			<div class="md:col-span-2">
				<div class="label"><span>Description</span></div>
				<p>{task.description || 'No description provided'}</p>
			</div>
			<div>
				<div class="label"><span>Due Date</span></div>
				<p>{task.due_date || 'No due date set'}</p>
			</div>
			<div>
				<div class="label"><span>Assigned To</span></div>
				<p>{task.assignee?.full_name || task.assigned_to || 'Unassigned'}</p>
			</div>
			<div>
				<div class="label"><span>Priority</span></div>
				<p>{task.priority || 'Normal'}</p>
			</div>
		</div>
		<div class="flex justify-end pt-6 border-t">
			<button type="button" class="btn variant-ghost-surface" onclick={onCancel}>
				Close
			</button>
		</div>
	</div>
{:else}
	<!-- Create/Edit Mode - Form -->
	<form method="POST" use:enhance class="space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Title -->
			<div class="md:col-span-2">
				<label class="label" for="title">
					<span>Title *</span>
				</label>
				<input
					id="title"
					name="title"
					type="text"
					class="input"
					class:input-error={$errors.title}
					bind:value={$formData.title}
					placeholder="Enter task title"
					aria-invalid={$errors.title ? 'true' : undefined}
				/>
				{#if $errors.title}
					<div class="text-error-500 text-sm mt-1">{$errors.title}</div>
				{/if}
			</div>

			<!-- Status -->
			<div>
				<label class="label" for="status">
					<span>Status</span>
				</label>
				<select
					id="status"
					name="status"
					class="select"
					bind:value={$formData.status}
				>
					<option value="Pending">Pending</option>
					<option value="InProgress">In Progress</option>
					<option value="Completed">Completed</option>
					<option value="Blocked">Blocked</option>
				</select>
			</div>

			<!-- Due Date -->
			<div>
				<label class="label" for="dueDate">
					<span>Due Date</span>
				</label>
				<input
					id="dueDate"
					name="dueDate"
					type="datetime-local"
					class="input"
					bind:value={$formData.dueDate}
				/>
			</div>

			<!-- Assigned To -->
			<div>
				<label class="label" for="assignedToId">
					<span>Assigned To</span>
				</label>
				<select
					id="assignedToId"
					name="assignedToId"
					class="select"
					bind:value={$formData.assignedToId}
				>
					<option value="">Unassigned</option>
					<!-- Current User (fallback if no employees in database) -->
					{#if currentUser && (!availableEmployees?.length || !availableEmployees.some(emp => emp.id === currentUser.id))}
						<option value={currentUser.id}>
							{currentUser.full_name || currentUser.username || 'Current User'} (You)
						</option>
					{/if}
					<!-- Regular employees from database -->
					{#each availableEmployees || [] as employee}
						<option value={employee.id}>
							{employee.full_name} ({employee.email})
						</option>
					{/each}
				</select>
			</div>

			<!-- Related Entity Type -->
			<div>
				<label class="label" for="relatedEntityType">
					<span>Category</span>
				</label>
				<select
					id="relatedEntityType"
					name="relatedEntityType"
					class="select"
					bind:value={$formData.relatedEntityType}
				>
					<option value="General">General</option>
					<option value="Onboarding">Onboarding</option>
					<option value="Offboarding">Offboarding</option>
					<option value="Compliance">Compliance</option>
				</select>
			</div>

			<!-- Description -->
			<div class="md:col-span-2">
				<label class="label" for="description">
					<span>Description</span>
				</label>
				<textarea
					id="description"
					name="description"
					class="textarea"
					rows="4"
					bind:value={$formData.description}
					placeholder="Enter task description"
				></textarea>
			</div>
		</div>

		<!-- Form Actions -->
		<div class="flex justify-end gap-4 pt-6 border-t">
			<button
				type="button"
				class="btn variant-ghost-surface"
				onclick={onCancel}
				disabled={$submitting}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="btn variant-filled-primary"
				disabled={$submitting}
			>
				{#if $submitting}
					<span class="animate-pulse">Saving...</span>
				{:else}
					{isEditing ? 'Update Task' : 'Create Task'}
				{/if}
			</button>
		</div>
	</form>
{/if}

<style>
	.input-error {
		border-color: rgb(239 68 68) !important;
		background-color: rgb(254 242 242) !important;
	}
	:global(.dark) .input-error {
		background-color: rgb(127 29 29 / 0.2) !important;
	}
</style>