<script lang="ts">
	// DocumentAssignmentModal component (Feature 024)
	// Modal for assigning documents to employees, departments, or teams

	import type { DocumentAssignment, AssignmentType } from '$lib/types/document';

	interface Employee {
		id: string;
		full_name: string;
		email: string;
		department_id?: string;
	}

	interface Department {
		id: string;
		name: string;
	}

	interface Team {
		id: string;
		name: string;
	}

	interface Props {
		isOpen?: boolean;
		documentId: string;
		documentName: string;
		employees?: Employee[];
		departments?: Department[];
		teams?: Team[];
		existingAssignments?: DocumentAssignment[];
		onAssign?: (assignments: Partial<DocumentAssignment>[]) => void;
		onClose?: () => void;
		isSubmitting?: boolean;
	}

	let {
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
	}: Props = $props();

	// Svelte 5 state
	let assignmentType = $state<AssignmentType>('employee');
	let selectedEmployees = $state<string[]>([]);
	let selectedDepartments = $state<string[]>([]);
	let selectedTeams = $state<string[]>([]);
	let searchQuery = $state('');

	// Derived state
	let filteredEmployees = $derived(
		employees.filter(
			(emp) =>
				emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				emp.email.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	let filteredDepartments = $derived(
		departments.filter((dept) => dept.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	let filteredTeams = $derived(
		teams.filter((team) => team.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	let hasSelections = $derived(
		selectedEmployees.length > 0 || selectedDepartments.length > 0 || selectedTeams.length > 0
	);

	let canSubmit = $derived(hasSelections && !isSubmitting);

	// Check if entity is already assigned
	function isAlreadyAssigned(entityId: string, type: AssignmentType): boolean {
		return existingAssignments.some(
			(assignment) =>
				(type === 'employee' && assignment.employee_id === entityId) ||
				(type === 'department' && assignment.department_id === entityId) ||
				(type === 'team' && assignment.team_id === entityId)
		);
	}

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

		// Employee assignments
		selectedEmployees.forEach((employeeId) => {
			assignments.push({
				document_id: documentId,
				employee_id: employeeId,
				assignment_type: 'employee',
				assignment_status: 'active'
			});
		});

		// Department assignments
		selectedDepartments.forEach((departmentId) => {
			assignments.push({
				document_id: documentId,
				department_id: departmentId,
				assignment_type: 'department',
				assignment_status: 'active'
			});
		});

		// Team assignments
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

	// Reset selections when modal closes
	function handleClose() {
		selectedEmployees = [];
		selectedDepartments = [];
		selectedTeams = [];
		searchQuery = '';
		onClose();
	}

	// Handle escape key
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
				<button class="close-button" onclick={handleClose} title="Close">
					✕
				</button>
			</div>

			<!-- Assignment type tabs -->
			<div class="assignment-tabs">
				<button
					class="tab-button"
					class:active={assignmentType === 'employee'}
					onclick={() => (assignmentType = 'employee')}
				>
					👤 Employees
					{#if selectedEmployees.length > 0}
						<span class="tab-badge">{selectedEmployees.length}</span>
					{/if}
				</button>
				<button
					class="tab-button"
					class:active={assignmentType === 'department'}
					onclick={() => (assignmentType = 'department')}
				>
					🏢 Departments
					{#if selectedDepartments.length > 0}
						<span class="tab-badge">{selectedDepartments.length}</span>
					{/if}
				</button>
				<button
					class="tab-button"
					class:active={assignmentType === 'team'}
					onclick={() => (assignmentType = 'team')}
				>
					👥 Teams
					{#if selectedTeams.length > 0}
						<span class="tab-badge">{selectedTeams.length}</span>
					{/if}
				</button>
			</div>

			<!-- Search -->
			<div class="search-bar">
				<input
					type="text"
					placeholder="Search..."
					bind:value={searchQuery}
					class="search-input"
				/>
			</div>

			<!-- Selection list -->
			<div class="selection-list">
				{#if assignmentType === 'employee'}
					{#each filteredEmployees as employee (employee.id)}
						{@const isAssigned = isAlreadyAssigned(employee.id, 'employee')}
						{@const isSelected = selectedEmployees.includes(employee.id)}
						<label class="selection-item" class:disabled={isAssigned}>
							<input
								type="checkbox"
								checked={isSelected}
								disabled={isAssigned}
								onchange={() => toggleSelection(employee.id, 'employee')}
							/>
							<div class="item-content">
								<span class="item-name">{employee.full_name}</span>
								<span class="item-detail">{employee.email}</span>
							</div>
							{#if isAssigned}
								<span class="assigned-badge">Already Assigned</span>
							{/if}
						</label>
					{/each}

					{#if filteredEmployees.length === 0}
						<div class="empty-state">
							<p>No employees found</p>
						</div>
					{/if}
				{:else if assignmentType === 'department'}
					{#each filteredDepartments as department (department.id)}
						{@const isAssigned = isAlreadyAssigned(department.id, 'department')}
						{@const isSelected = selectedDepartments.includes(department.id)}
						<label class="selection-item" class:disabled={isAssigned}>
							<input
								type="checkbox"
								checked={isSelected}
								disabled={isAssigned}
								onchange={() => toggleSelection(department.id, 'department')}
							/>
							<div class="item-content">
								<span class="item-name">{department.name}</span>
							</div>
							{#if isAssigned}
								<span class="assigned-badge">Already Assigned</span>
							{/if}
						</label>
					{/each}

					{#if filteredDepartments.length === 0}
						<div class="empty-state">
							<p>No departments found</p>
						</div>
					{/if}
				{:else if assignmentType === 'team'}
					{#each filteredTeams as team (team.id)}
						{@const isAssigned = isAlreadyAssigned(team.id, 'team')}
						{@const isSelected = selectedTeams.includes(team.id)}
						<label class="selection-item" class:disabled={isAssigned}>
							<input
								type="checkbox"
								checked={isSelected}
								disabled={isAssigned}
								onchange={() => toggleSelection(team.id, 'team')}
							/>
							<div class="item-content">
								<span class="item-name">{team.name}</span>
							</div>
							{#if isAssigned}
								<span class="assigned-badge">Already Assigned</span>
							{/if}
						</label>
					{/each}

					{#if filteredTeams.length === 0}
						<div class="empty-state">
							<p>No teams found</p>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Modal footer -->
			<div class="modal-footer">
				<div class="selection-summary">
					{#if hasSelections}
						<span class="summary-text">
							{selectedEmployees.length + selectedDepartments.length + selectedTeams.length} selected
						</span>
					{:else}
						<span class="summary-text">No selections</span>
					{/if}
				</div>

				<div class="footer-actions">
					<button class="cancel-button" onclick={handleClose} disabled={isSubmitting}>
						Cancel
					</button>
					<button class="assign-button" onclick={handleSubmit} disabled={!canSubmit}>
						{isSubmitting ? 'Assigning...' : 'Assign Document'}
					</button>
				</div>
			</div>
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

	.assignment-tabs {
		display: flex;
		border-bottom: 1px solid #e2e8f0;
		padding: 0 1.5rem;
	}

	.tab-button {
		flex: 1;
		padding: 1rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		font-size: 0.875rem;
		font-weight: 500;
		color: #718096;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.tab-button:hover {
		color: #4a5568;
	}

	.tab-button.active {
		color: #4299e1;
		border-bottom-color: #4299e1;
	}

	.tab-badge {
		padding: 0.125rem 0.5rem;
		background: #4299e1;
		color: white;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
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

	.selection-list {
		flex: 1;
		overflow-y: auto;
		padding: 0 1.5rem 1rem 1.5rem;
		max-height: 400px;
	}

	.selection-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		margin-bottom: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.selection-item:hover:not(.disabled) {
		background: #f7fafc;
		border-color: #cbd5e0;
	}

	.selection-item.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.selection-item input[type='checkbox'] {
		cursor: pointer;
	}

	.selection-item.disabled input[type='checkbox'] {
		cursor: not-allowed;
	}

	.item-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.item-name {
		font-weight: 500;
		color: #2d3748;
		font-size: 0.875rem;
	}

	.item-detail {
		font-size: 0.75rem;
		color: #718096;
	}

	.assigned-badge {
		padding: 0.25rem 0.75rem;
		background: #edf2f7;
		color: #718096;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: #a0aec0;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.875rem;
	}

	.modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-top: 1px solid #e2e8f0;
	}

	.selection-summary {
		font-size: 0.875rem;
		color: #4a5568;
	}

	.footer-actions {
		display: flex;
		gap: 0.75rem;
	}

	.cancel-button,
	.assign-button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-button {
		background: white;
		color: #4a5568;
		border: 1px solid #cbd5e0;
	}

	.cancel-button:hover:not(:disabled) {
		background: #f7fafc;
	}

	.assign-button {
		background: #4299e1;
		color: white;
	}

	.assign-button:hover:not(:disabled) {
		background: #3182ce;
	}

	.cancel-button:disabled,
	.assign-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
