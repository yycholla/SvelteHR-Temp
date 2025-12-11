<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { logger } from '$lib/utils/logger';
	import AssignDocumentsModal from '$lib/components/employees/AssignDocumentsModal.svelte';
	import UploadDocumentModal from '$lib/components/documents/UploadDocumentModal.svelte';
	import AddEmergencyContactModal,
		{
		type EmergencyContactInput
		} from '$lib/components/employees/AddEmergencyContactModal.svelte';
	import AddVehicleModal,
		{
		type VehicleInput
		} from '$lib/components/employees/AddVehicleModal.svelte';
	import { ChevronRight, Pencil } from '@lucide/svelte';
	import { confirmService } from '$lib/stores/confirm.svelte';
	import { toast } from 'svelte-sonner';
	import {
		EmployeeActivityCard,
		EmployeeContactCard,
		EmployeeDependentsCard,
		EmployeeDocumentsCard,
		EmployeeEmergencyContactsCard,
		EmployeeHistoryCard,
		EmployeePerformanceCard,
		EmployeePersonalInfoCard,
		EmployeeVehicleCard
	} from './components';

	interface Props {
		data: any;
	}

	const { data }: Props = $props();

	// Extract data
	const employee = $derived(data.employee);
	const permissions = $derived(data.permissions);

	// Debug: Log permissions to console
	$effect(() => {
		logger.info('[Employee Detail Page] Permissions:'.replace(/['`]$/, `: ${permissions}'`/));
	});

	// Modal state
	let isAssignDocsModalOpen = $state(false);
	let isAssigningDocs = $state(false);
	let isAddEmergencyContactModalOpen = $state(false);
	let isSavingEmergencyContact = $state(false);
	let editingContact = $state<EmergencyContactInput | null>(null);
	let isVehicleModalOpen = $state(false);
	let isSavingVehicle = $state(false);
	let editingVehicle = $state<any>(null);
	let isUnassigningDocument = $state(false);
	let isUploadDocumentModalOpen = $state(false);

	// Handle document assignment
	async function handleAssignDocuments(documentIds: string[]) {
		isAssigningDocs = true;
		try {
			const response = await fetch(`/api/employees/${employee.id}/assign-documents`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentIds })
			});

			if (!response.ok) {
				throw new Error('Failed to assign documents');
			}

			const result = await response.json();
			toast.success('Documents Assigned', {
				description: `${result.message}\nAssigned: ${result.assignedCount}, Skipped: ${result.skippedCount}`
			});

			// Close modal and reload page
			isAssignDocsModalOpen = false;
			window.location.reload();
		} catch (error) {
			logger.error('Assignment error:', error as Error);
			toast.error('Assignment Failed', {
				description: 'Failed to assign documents. Please try again.'
			});
		} finally {
			isAssigningDocs = false;
		}
	}

	// Handle document unassignment
	async function handleUnassignDocument(assignmentId: string) {
		const confirmed = await confirmService.ask({
			title: 'Unassign Document',
			message:
				'Are you sure you want to unassign this document from the employee? The document itself will not be deleted.',
			variant: 'destructive',
			confirmText: 'Unassign'
		});

		if (!confirmed) return;

		isUnassigningDocument = true;
		try {
			// Use the deleteDocumentAssignment mutation
			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						mutation DeleteDocumentAssignment($id: UUID!) {
							deleteDocumentAssignment(id: $id)
						}
					`,
					variables: {
						id: assignmentId
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			toast.success('Document Unassigned', {
				description: 'Document successfully unassigned from employee.'
			});
			window.location.reload();
		} catch (error) {
			logger.error('Failed to unassign document:', error as Error);
			toast.error('Action Failed', {
				description: 'Failed to unassign document. Please try again.'
			});
		} finally {
			isUnassigningDocument = false;
		}
	}

	// Handle upload document success
	function handleUploadDocumentSuccess() {
		isUploadDocumentModalOpen = false;
		window.location.reload();
	}

	// Handle emergency contact save (create or update)
	async function handleSaveEmergencyContact(contact: EmergencyContactInput) {
		isSavingEmergencyContact = true;
		try {
			const isUpdate = !!contact.id;
			const mutation = isUpdate
				? `
					mutation UpdateEmergencyContact($id: UUID!, $input: UpdateEmergencyContactInput!) {
						updateEmergencyContact(id: $id, input: $input) {
							id
							name
							relationship
							phoneNumber
							email
							isPrimary
							updatedAt
						}
					}
				`
				: `
					mutation CreateEmergencyContact($input: CreateEmergencyContactInput!) {
						createEmergencyContact(input: $input) {
							id
							name
							relationship
							phoneNumber
							email
							isPrimary
							createdAt
							updatedAt
						}
					}
				`;

			const variables = isUpdate
				? {
						id: contact.id,
						input: {
							name: contact.name,
							relationship: contact.relationship,
							phoneNumber: contact.phoneNumber,
							email: contact.email,
							isPrimary: contact.isPrimary
						}
					}
				: {
						input: {
							employeeId: contact.employeeId,
							name: contact.name,
							relationship: contact.relationship,
							phoneNumber: contact.phoneNumber,
							email: contact.email,
							isPrimary: contact.isPrimary
						}
					};

			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: mutation,
					variables
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			toast.success(isUpdate ? 'Contact Updated' : 'Contact Added', {
				description: `Emergency contact ${isUpdate ? 'updated' : 'added'} successfully!`
			});
			isAddEmergencyContactModalOpen = false;
			editingContact = null;
			window.location.reload();
		} catch (error) {
			logger.error('Failed to save emergency contact:', error as Error);
			toast.error('Action Failed', {
				description: `Failed to ${editingContact ? 'update' : 'add'} emergency contact. Please try again.`
			});
		} finally {
			isSavingEmergencyContact = false;
		}
	}

	// Handle emergency contact delete
	async function handleDeleteEmergencyContact(contactId: string) {
		const confirmed = await confirmService.ask({
			title: 'Remove Emergency Contact',
			message:
				'Are you sure you want to remove this emergency contact? This action cannot be undone.',
			variant: 'destructive',
			confirmText: 'Remove'
		});

		if (!confirmed) return;

		try {
			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						mutation DeleteEmergencyContact($id: UUID!) {
							deleteEmergencyContact(id: $id)
						}
					`,
					variables: {
						id: contactId
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			toast.success('Contact Removed', {
				description: 'Emergency contact removed successfully.'
			});
			window.location.reload();
		} catch (error) {
			logger.error('Failed to delete emergency contact:', error as Error);
			toast.error('Action Failed', {
				description: 'Failed to delete emergency contact. Please try again.'
			});
		}
	}

	function openAddEmergencyContactModal() {
		editingContact = null;
		isAddEmergencyContactModalOpen = true;
	}

	function openEditEmergencyContactModal(contact: any) {
		editingContact = {
			id: contact.id,
			employeeId: employee.id,
			name: contact.name,
			relationship: contact.relationship,
			phoneNumber: contact.phoneNumber,
			email: contact.email,
			isPrimary: contact.isPrimary
		};
		isAddEmergencyContactModalOpen = true;
	}

	// Handle vehicle save (create or update)
	async function handleSaveVehicle(vehicleData: VehicleInput) {
		isSavingVehicle = true;
		try {
			const isUpdate = !!editingVehicle;
			const mutation = isUpdate
				? `
					mutation UpdateEmployeeVehicle($id: UUID!, $input: UpdateEmployeeVehicleInput!) {
						updateEmployeeVehicle(id: $id, input: $input) {
							id
							make
							model
							year
							licensePlate
							color
							updatedAt
						}
					}
				`
				: `
					mutation CreateEmployeeVehicle($input: CreateEmployeeVehicleInput!) {
						createEmployeeVehicle(input: $input) {
							id
							make
							model
							year
							licensePlate
							color
							createdAt
							updatedAt
						}
					}
				`;

			const variables = isUpdate
				? {
						id: editingVehicle.id,
						input: {
							make: vehicleData.make,
							model: vehicleData.model,
							year: vehicleData.year,
							licensePlate: vehicleData.licensePlate,
							color: vehicleData.color
						}
					}
				: {
						input: vehicleData
					};

			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: mutation,
					variables
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			toast.success(isUpdate ? 'Vehicle Updated' : 'Vehicle Added', {
				description: `Vehicle ${isUpdate ? 'updated' : 'added'} successfully!`
			});
			isVehicleModalOpen = false;
			editingVehicle = null;
			window.location.reload();
		} catch (error) {
			logger.error('Failed to save vehicle:', error as Error);
			toast.error('Action Failed', {
				description: `Failed to ${editingVehicle ? 'update' : 'add'} vehicle. Please try again.`
			});
		} finally {
			isSavingVehicle = false;
		}
	}

	// Handle vehicle delete
	async function handleDeleteVehicle(vehicleId: string) {
		const confirmed = await confirmService.ask({
			title: 'Remove Vehicle',
			message: 'Are you sure you want to remove this vehicle? This action cannot be undone.',
			variant: 'destructive',
			confirmText: 'Remove'
		});

		if (!confirmed) return;

		try {
			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						mutation DeleteEmployeeVehicle($id: UUID!) {
							deleteEmployeeVehicle(id: $id)
						}
					`,
					variables: {
						id: vehicleId
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			toast.success('Vehicle Removed', {
				description: 'Vehicle removed successfully.'
			});
			window.location.reload();
		} catch (error) {
			logger.error('Failed to delete vehicle:', error as Error);
			toast.error('Action Failed', {
				description: 'Failed to delete vehicle. Please try again.'
			});
		}
	}

	function openAddVehicleModal() {
		editingVehicle = null;
		isVehicleModalOpen = true;
	}

	function openEditVehicleModal(vehicle: any) {
		editingVehicle = vehicle;
		isVehicleModalOpen = true;
	}
</script>

<svelte:head>
	<title>{employee.displayName} - Employee Profile - MountainHR</title>
	<meta name="description" content="Employee profile for {employee.displayName}" />
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
				{/if}
			</div>
		</div>

		<!-- Main Bento Grid Layout -->
		<div
			class="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4"
		>
			<EmployeePersonalInfoCard {employee} />

			<EmployeeContactCard {employee} canViewContactInfo={permissions.canViewContactInfo} />

			<EmployeePerformanceCard {employee} />

			<EmployeeEmergencyContactsCard
				{employee}
				canManage={permissions.canManageEmployees || permissions.isViewingSelf}
				onAdd={openAddEmergencyContactModal}
				onEdit={openEditEmergencyContactModal}
				onDelete={handleDeleteEmergencyContact}
			/>

			<EmployeeDocumentsCard
				{employee}
				canView={permissions.canViewDocuments}
				canAssign={permissions.canAssignDocuments}
				{isUnassigningDocument}
				onUpload={() => (isUploadDocumentModalOpen = true)}
				onAssign={() => (isAssignDocsModalOpen = true)}
				onUnassign={handleUnassignDocument}
			/>

			<EmployeeHistoryCard {employee} />

			<EmployeeVehicleCard
				{employee}
				canManage={permissions.canManageEmployees || permissions.isViewingSelf}
			onAdd={openAddVehicleModal}
			onEdit={openEditVehicleModal}
			onDelete={handleDeleteVehicle}
			/>

			<EmployeeDependentsCard />

			<EmployeeActivityCard {employee} />
		</div>
	{/if}
</div>

<!-- Assign Documents Modal -->
{#if permissions.canAssignDocuments}
	<AssignDocumentsModal
		isOpen={isAssignDocsModalOpen}
		employeeId={employee.id}
		employeeName={employee.displayName}
		availableDocuments={data.availableDocuments || []}
		onAssign={handleAssignDocuments}
		onClose={() => (isAssignDocsModalOpen = false)}
		isSubmitting={isAssigningDocs}
	/>
{/if}

<!-- Add Emergency Contact Modal -->
{#if permissions.canViewEmergencyContacts && (permissions.canManageEmployees || permissions.isViewingSelf)}
	<AddEmergencyContactModal
		isOpen={isAddEmergencyContactModalOpen}
		employeeId={employee.id}
		employeeName={employee.displayName}
		initialData={editingContact}
		onSave={handleSaveEmergencyContact}
		onClose={() => (isAddEmergencyContactModalOpen = false)}
		isSubmitting={isSavingEmergencyContact}
	/>
{/if}

<!-- Add Vehicle Modal -->
{#if permissions.canViewVehicles && (permissions.canManageEmployees || permissions.isViewingSelf)}
	<AddVehicleModal
		isOpen={isVehicleModalOpen}
		employeeId={employee.id}
		employeeName={employee.displayName}
		initialData={editingVehicle}
		onSave={handleSaveVehicle}
		onClose={() => (isVehicleModalOpen = false)}
		isSubmitting={isSavingVehicle}
	/>
{/if}

<!-- Upload Document Modal -->
{#if permissions.canAssignDocuments}
	<UploadDocumentModal
		isOpen={isUploadDocumentModalOpen}
		onClose={() => (isUploadDocumentModalOpen = false)}
		onSuccess={handleUploadDocumentSuccess}
		assignToEmployees={[employee.id]}
	/>
{/if}
