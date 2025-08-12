<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Eye, Edit, Trash2, MoreHorizontal } from 'lucide-svelte';

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
		showActions?: boolean;
		class?: string;
		onView?: (employee: Employee) => void;
		onEdit?: (employee: Employee) => void;
		onDelete?: (employee: Employee) => void;
	}

	let { 
		employees, 
		showCount = 0, 
		showStatus = true, 
		showDepartment = false,
		showActions = false,
		class: className = '',
		onView,
		onEdit,
		onDelete
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
			<div class="employee-actions">
				{#if showStatus}
					<Badge variant={getStatusVariant(employee.status)} class="status-badge">
						{employee.status}
					</Badge>
				{/if}
				
				{#if showActions}
					<div class="action-buttons">
						{#if onView}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => onView?.(employee)}
								class="action-btn"
								title="View employee details"
							>
								<Eye class="w-4 h-4" />
							</Button>
						{/if}
						
						{#if onEdit}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => onEdit?.(employee)}
								class="action-btn"
								title="Edit employee"
							>
								<Edit class="w-4 h-4" />
							</Button>
						{/if}
						
						{#if onDelete}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => onDelete?.(employee)}
								class="action-btn delete-btn"
								title="Delete employee"
							>
								<Trash2 class="w-4 h-4" />
							</Button>
						{/if}
					</div>
				{/if}
			</div>
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

	.employee-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.action-buttons {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.employee-item:hover .action-buttons {
		opacity: 1;
	}

	.status-badge {
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	:global(.action-btn) {
		padding: 0.25rem !important;
		height: auto !important;
		min-height: 28px;
		width: 28px;
		border-radius: 4px;
		color: #6b7280;
	}

	:global(.action-btn:hover) {
		color: #374151;
		background-color: #f3f4f6;
	}

	:global(.delete-btn:hover) {
		color: #dc2626;
		background-color: #fef2f2;
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
	@media (max-width: 640px) {
		.action-buttons {
			opacity: 1; /* Always show on mobile */
		}
	}

	@media (max-width: 480px) {
		.employee-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.employee-actions {
			align-self: flex-end;
			width: 100%;
			justify-content: space-between;
		}

		.employee-details {
			width: 100%;
		}

		.employee-meta {
			white-space: normal;
		}
	}
</style>