<script lang="ts">
	import type { AssignmentType } from '$lib/types/document';

	interface Props {
		assignmentType: AssignmentType;
		counts: {
			employees: number;
			departments: number;
			teams: number;
		};
		onTypeChange: (type: AssignmentType) => void;
	}

	let { assignmentType = $bindable(), counts, onTypeChange }: Props = $props();
</script>

<div class="assignment-tabs">
	<button
		class="tab-button"
		class:active={assignmentType === 'employee'}
		onclick={() => onTypeChange('employee')}
	>
		👤 Employees
		{#if counts.employees > 0}
			<span class="tab-badge">{counts.employees}</span>
		{/if}
	</button>
	<button
		class="tab-button"
		class:active={assignmentType === 'department'}
		onclick={() => onTypeChange('department')}
	>
		🏢 Departments
		{#if counts.departments > 0}
			<span class="tab-badge">{counts.departments}</span>
		{/if}
	</button>
	<button
		class="tab-button"
		class:active={assignmentType === 'team'}
		onclick={() => onTypeChange('team')}
	>
		👥 Teams
		{#if counts.teams > 0}
			<span class="tab-badge">{counts.teams}</span>
		{/if}
	</button>
</div>

<style>
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
</style>