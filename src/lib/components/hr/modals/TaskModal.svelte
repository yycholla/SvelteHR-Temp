<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { modalStore } from '$lib/stores/hr/modals.svelte';
	import TaskForm from '../forms/TaskForm.svelte';
	import type { Task, Employee } from '$lib/api/types-v2';

	let {
		open = $bindable(false),
		task = $bindable<Task | null>(null),
		mode = $bindable<'create' | 'edit' | 'view'>('create'),
		availableEmployees = [],
		currentUser = null
	}: {
		open: boolean;
		task?: Task | null;
		mode?: 'create' | 'edit' | 'view';
		availableEmployees?: Employee[];
		currentUser?: any;
	} = $props();

	const modalTitle = $derived(
		mode === 'create'
			? 'Create New Task'
			: mode === 'edit'
				? `Edit Task: ${task?.title}`
				: mode === 'view'
					? `Task Details: ${task?.title}`
					: 'Task'
	);

	function handleClose() {
		open = false;
		modalStore.close();
	}

	function handleSuccess(savedTask: Task) {
		open = false;
		modalStore.close();
	}
</script>

<Dialog bind:open>
	<DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
		<DialogHeader>
			<DialogTitle>{modalTitle}</DialogTitle>
		</DialogHeader>

		<TaskForm
			{task}
			{mode}
			{availableEmployees}
			{currentUser}
			onCancel={handleClose}
			onSuccess={handleSuccess}
		/>
	</DialogContent>
</Dialog>
