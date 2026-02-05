<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { logger } from '$lib/utils/logger';
	import { ChevronRight, Pencil, Trash2 } from '@lucide/svelte';
	import { confirmService } from '$lib/stores/confirm.svelte';

	// Import decomposed components and logic
	import EmployeeModals from '$lib/components/employees/detail/EmployeeModals.svelte';
	import EmployeeProfile from '$lib/components/employees/detail/EmployeeProfile.svelte';
	import type { EmployeeActionState } from '$lib/components/employees/detail/types';
	import {
		assignDocuments,
		unassignDocument,
		saveEmergencyContact,
		deleteEmergencyContact,
		saveVehicle,
		deleteVehicle
	} from '$lib/components/employees/detail/actions';

	import type { EmergencyContactInput } from '$lib/components/employees/AddEmergencyContactModal.svelte';
	import type { VehicleInput } from '$lib/components/employees/AddVehicleModal.svelte';

	interface Props {
		data: any;
	}

	const { data }: Props = $props();

	// Extract data
	const employee = $derived(data.employee);
	const permissions = $derived(data.permissions);

	// Debug: Log permissions to console
	$effect(() => {
		logger.info(`[Employee Detail Page] Permissions: ${permissions}`);
	});

	// Modal state
	let state = $state<EmployeeActionState>({
		isAssignDocsModalOpen: false,
		isAssigningDocs: false,
		isAddEmergencyContactModalOpen: false,
		isSavingEmergencyContact: false,
		editingContact: null,
		isVehicleModalOpen: false,
		isSavingVehicle: false,
		editingVehicle: null,
		isUnassigningDocument: false,
		isUploadDocumentModalOpen: false
	});

	// Handlers
	async function handleAssignDocuments(documentIds: string[]) {
		state.isAssigningDocs = true;
		const success = await assignDocuments(employee.id, documentIds);
		state.isAssigningDocs = false;
		if (success) {
			state.isAssignDocsModalOpen = false;
			window.location.reload();
		}
	}

	async function handleUnassignDocument(assignmentId: string) {
		// Confirm service logic should be here or inside action?
		// Original file imported confirmService.
		// For simplicity, I'll assume confirmService is handled or I'll re-import it here.
		// Wait, I didn't import confirmService in actions.ts.
		// So I should keep confirm logic here or pass it.
		// I'll re-import confirmService here.
		const { confirmService } = await import('$lib/stores/confirm.svelte');
		const confirmed = await confirmService.ask({
			title: 'Unassign Document',
			message: 'Are you sure you want to unassign this document?',
			variant: 'destructive',
			confirmText: 'Unassign'
		});
		if (!confirmed) return;

		state.isUnassigningDocument = true;
		const success = await unassignDocument(assignmentId);
		state.isUnassigningDocument = false;
		if (success) window.location.reload();
	}

	function handleUploadDocumentSuccess() {
		state.isUploadDocumentModalOpen = false;
		window.location.reload();
	}

	async function handleSaveEmergencyContact(contact: EmergencyContactInput) {
		state.isSavingEmergencyContact = true;
		const success = await saveEmergencyContact(contact, employee.id);
		state.isSavingEmergencyContact = false;
		if (success) {
			state.isAddEmergencyContactModalOpen = false;
			state.editingContact = null;
			window.location.reload();
		}
	}

	async function handleDeleteEmergencyContact(contactId: string) {
		const { confirmService } = await import('$lib/stores/confirm.svelte');
		const confirmed = await confirmService.ask({
			title: 'Remove Emergency Contact',
			message: 'Are you sure?',
			variant: 'destructive',
			confirmText: 'Remove'
		});
		if (!confirmed) return;

		const success = await deleteEmergencyContact(contactId);
		if (success) window.location.reload();
	}

	function openAddEmergencyContactModal() {
		state.editingContact = null;
		state.isAddEmergencyContactModalOpen = true;
	}

	function openEditEmergencyContactModal(contact: any) {
		state.editingContact = {
			id: contact.id,
			employeeId: employee.id,
			name: contact.name,
			relationship: contact.relationship,
			phoneNumber: contact.phoneNumber,
			email: contact.email,
			isPrimary: contact.isPrimary
		};
		state.isAddEmergencyContactModalOpen = true;
	}

	async function handleSaveVehicle(vehicleData: VehicleInput) {
		state.isSavingVehicle = true;
		const success = await saveVehicle(vehicleData, state.editingVehicle?.id);
		state.isSavingVehicle = false;
		if (success) {
			state.isVehicleModalOpen = false;
			state.editingVehicle = null;
			window.location.reload();
		}
	}

	async function handleDeleteVehicle(vehicleId: string) {
		const { confirmService } = await import('$lib/stores/confirm.svelte');
		const confirmed = await confirmService.ask({
			title: 'Remove Vehicle',
			message: 'Are you sure?',
			variant: 'destructive',
			confirmText: 'Remove'
		});
		if (!confirmed) return;

		const success = await deleteVehicle(vehicleId);
		if (success) window.location.reload();
	}

	function openAddVehicleModal() {
		state.editingVehicle = null;
		state.isVehicleModalOpen = true;
	}

	function openEditVehicleModal(vehicle: any) {
		state.editingVehicle = vehicle;
		state.isVehicleModalOpen = true;
	}
