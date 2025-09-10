<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { modalStore } from '$lib/stores/hr/modals.svelte';
	import { employeeStore } from '$lib/stores/hr/employees.svelte';
	import { notifications } from '$lib/components/hr/utils/notifications';
	import { employeeApi } from '$lib/components/hr/utils/api-helpers';
	import EmployeeDetail from '$lib/components/hr/pages/EmployeeDetail.svelte';
	import EmployeeModal from '$lib/components/hr/modals/EmployeeModal.svelte';
	import type { PageData } from './$types';
	import type { Employee } from '$lib/stores/hr/employees.svelte';

	let { data }: { data: PageData } = $props();

	let showEditModal = $state(false);
	let showDeleteConfirm = $state(false);

	// Set the selected employee in the store
	$effect(() => {
		if (data.employee) {
			employeeStore.setSelectedEmployee(data.employee);
		}
	});

	function handleEdit(employee: Employee) {
		modalStore.open('employee', employee, 'edit');
		showEditModal = true;
	}

	function handleDelete(employee: Employee) {
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (!data.employee) return;

		try {
			await employeeApi.delete(data.employee.id);
			notifications.employeeDeleted(`${data.employee.first_name} ${data.employee.last_name}`);
			employeeStore.removeEmployee(data.employee.id);

			// Navigate back to employees list
			goto('/hr/employees');
		} catch (error) {
			notifications.apiError('Failed to delete employee');
		} finally {
			showDeleteConfirm = false;
		}
	}

	function handleEditSuccess(updatedEmployee: Employee) {
		// Update the page data
		data.employee = updatedEmployee;
		employeeStore.updateEmployee(updatedEmployee);
		showEditModal = false;
	}
</script>

<svelte:head>
	<title>
		{data.employee
			? `${data.employee.first_name} ${data.employee.last_name} - Employee Details`
			: 'Employee Details'} | SvelteHR
	</title>
	<meta name="description" content="Employee details and information" />
</svelte:head>

<div class="container mx-auto p-6">
	<!-- Breadcrumb -->
	<nav class="breadcrumb mb-6">
		<ol class="flex items-center space-x-2 text-sm">
			<li><a href="/" class="anchor">Home</a></li>
			<li class="text-surface-400">/</li>
			<li><a href="/hr" class="anchor">HR</a></li>
			<li class="text-surface-400">/</li>
			<li><a href="/hr/employees" class="anchor">Employees</a></li>
			<li class="text-surface-400">/</li>
			<li class="text-surface-600-300-token">
				{data.employee ? `${data.employee.first_name} ${data.employee.last_name}` : 'Employee'}
			</li>
		</ol>
	</nav>

	<!-- Main Content -->
	{#if data.employee}
		<EmployeeDetail employeeId={data.employee.id} onEdit={handleEdit} onDelete={handleDelete} />
	{:else}
		<div class="card p-8 text-center">
			<h2 class="mb-4 h2">Employee Not Found</h2>
			<p class="text-surface-600-300-token mb-6">
				The employee you're looking for could not be found.
			</p>
			<a href="/hr/employees" class="variant-filled-primary btn"> Back to Employees </a>
		</div>
	{/if}
</div>

<!-- Edit Modal -->
<EmployeeModal
	bind:open={showEditModal}
	employee={data.employee}
	mode="edit"
	availableRoles={[]}
	availableDepartments={[]}
	onSuccess={handleEditSuccess}
/>

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
					Are you sure you want to delete employee
					<strong>{data.employee?.first_name} {data.employee?.last_name}</strong>?
				</p>
				<p class="mt-2 text-sm text-error-500">This action cannot be undone.</p>
			</section>

			<footer class="flex justify-end gap-3">
				<button class="variant-ghost-surface btn" on:click={() => (showDeleteConfirm = false)}>
					Cancel
				</button>
				<button class="variant-filled-error btn" on:click={confirmDelete}> Delete Employee </button>
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
