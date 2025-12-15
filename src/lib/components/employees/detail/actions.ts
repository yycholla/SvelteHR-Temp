import { logger } from '$lib/utils/logger';
import { toast } from 'svelte-sonner';
import type { EmergencyContactInput } from '$lib/components/employees/AddEmergencyContactModal.svelte';
import type { VehicleInput } from '$lib/components/employees/AddVehicleModal.svelte';

export async function assignDocuments(employeeId: string, documentIds: string[]) {
	try {
		const response = await fetch(`/api/employees/${employeeId}/assign-documents`, {
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
		return true;
	} catch (error) {
		logger.error('Assignment error:', error as Error);
		toast.error('Assignment Failed', {
			description: 'Failed to assign documents. Please try again.'
		});
		return false;
	}
}

export async function unassignDocument(assignmentId: string) {
	try {
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
		return true;
	} catch (error) {
		logger.error('Failed to unassign document:', error as Error);
		toast.error('Action Failed', {
			description: 'Failed to unassign document. Please try again.'
		});
		return false;
	}
}

export async function saveEmergencyContact(contact: EmergencyContactInput, employeeId: string) {
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
						employeeId: employeeId || contact.employeeId,
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
		return true;
	} catch (error) {
		logger.error('Failed to save emergency contact:', error as Error);
		toast.error('Action Failed', {
			description: `Failed to save emergency contact. Please try again.`
		});
		return false;
	}
}

export async function deleteEmergencyContact(contactId: string) {
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
		return true;
	} catch (error) {
		logger.error('Failed to delete emergency contact:', error as Error);
		toast.error('Action Failed', {
			description: 'Failed to delete emergency contact. Please try again.'
		});
		return false;
	}
}

export async function saveVehicle(vehicleData: VehicleInput, editingVehicleId?: string) {
	try {
		const isUpdate = !!editingVehicleId;
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
					id: editingVehicleId,
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
		return true;
	} catch (error) {
		logger.error('Failed to save vehicle:', error as Error);
		toast.error('Action Failed', {
			description: `Failed to save vehicle. Please try again.`
		});
		return false;
	}
}

export async function deleteVehicle(vehicleId: string) {
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
		return true;
	} catch (error) {
		logger.error('Failed to delete vehicle:', error as Error);
		toast.error('Action Failed', {
			description: 'Failed to delete vehicle. Please try again.'
		});
		return false;
	}
}
