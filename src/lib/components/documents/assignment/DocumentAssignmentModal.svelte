<script lang="ts">
	import type { AssignmentType, DocumentAssignment } from '$lib/types/document';
	import type { AssignmentModalProps } from './types';

	// Import sub-components
	import AssignmentTabs from './AssignmentTabs.svelte';
	import SelectionList from './SelectionList.svelte';
	import ModalFooter from './ModalFooter.svelte';

	const props: AssignmentModalProps = $props();

	// Default values
	const {
		isOpen = false,
		documentId,
		documentName,
		employees = [],
		departments = [],
		teams = [],
		existingAssignments = [],
		onAssign = () => {},
		onClose = () => {},
		isSubmitting = false
	} = props;

	// State
	let assignmentType = $state<AssignmentType>('employee');
	let selectedEmployees = $state<string[]>([]);
	let selectedDepartments = $state<string[]>([]);
	let selectedTeams = $state<string[]>([]);
	let searchQuery = $state('');

	// Derived state
	const filteredEmployees = $derived(
		employees.filter((emp) => emp.email.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	const filteredDepartments = $derived(
		departments.filter((dept) => dept.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	const filteredTeams = $derived(
		teams.filter((team) => team.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	const hasSelections = $derived(
		selectedEmployees.length > 0 || selectedDepartments.length > 0 || selectedTeams.length > 0
	);

	const canSubmit = $derived(hasSelections && !isSubmitting);

	const currentItems = $derived.by(() => {
		switch (assignmentType) {
			case 'employee':
				return filteredEmployees;
			case 'department':
				return filteredDepartments;
			case 'team':
				return filteredTeams;
			default:
				return [];
		}
	});

	const currentSelectedIds = $derived.by(() => {
		switch (assignmentType) {
			case 'employee':
				return selectedEmployees;
			case 'department':
				return selectedDepartments;
			case 'team':
				return selectedTeams;
			default:
				return [];
		}
	});

	// Handle selection toggle
	function toggleSelection(id: string, type: AssignmentType) {
		if (type === 'employee') {
			if (selectedEmployees.includes(id)) {
				selectedEmployees = selectedEmployees.filter((empId) => empId !== id);
			} else {
				selectedEmployees = [...selectedEmployees, id];
			}
		} else if (type === 'department') {
			if (selectedDepartments.includes(id)) {
				selectedDepartments = selectedDepartments.filter((deptId) => deptId !== id);
			} else {
				selectedDepartments = [...selectedDepartments, id];
			}
		} else if (type === 'team') {
			if (selectedTeams.includes(id)) {
				selectedTeams = selectedTeams.filter((teamId) => teamId !== id);
			} else {
				selectedTeams = [...selectedTeams, id];
			}
		}
	}

	// Handle submit
	function handleSubmit() {
		const assignments: Partial<DocumentAssignment>[] = [];

		selectedEmployees.forEach((employeeId) => {
			assignments.push({
				document_id: documentId,
				employee_id: employeeId,
				assignment_type: 'employee',
				assignment_status: 'active'
			});
		});

		selectedDepartments.forEach((departmentId) => {
			assignments.push({
				document_id: documentId,
				department_id: departmentId,
				assignment_type: 'department',
				assignment_status: 'active'
			});
		});

		selectedTeams.forEach((teamId) => {
			assignments.push({
				document_id: documentId,
				team_id: teamId,
				assignment_type: 'team',
				assignment_status: 'active'
			});
		});

		onAssign(assignments);
	}

	function handleClose() {
		selectedEmployees = [];
		selectedDepartments = [];
		selectedTeams = [];
		searchQuery = '';
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="assignment-modal-backdrop">
		<div class="assignment-modal">
			<!-- Modal header -->
			<div class="modal-header">
				<div class="header-content">
					<h2 class="modal-title">Assign Document</h2>
					<p class="document-name">{documentName}</p>
				</div>
				<button class="close-button" onclick={handleClose} title="Close"> ✕ </button>
			</div>

			<AssignmentTabs
				bind:assignmentType
				counts={{
					employees: selectedEmployees.length,
					departments: selectedDepartments.length,
					teams: selectedTeams.length
				}}
				onTypeChange={(type) => (assignmentType = type)}
			/>

			<!-- Search -->
			<div class="search-bar">
				<input type="text" placeholder="Search..." bind:value={searchQuery} class="search-input" />
			</div>

			<SelectionList
				{assignmentType}
				items={currentItems}
				selectedIds={currentSelectedIds}
				{existingAssignments}
				onToggle={toggleSelection}
			/>

			<ModalFooter
				selectedCount={selectedEmployees.length + selectedDepartments.length + selectedTeams.length}
				{isSubmitting}
				{canSubmit}
				onClose={handleClose}
				onSubmit={handleSubmit}
			/>
		</div>
	</div>
{/if}

<style>
	.assignment-modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.assignment-modal {
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		background: white;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.5rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.header-content {
		flex: 1;
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #2d3748;
		margin: 0 0 0.25rem 0;
	}

	.document-name {
		font-size: 0.875rem;
		color: #718096;
		margin: 0;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #718096;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
	}

	.close-button:hover {
		color: #2d3748;
	}

	.search-bar {
		padding: 1rem 1.5rem;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #4299e1;
		box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
	}
</style>
