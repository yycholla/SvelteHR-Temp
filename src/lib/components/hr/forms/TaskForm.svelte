<script lang="ts">
	import { createTaskForm, updateTaskForm } from '$lib/forms/task-form';
	import type { Task } from '$lib/schemas/task';

	let {
		task = null,
		mode = 'create',
		onCancel,
		onSuccess
	}: {
		task: Task | null;
		mode: 'create' | 'edit' | 'view';
		onCancel: () => void;
		onSuccess: (task: Task) => void;
	} = $props();

	const isReadonly = $derived(mode === 'view');
	const isEditing = $derived(mode === 'edit');

	// Use the existing task form helper
	const { form: formData, errors, enhance, submitting } = createTaskForm({ 
		onSuccess: (createdTask) => onSuccess(createdTask)
	});

	// Initialize form data for edit mode
	$effect(() => {
		if (isEditing && task) {
			$formData = {
				title: task.title || '',
				description: task.description || '',
				status: task.status || 'Pending',
				dueDate: task.dueDate || '',
				assignedToId: task.assignedToId || undefined,
				relatedEntityType: task.relatedEntityType || undefined
			};
		}
	});
</script>

{#if isReadonly && task}
	<!-- View Mode - Read-only display -->
	<div class="space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<label class="label"><span>Title</span></label>
				<p class="font-medium text-lg">{task.title}</p>
			</div>
			<div>
				<label class="label"><span>Status</span></label>
				<p>{task.status}</p>
			</div>
			<div class="md:col-span-2">
				<label class="label"><span>Description</span></label>
				<p>{task.description || 'No description provided'}</p>
			</div>
			<div>
				<label class="label"><span>Due Date</span></label>
				<p>{task.dueDate || 'No due date set'}</p>
			</div>
			<div>
				<label class="label"><span>Assigned To</span></label>
				<p>{task.assignedToId || 'Unassigned'}</p>
			</div>
			<div>
				<label class="label"><span>Related Entity Type</span></label>
				<p>{task.relatedEntityType || 'General'}</p>
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

			<!-- Assigned To ID -->
			<div>
				<label class="label" for="assignedToId">
					<span>Assigned To (Employee ID)</span>
				</label>
				<input
					id="assignedToId"
					name="assignedToId"
					type="number"
					class="input"
					bind:value={$formData.assignedToId}
					placeholder="Enter employee ID"
				/>
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
		@apply !border-error-500 !bg-error-50 dark:!bg-error-900/20;
	}
</style>