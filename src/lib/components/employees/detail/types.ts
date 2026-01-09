import type { EmergencyContactInput } from '$lib/components/employees/AddEmergencyContactModal.svelte';
import type { VehicleInput } from '$lib/components/employees/AddVehicleModal.svelte';

export interface EmployeeProfileData {
	employee: any;
	permissions: any;
	availableDocuments: any[];
}

export interface EmployeeActionState {
	isAssignDocsModalOpen: boolean;
	isAssigningDocs: boolean;
	isAddEmergencyContactModalOpen: boolean;
	isSavingEmergencyContact: boolean;
	editingContact: EmergencyContactInput | null;
	isVehicleModalOpen: boolean;
	isSavingVehicle: boolean;
	editingVehicle: any;
	isUnassigningDocument: boolean;
	isUploadDocumentModalOpen: boolean;
}
