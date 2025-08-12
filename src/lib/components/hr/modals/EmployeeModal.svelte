<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { modalStore } from '$lib/stores/hr/modals';
	import EmployeeForm from '../forms/EmployeeForm.svelte';
	import type { Employee } from '$lib/schemas/employee';

	let { 
		open = $bindable(false),
		employee = $bindable<Employee | null>(null),
		mode = $bindable<'create' | 'edit' | 'view'>('create')
	}: {
		open: boolean;
		employee?: Employee | null;
		mode?: 'create' | 'edit' | 'view';
	} = $props();

	const modalTitle = $derived(
		mode === 'create' ? 'Add New Employee' :
		mode === 'edit' ? `Edit Employee: ${employee?.firstName} ${employee?.lastName}` :
		mode === 'view' ? `Employee Details: ${employee?.firstName} ${employee?.lastName}` :
		'Employee'
	);

	function handleClose() {
		open = false;
		modalStore.close();
	}

	function handleSuccess(savedEmployee: Employee) {
		open = false;
		modalStore.close();
	}
</script>

<Dialog bind:open={open}>
	<DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>{modalTitle}</DialogTitle>
		</DialogHeader>

		<EmployeeForm
			{employee}
			{mode}
			onCancel={handleClose}
			onSuccess={handleSuccess}
		/>
	</DialogContent>
</Dialog>