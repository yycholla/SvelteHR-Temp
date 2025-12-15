<script lang="ts">
	import type { AssignmentType, DocumentAssignment } from '$lib/types/document';

	interface Props {
		assignmentType: AssignmentType;
		items: any[];
		selectedIds: string[];
		existingAssignments: DocumentAssignment[];
		onToggle: (id: string, type: AssignmentType) => void;
	}

	let { assignmentType, items, selectedIds, existingAssignments, onToggle }: Props = $props();

	function isAlreadyAssigned(entityId: string, type: AssignmentType): boolean {
		return existingAssignments.some(
			(assignment) =>
				(type === 'employee' && assignment.employee_id === entityId) ||
				(type === 'department' && assignment.department_id === entityId) ||
				(type === 'team' && assignment.team_id === entityId)
		);
	}

	function getDisplayName(item: any): string {
		return item.email || item.name || 'Unknown';
	}
</script>

<div class="selection-list">
	{#each items as item (item.id)}
		{@const isAssigned = isAlreadyAssigned(item.id, assignmentType)}
		{@const isSelected = selectedIds.includes(item.id)}
		<label class="selection-item" class:disabled={isAssigned}>
			<input
				type="checkbox"
				checked={isSelected}
				disabled={isAssigned}
				onchange={() => onToggle(item.id, assignmentType)}
			/>
			<div class="item-content">
				<span class="item-name">{getDisplayName(item)}</span>
			</div>
			{#if isAssigned}
				<span class="assigned-badge">Already Assigned</span>
			{/if}
		</label>
	{/each}

	{#if items.length === 0}
		<div class="empty-state">
			<p>No {assignmentType}s found</p>
		</div>
	{/if}
</div>

<style>
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
</style>
