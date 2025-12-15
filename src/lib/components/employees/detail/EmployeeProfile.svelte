<script lang="ts">
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
	} from '../../../../routes/dashboard/employees/[id]/components'; // Import from original location for now as I didn't move them

	interface Props {
		employee: any;
		permissions: any;
		isUnassigningDocument: boolean;
		onAddContact: () => void;
		onEditContact: (contact: any) => void;
		onDeleteContact: (id: string) => void;
		onAddVehicle: () => void;
		onEditVehicle: (vehicle: any) => void;
		onDeleteVehicle: (id: string) => void;
		onUploadDocument: () => void;
		onAssignDocument: () => void;
		onUnassignDocument: (id: string) => void;
	}

	let {
		employee,
		permissions,
		isUnassigningDocument,
		onAddContact,
		onEditContact,
		onDeleteContact,
		onAddVehicle,
		onEditVehicle,
		onDeleteVehicle,
		onUploadDocument,
		onAssignDocument,
		onUnassignDocument
	}: Props = $props();
</script>

<div class="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
	<EmployeePersonalInfoCard {employee} />

	<EmployeeContactCard {employee} canViewContactInfo={permissions.canViewContactInfo} />

	<EmployeePerformanceCard {employee} />

	<EmployeeEmergencyContactsCard
		{employee}
		canManage={permissions.canManageEmployees || permissions.isViewingSelf}
		onAdd={onAddContact}
		onEdit={onEditContact}
		onDelete={onDeleteContact}
	/>

	<EmployeeDocumentsCard
		{employee}
		canView={permissions.canViewDocuments}
		canAssign={permissions.canAssignDocuments}
		{isUnassigningDocument}
		onUpload={onUploadDocument}
		onAssign={onAssignDocument}
		onUnassign={onUnassignDocument}
	/>

	<EmployeeHistoryCard {employee} />

	<EmployeeVehicleCard
		{employee}
		canManage={permissions.canManageEmployees || permissions.isViewingSelf}
		onAdd={onAddVehicle}
		onEdit={onEditVehicle}
		onDelete={onDeleteVehicle}
	/>

	<EmployeeDependentsCard />

	<EmployeeActivityCard {employee} />
</div>
