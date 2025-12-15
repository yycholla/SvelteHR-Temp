<script lang="ts">
	interface Props {
		loading: boolean;
		error: any;
		filteredEmployees: any[];
		viewMode: 'grid' | 'list';
		filters: any;
		onRefresh: () => void;
	}

	let { loading, error, filteredEmployees, viewMode, filters, onRefresh }: Props = $props();
</script>

<!-- Loading state -->
{#if loading && filteredEmployees.length === 0}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading employees...</p>
	</div>
{/if}

<!-- Error state -->
{#if error}
	<div class="error-container">
		<h3>Failed to load employees</h3>
		<p>{error.message}</p>
		<button class="btn-secondary" onclick={onRefresh}> Try Again </button>
	</div>
{/if}

<!-- Employee grid/list -->
{#if !loading && !error && filteredEmployees.length === 0}
	<div class="empty-state">
		<div class="empty-icon">
			<svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
				<path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
				<path
					fill-rule="evenodd"
					d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"
				/>
			</svg>
		</div>
		<h3>No employees found</h3>
		<p>
			{#if Object.values(filters).some(Boolean)}
				Try adjusting your filters or search terms.
			{:else}
				Get started by adding your first employee.
			{/if}
		</p>
	</div>
{:else if filteredEmployees.length > 0}
	<!-- Employee cards/rows -->
	<div
		class="employee-container"
		class:grid-view={viewMode === 'grid'}
		class:list-view={viewMode === 'list'}
	>
		{#each filteredEmployees as employee (employee.id)}
			<div class="employee-card">
				<div class="employee-info">
					<div class="employee-avatar">
						{employee.display_name?.charAt(0) || '?'}
					</div>
					<div class="employee-details">
						<h4 class="employee-name">{employee.display_name}</h4>
						<p class="employee-email">{employee.email}</p>
						{#if employee.job_title}
							<p class="employee-title">{employee.job_title}</p>
						{/if}
						{#if employee.department_id}
							<p class="employee-department">Department ID: {employee.department_id}</p>
						{/if}
						<div class="employee-status status-{employee.is_active ? 'active' : 'inactive'}">
							{employee.is_active ? 'Active' : 'Inactive'}
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.loading-container,
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--cds-spacing-08);
		gap: 1rem;
		color: #6b7280;
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--cds-spacing-10) var(--cds-spacing-06);
		text-align: center;
		color: #6b7280;
	}

	.empty-icon {
		color: #d1d5db;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		margin: 0 0 0.5rem;
		font-size: var(--cds-productive-heading-02-font-size);
		font-weight: var(--cds-productive-heading-02-font-weight);
		line-height: var(--cds-productive-heading-02-line-height);
		letter-spacing: var(--cds-productive-heading-02-letter-spacing);
		color: var(--cds-text-primary);
	}

	.empty-state p {
		margin: 0 0 1.5rem;
		max-width: 28rem;
	}

	.employee-container.grid-view {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.employee-container.list-view {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.employee-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: var(--cds-spacing-06);
		transition: all 0.15s;
	}

	.employee-card:hover {
		border-color: #d1d5db;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.employee-info {
		display: flex;
		gap: 0.75rem;
	}

	.employee-avatar {
		width: 2.5rem;
		height: 2.5rem;
		background-color: #3b82f6;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 1rem;
		flex-shrink: 0;
	}

	.employee-details {
		flex: 1;
		min-width: 0;
	}

	.employee-name {
		margin: 0 0 0.25rem;
		font-size: var(--cds-body-compact-02-font-size);
		font-weight: var(--cds-body-compact-02-font-weight);
		line-height: var(--cds-body-compact-02-line-height);
		letter-spacing: var(--cds-body-compact-02-letter-spacing);
		color: var(--cds-text-primary);
	}

	.employee-email {
		margin: 0 0 0.25rem;
		font-size: var(--cds-body-compact-01-font-size);
		font-weight: var(--cds-body-compact-01-font-weight);
		line-height: var(--cds-body-compact-01-line-height);
		letter-spacing: var(--cds-body-compact-01-letter-spacing);
		color: var(--cds-text-secondary);
	}

	.employee-title,
	.employee-department {
		margin: 0 0 0.25rem;
		font-size: var(--cds-body-compact-01-font-size);
		font-weight: var(--cds-body-compact-01-font-weight);
		line-height: var(--cds-body-compact-01-line-height);
		letter-spacing: var(--cds-body-compact-01-letter-spacing);
		color: var(--cds-text-secondary);
	}

	.employee-status {
		display: inline-block;
		padding: var(--cds-spacing-02) var(--cds-spacing-05);
		border-radius: 0.25rem;
		font-size: var(--cds-helper-text-01-font-size);
		font-weight: var(--cds-helper-text-01-font-weight);
		line-height: var(--cds-helper-text-01-line-height);
		letter-spacing: var(--cds-helper-text-01-letter-spacing);
		text-transform: capitalize;
	}

	.status-active {
		background-color: #dcfce7;
		color: #166534;
	}

	.btn-secondary {
		background-color: white;
		color: #374151;
		border-color: #d1d5db;
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
		border-radius: 0.375rem;
		border: 1px solid #d1d5db;
		cursor: pointer;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.employee-container.grid-view {
			grid-template-columns: 1fr;
		}
	}
</style>
