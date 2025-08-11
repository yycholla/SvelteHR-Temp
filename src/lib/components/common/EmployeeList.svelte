<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';

	interface Employee {
		id: string | number;
		firstName: string;
		lastName: string;
		jobTitle?: string;
		status: string;
		department?: {
			name: string;
		};
	}

	interface Props {
		employees: Employee[];
		showCount?: number;
		showStatus?: boolean;
		showDepartment?: boolean;
		class?: string;
	}

	let { 
		employees, 
		showCount = 0, 
		showStatus = true, 
		showDepartment = false,
		class: className = ''
	}: Props = $props();

	let displayEmployees = $derived(showCount > 0 ? employees.slice(0, showCount) : employees);
	let remainingCount = $derived(showCount > 0 && employees.length > showCount ? employees.length - showCount : 0);

	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'Active': return 'default';
			case 'Onboarding': return 'secondary';
			case 'Inactive': return 'destructive';
			default: return 'outline';
		}
	}
</script>

<div class="employee-list {className}">
	{#each displayEmployees as employee}
		<div class="employee-item">
			<div class="employee-info">
				<div class="employee-avatar">
					{employee.firstName[0]}{employee.lastName[0]}
				</div>
				<div class="employee-details">
					<div class="employee-name">{employee.firstName} {employee.lastName}</div>
					<div class="employee-meta">
						{employee.jobTitle || 'No Title'}
						{#if showDepartment && employee.department}
							• {employee.department.name}
						{/if}
					</div>
				</div>
			</div>
			{#if showStatus}
				<Badge variant={getStatusVariant(employee.status)} class="status-badge">
					{employee.status}
				</Badge>
			{/if}
		</div>
	{/each}
	
	{#if remainingCount > 0}
		<div class="remaining-count">
			+{remainingCount} more employees
		</div>
	{/if}
</div>

<style>
	.employee-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.employee-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f3f4f6;
		transition: background-color 0.2s ease;
	}

	.employee-item:hover {
		background: #f3f4f6;
	}

	.employee-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
	}

	.employee-avatar {
		width: 36px;
		height: 36px;
		background: #6366f1;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.employee-details {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.employee-name {
		font-weight: 500;
		color: #1f2937;
		font-size: 0.875rem;
	}

	.employee-meta {
		font-size: 0.75rem;
		color: #6b7280;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.status-badge {
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.remaining-count {
		text-align: center;
		font-size: 0.875rem;
		color: #6b7280;
		font-style: italic;
		padding: 0.5rem;
		background: #f9fafb;
		border-radius: 6px;
		border: 1px dashed #d1d5db;
	}

	/* Responsive Design */
	@media (max-width: 480px) {
		.employee-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.status-badge {
			align-self: flex-start;
		}

		.employee-details {
			width: 100%;
		}

		.employee-meta {
			white-space: normal;
		}
	}
</style>