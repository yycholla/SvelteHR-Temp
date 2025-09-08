<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { createTaskForm, taskFormSchema } from '$lib/forms/task-form';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	const { form, errors, constraints, isSubmitting } = createTaskForm({
		onSuccess: () => {
			dispatch('close');
		}
	});

	function close() {
		dispatch('close');
	}
</script>

<h3 class="mb-2 font-semibold">Create Task</h3>

<form
	class="space-y-4"
	onsubmit={(e) => {
		e.preventDefault();
	}}
>
	<div class="space-y-2">
		<Label for="title">Title</Label>
		<Input id="title" bind:value={$form.title} placeholder="Enter task title" class="rounded-xl" />
		{#if $errors.title?.[0]}<div class="text-sm text-destructive">{$errors.title[0]}</div>{/if}
	</div>

	<div class="space-y-2">
		<Label for="description">Description</Label>
		<Textarea
			id="description"
			bind:value={$form.description}
			placeholder="Optional details"
			class="rounded-xl"
		/>
	</div>

	<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
		<div class="space-y-2">
			<Label for="status">Status</Label>
			<select
				id="status"
				bind:value={$form.status}
				class="w-full rounded-xl border-border bg-background px-3 py-2 transition-all duration-200 focus:bg-background"
			>
				<option value="Pending">Pending</option>
				<option value="InProgress">In Progress</option>
				<option value="Completed">Completed</option>
				<option value="Blocked">Blocked</option>
			</select>
		</div>
		<div class="space-y-2">
			<Label for="dueDate">Due date</Label>
			<Input id="dueDate" type="date" bind:value={$form.dueDate} class="rounded-xl" />
		</div>
	</div>

	<div class="flex justify-end gap-2 pt-2">
		<Button variant="outline" type="button" onclick={close} class="rounded-xl">Cancel</Button>
		<Button type="submit" class="rounded-xl" disabled={$isSubmitting}>
			{$isSubmitting ? 'Creating...' : 'Create Task'}
		</Button>
	</div>
</form>
