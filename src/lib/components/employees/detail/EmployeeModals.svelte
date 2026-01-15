<script lang="ts">
	import AssignDocumentsModal from '$lib/components/employees/AssignDocumentsModal.svelte';
	import UploadDocumentModal from '$lib/components/documents/UploadDocumentModal.svelte';
	import AddEmergencyContactModal, {
		type EmergencyContactInput
	} from '$lib/components/employees/AddEmergencyContactModal.svelte';
	import AddVehicleModal, {
		type VehicleInput
	} from '$lib/components/employees/AddVehicleModal.svelte';
	import type { EmployeeActionState } from './types';

	interface Props {
		employee: any;
		permissions: any;
		availableDocuments: any[];
		state: EmployeeActionState;
		onAssignDocuments: (ids: string[]) => void;
		onSaveContact: (contact: EmergencyContactInput) => Promise<void>;
		onSaveVehicle: (vehicle: VehicleInput) => Promise<void>;
		onUploadSuccess: () => void;
	}

	let {
		employee,
		permissions,
		availableDocuments,
		state = $bindable(),
		onAssignDocuments,
		onSaveContact,
		onSaveVehicle,
		onUploadSuccess
	}: Props = $props();
</script>

<!-- Assign Documents Modal -->
{#if permissions.canAssignDocuments}
	<AssignDocumentsModal
		isOpen={state.isAssignDocsModalOpen}
		employeeId={employee.id}
		employeeName={employee.displayName}
		availableDocuments={availableDocuments || []}
		onAssign={onAssignDocuments}
		onClose={() => (state.isAssignDocsModalOpen = false)}
		isSubmitting={state.isAssigningDocs}
	/>
{/if}

<!-- Add Emergency Contact Modal -->
{#if permissions.canViewEmergencyContacts && (permissions.canManageEmployees || permissions.isViewingSelf)}
	<AddEmergencyContactModal
		isOpen={state.isAddEmergencyContactModalOpen}
		employeeId={employee.id}
		employeeName={employee.displayName}
		initialData={state.editingContact}
		onSave={onSaveContact}
		onClose={() => (state.isAddEmergencyContactModalOpen = false)}
		isSubmitting={state.isSavingEmergencyContact}
	/>
{/if}

<!-- Add Vehicle Modal -->
{#if permissions.canViewVehicles && (permissions.canManageEmployees || permissions.isViewingSelf)}
	<AddVehicleModal
		isOpen={state.isVehicleModalOpen}
		employeeId={employee.id}
		employeeName={employee.displayName}
		initialData={state.editingVehicle}
		onSave={onSaveVehicle}
		onClose={() => (state.isVehicleModalOpen = false)}
		isSubmitting={state.isSavingVehicle}
	/>
{/if}

<!-- Upload Document Modal -->
{#if permissions.canAssignDocuments}
	<UploadDocumentModal
		isOpen={state.isUploadDocumentModalOpen}
		onClose={() => (state.isUploadDocumentModalOpen = false)}
		onSuccess={onUploadSuccess}
		assignToEmployees={[employee.id]}
	/>
{/if}