</script>

<svelte:head>
	<title>{employee ? employee.displayName : 'Employee'} - Employee Profile - MountainHR</title>
	<meta name="description" content="Employee profile" />
</svelte:head>

<div class="container mx-auto max-w-7xl p-6 md:p-10">
	{#if !employee}
		<div class="flex h-[50vh] items-center justify-center">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
			></div>
		</div>
	{:else}
		<!-- Top Navigation / Breadcrumbs -->
		<div class="mb-8 flex items-center justify-between">
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<a href="/dashboard" class="hover:text-foreground">Dashboard</a>
				<ChevronRight class="h-4 w-4" />
				<a href="/dashboard/employees" class="hover:text-foreground">Employees</a>
				<ChevronRight class="h-4 w-4" />
				<span class="font-medium text-foreground">{employee.displayName}</span>
			</div>
			<div class="flex gap-3">
				{#if permissions.canManageEmployees}
					<Button href="/dashboard/employees/{employee.id}/edit" size="sm" class="gap-2">
						<Pencil class="h-4 w-4" />
						Edit Profile
					</Button>

					<form method="POST" action="?/delete" use:enhance>
						<Button
							type="submit"
							variant="destructive"
							size="sm"
							class="gap-2"
							onclick={(e) => {
								if (
									!confirm(
										`Are you sure you want to delete ${employee.displayName}? This action will deactivate the employee account and cannot be undone.`
									)
								) {
									e.preventDefault();
								}
							}}
						>
							<Trash2 class="h-4 w-4" />
							Delete
						</Button>
					</form>
				{/if}
			</div>
		</div>

		<!-- Main Bento Grid Layout -->
		<EmployeeProfile
			{employee}
			{permissions}
			isUnassigningDocument={state.isUnassigningDocument}
			onAddContact={openAddEmergencyContactModal}
			onEditContact={openEditEmergencyContactModal}
			onDeleteContact={handleDeleteEmergencyContact}
			onAddVehicle={openAddVehicleModal}
			onEditVehicle={openEditVehicleModal}
			onDeleteVehicle={handleDeleteVehicle}
			onUploadDocument={() => (state.isUploadDocumentModalOpen = true)}
			onAssignDocument={() => (state.isAssignDocsModalOpen = true)}
			onUnassignDocument={handleUnassignDocument}
		/>
	{/if}
</div>

<!-- Modals -->
{#if employee}
	<EmployeeModals
		{employee}
		{permissions}
		availableDocuments={data.availableDocuments}
		bind:state
		onAssignDocuments={handleAssignDocuments}
		onSaveContact={handleSaveEmergencyContact}
		onSaveVehicle={handleSaveVehicle}
		onUploadSuccess={handleUploadDocumentSuccess}
	/>
{/if}
