<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { modalStore } from '$lib/stores/hr/modals';
	import EmployeeForm from '../forms/EmployeeForm.svelte';
	import type { Employee, Role, Department } from '$lib/api/types-v2';

	let {
		open = $bindable(false),
		employee = $bindable<Employee | null>(null),
		mode = $bindable<'create' | 'edit' | 'view'>('create'),
		availableRoles = [],
		availableDepartments = []
	}: {
		open: boolean;
		employee?: Employee | null;
		mode?: 'create' | 'edit' | 'view';
		availableRoles?: Role[];
		availableDepartments?: Department[];
	} = $props();

	const modalTitle = $derived(
		mode === 'create'
			? 'Add New Employee'
			: mode === 'edit'
				? `Edit Employee: ${employee?.first_name} ${employee?.last_name}`
				: mode === 'view'
					? `Employee Details: ${employee?.first_name} ${employee?.last_name}`
					: 'Employee'
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

<Dialog bind:open>
	<DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
		<DialogHeader>
			<DialogTitle>{modalTitle}</DialogTitle>
		</DialogHeader>

		<EmployeeForm
			{employee}
			{mode}
			{availableRoles}
			{availableDepartments}
			onCancel={handleClose}
			onSuccess={handleSuccess}
		/>
	</DialogContent>
</Dialog>
