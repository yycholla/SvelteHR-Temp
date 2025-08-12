<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { modalStore } from '$lib/stores/hr/modals';
	import TaskForm from '../forms/TaskForm.svelte';
	import type { Task } from '$lib/schemas/task';

	let { 
		open = $bindable(false),
		task = $bindable<Task | null>(null),
		mode = $bindable<'create' | 'edit' | 'view'>('create')
	}: {
		open: boolean;
		task?: Task | null;
		mode?: 'create' | 'edit' | 'view';
	} = $props();

	const modalTitle = $derived(
		mode === 'create' ? 'Create New Task' :
		mode === 'edit' ? `Edit Task: ${task?.title}` :
		mode === 'view' ? `Task Details: ${task?.title}` :
		'Task'
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

<Dialog bind:open={open}>
	<DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>{modalTitle}</DialogTitle>
		</DialogHeader>

		<TaskForm
			{task}
			{mode}
			onCancel={handleClose}
			onSuccess={handleSuccess}
		/>
	</DialogContent>
</Dialog>