<script lang="ts">
	import AdvancedEmployeeTable from './AdvancedEmployeeTable/AdvancedEmployeeTable.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Users } from 'lucide-svelte';

	interface Props {
		data: Record<string, any>;
	}

	let { data }: Props = $props();

	// Transform streaming data
	let employeesData = $derived(data['employees-list'] || { employees: [], total: 0 });
	let departments = $derived(data['departments'] || []);
	let roles = $derived(data['roles'] || []);
	let stats = $derived(data['employee-stats'] || { total: 0 });
	
	// Create mock filter data structure expected by AdvancedEmployeeTable
	let tableData = $derived({
		employeesData: employeesData,
		departments: departments,
		positions: roles, // Using roles as positions for now
		filters: {
			search: '',
			departmentId: '',
			status: '',
			managerId: '',
			workType: '',
			hiredAfter: '',
			hiredBefore: '',
			page: 1,
			limit: 50,
			sortBy: 'firstName',
			sortOrder: 'asc'
		},
		isUsingMockData: false
	});
</script>

<div class="streaming-employees">
	<!-- Quick Stats -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon">
				<Users size={24} />
			</div>
			<div class="stat-content">
				<div class="stat-value">
					{employeesData.total || employeesData.employees?.length || 0}
				</div>
				<div class="stat-label">Total Employees</div>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">
				<Users size={24} />
			</div>
			<div class="stat-content">
				<div class="stat-value">
					{departments.length || 0}
				</div>
				<div class="stat-label">Departments</div>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="stat-icon">
				<Users size={24} />
			</div>
			<div class="stat-content">
				<div class="stat-value">
					{roles.length || 0}
				</div>
				<div class="stat-label">Roles</div>
			</div>
		</div>
	</div>

	<!-- Status Indicators -->
	<div class="status-indicators">
		{#each Object.entries(data) as [key, value]}
			<Badge variant={value ? "default" : "secondary"}>
				{key}: {value ? 'Loaded' : 'Loading...'}
			</Badge>
		{/each}
	</div>

	<!-- Employee Table -->
	{#if employeesData.employees}
		<div class="table-container">
			<AdvancedEmployeeTable 
				employees={employeesData.employees}
				loading={false}
			/>
		</div>
	{:else}
		<div class="loading-table">
			<div class="skeleton-table">
				<!-- Table header skeleton -->
				<div class="skeleton-header">
					{#each Array(6) as _}
						<div class="skeleton-cell header"></div>
					{/each}
				</div>
				<!-- Table rows skeleton -->
				{#each Array(5) as _}
					<div class="skeleton-row">
						{#each Array(6) as _}
							<div class="skeleton-cell"></div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.streaming-employees {
		space-y: 2rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid var(--color-surface-200);
	}

	.stat-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: var(--color-primary-100);
		color: var(--color-primary-600);
		border-radius: 12px;
	}

	.stat-content {
		flex: 1;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-surface-900);
		line-height: 1;
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--color-surface-600);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 0.25rem;
	}

	.status-indicators {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 2rem;
	}

	.table-container {
		background: white;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid var(--color-surface-200);
	}

	.loading-table {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid var(--color-surface-200);
	}

	.skeleton-table {
		space-y: 0.5rem;
	}

	.skeleton-header {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.skeleton-row {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 1rem;
	}

	.skeleton-cell {
		height: 16px;
		background: linear-gradient(90deg, var(--color-surface-200) 25%, var(--color-surface-300) 50%, var(--color-surface-200) 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
	}

	.skeleton-cell.header {
		height: 20px;
		background: linear-gradient(90deg, var(--color-surface-300) 25%, var(--color-surface-400) 50%, var(--color-surface-300) 75%);
		background-size: 200% 100%;
	}

	@keyframes skeleton-loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}
</style>