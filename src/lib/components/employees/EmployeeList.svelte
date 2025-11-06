<script lang="ts">
	import { onMount } from 'svelte';
	import { queryStore } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { GET_EMPLOYEES_QUERY } from '$lib/graphql/employee-operations';
	import { currentUser, hasPermission } from '$lib/stores/auth';
	import RoleGuard from '$lib/components/auth/RoleGuard.svelte';

	/**
	 * Employee List Component
	 * Main interface for browsing, searching, and managing employees
	 */

	interface Props {
		initialFilters?: EmployeeFilters;
		compactView?: boolean;
		showFilters?: boolean;
		showAddButton?: boolean;
		maxHeight?: string;
	}

	interface EmployeeFilters {
		search?: string;
		department?: string;
		role?: string;
		status?: string;
		manager?: string;
	}

	import type { User } from '$lib/types';

	type Employee = User;

	let {
		initialFilters = {},
		compactView = false,
		showFilters = true,
		showAddButton = true,
		maxHeight = '600px'
	}: Props = $props();

	// State
	let filters: EmployeeFilters = $state({ ...initialFilters });
	let currentPage = $state(1);
	let itemsPerPage = 20;
	let viewMode: 'grid' | 'list' = $state('grid');
	let selectedEmployees: string[] = $state([]);

	// Direct client instance to avoid context timing issues
	const client = createUrqlClient();

	// Initialize query store immediately with direct client
	let usersQuery: any = $state(null);
	let clientReady = $state(false);

	onMount(() => {
		// Initialize the query with the direct client
		try {
			console.log('URQL client:', client);

			if (!client || !client.createRequestOperation) {
				throw new Error('URQL client is not properly initialized');
			}

			console.log('URQL client validated, initializing query...');
			clientReady = true;
			usersQuery = queryStore({
				client,
				query: GET_EMPLOYEES_QUERY,
				variables: {
					limit: itemsPerPage,
					offset: 0
				}
			});
		} catch (error) {
			console.error('Error initializing query store:', error);
			clientReady = false;
		}

		// Auto-refresh every 5 minutes
		const interval = setInterval(refresh, 5 * 60 * 1000);
		return () => clearInterval(interval);
	});

	// Client-side search filter
	const searchFilter = $derived(() => {
		if (!filters.search) return null;
		const search = filters.search.toLowerCase();
		return (employee: any) =>
			employee.displayName?.toLowerCase().includes(search) ||
			employee.email?.toLowerCase().includes(search);
	});

	// Store query state in reactive variables to avoid direct store access in derived
	let queryState = $state({
		fetching: true,
		error: null as any,
		data: null as { users: User[] } | null
	});

	// Update query state when usersQuery changes
	$effect(() => {
		if (usersQuery) {
			// Subscribe to query store changes
			const unsubscribe = usersQuery.subscribe((state: any) => {
				queryState = {
					fetching: state.fetching,
					error: state.error,
					data: state.data
				};

				// Capture the rerun function
				if (state.rerun) {
					rerunQuery = () => state.rerun({ requestPolicy: 'network-only' });
				}

				console.log('URQL Query State:', {
					fetching: state.fetching,
					error: state.error,
					dataNodes: state.data?.users?.length || 0
				});
			});

			return unsubscribe;
		}
	});

	// Filter results client-side for search
	const filteredEmployees = $derived(() => {
		if (!queryState.data) return [];
		const employees = queryState.data?.users || [];
		if (!searchFilter) return employees;
		return employees.filter(searchFilter);
	});

	// Derived values for display
	const employees = filteredEmployees;
	const totalCount = $derived(employees?.length || 0);
	const totalPages = $derived(Math.ceil(totalCount / itemsPerPage));
	const loading = $derived(!clientReady || queryState.fetching);
	const error = $derived(queryState.error);

	// Handle filter changes
	const handleFiltersChange = (newFilters: EmployeeFilters) => {
		filters = { ...newFilters };
		currentPage = 1; // Reset to first page
	};

	// Handle pagination
	const handlePageChange = (page: number) => {
		currentPage = page;
	};

	// Handle selection
	const toggleSelection = (employeeId: string) => {
		if (selectedEmployees.includes(employeeId)) {
			selectedEmployees = selectedEmployees.filter((id) => id !== employeeId);
		} else {
			selectedEmployees = [...selectedEmployees, employeeId];
		}
	};

	const selectAll = () => {
		selectedEmployees = employees().map((emp: Employee) => emp.id);
	};

	const clearSelection = () => {
		selectedEmployees = [];
	};

	// Bulk actions
	const handleBulkAction = (action: string) => {
		switch (action) {
			case 'export':
				exportSelected();
				break;
			case 'deactivate':
				deactivateSelected();
				break;
			default:
				console.log(`Bulk action: ${action} for`, selectedEmployees);
		}
	};

	const exportSelected = () => {
		// TODO: Implement export functionality
		console.log('Exporting employees:', selectedEmployees);
	};

	const deactivateSelected = () => {
		// TODO: Implement bulk deactivation
		console.log('Deactivating employees:', selectedEmployees);
	};

	// Store the rerun function separately to avoid reactive access
	let rerunQuery: (() => void) | null = null;

	// Refresh data
	const refresh = () => {
		if (rerunQuery) {
			rerunQuery();
		}
	};

	// Add auto-refresh interval to the existing onMount
	// (combined with query initialization above)
</script>

<div class="employee-list" style:max-height={maxHeight}>
	<!-- Header -->
	<div class="header">
		<div class="title-section">
			<h2 class="title">
				Employees
				{#if totalCount > 0}
					<span class="count">({totalCount})</span>
				{/if}
			</h2>

			{#if selectedEmployees.length > 0}
				<div class="selection-info">
					<span>{selectedEmployees.length} selected</span>
					<button class="clear-selection" onclick={clearSelection}> Clear </button>
				</div>
			{/if}
		</div>

		<div class="actions">
			<!-- View mode toggle -->
			<div class="view-toggle">
				<button
					class="view-btn"
					class:active={viewMode === 'grid'}
					onclick={() => (viewMode = 'grid')}
					title="Grid view"
					aria-label="Switch to grid view"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path
							d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"
						/>
					</svg>
				</button>
				<button
					class="view-btn"
					class:active={viewMode === 'list'}
					onclick={() => (viewMode = 'list')}
					title="List view"
					aria-label="Switch to list view"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path
							d="M1 2.5A.5.5 0 0 1 1.5 2h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 3A.5.5 0 0 1 1.5 5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 3A.5.5 0 0 1 1.5 8h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5z"
						/>
					</svg>
				</button>
			</div>

			<!-- Add employee button -->
			{#if showAddButton}
				<RoleGuard permissions={['hr:manage', 'admin:*']}>
					<button class="btn-primary add-btn">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
							<path
								d="M8 0a.5.5 0 0 1 .5.5v7h7a.5.5 0 0 1 0 1h-7v7a.5.5 0 0 1-1 0v-7h-7a.5.5 0 0 1 0-1h7v-7A.5.5 0 0 1 8 0z"
							/>
						</svg>
						Add Employee
					</button>
				</RoleGuard>
			{/if}

			<!-- Refresh button -->
			<button
				class="btn-secondary refresh-btn"
				onclick={refresh}
				disabled={loading}
				title="Refresh data"
				aria-label="Refresh employee data"
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 16 16"
					fill="currentColor"
					class:spinning={loading}
				>
					<path
						d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"
					/>
					<path
						fill-rule="evenodd"
						d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Loading state -->
	{#if loading && !queryState.data}
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
			<button class="btn-secondary" onclick={refresh}> Try Again </button>
		</div>
	{/if}

	<!-- Employee grid/list -->
	{#if !loading && !error && employees.length === 0}
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
	{:else if employees.length > 0}
		<!-- Employee cards/rows -->
		<div
			class="employee-container"
			class:grid-view={viewMode === 'grid'}
			class:list-view={viewMode === 'list'}
		>
			{#each employees() as employee (employee.id)}
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

		<!-- Simple pagination -->
		{#if totalPages > 1}
			<div class="pagination">
				<button
					class="btn-secondary"
					disabled={currentPage === 1}
					onclick={() => handlePageChange(currentPage - 1)}
				>
					Previous
				</button>
				<span class="page-info">
					Page {currentPage} of {totalPages} ({totalCount} total)
				</span>
				<button
					class="btn-secondary"
					disabled={currentPage === totalPages}
					onclick={() => handlePageChange(currentPage + 1)}
				>
					Next
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.employee-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.title-section {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.title {
		margin: 0;
		font-size: var(--cds-productive-heading-03-font-size);
		font-weight: var(--cds-productive-heading-03-font-weight);
		line-height: var(--cds-productive-heading-03-line-height);
		letter-spacing: var(--cds-productive-heading-03-letter-spacing);
		color: var(--cds-text-primary);
	}

	.count {
		font-size: var(--cds-body-compact-01-font-size);
		font-weight: var(--cds-body-compact-01-font-weight);
		line-height: var(--cds-body-compact-01-line-height);
		letter-spacing: var(--cds-body-compact-01-letter-spacing);
		color: var(--cds-text-secondary);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.view-toggle {
		display: flex;
		background-color: #f3f4f6;
		border-radius: 0.375rem;
		padding: var(--cds-spacing-02);
	}

	.view-btn {
		padding: var(--cds-spacing-04);
		background: none;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		color: #6b7280;
		transition: all 0.15s;
	}

	.view-btn:hover {
		color: #111827;
	}

	.view-btn.active {
		background-color: white;
		color: #111827;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}

	.btn-primary,
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
		border-radius: 0.375rem;
		font-size: var(--cds-body-compact-01-font-size);
		font-weight: var(--cds-body-compact-01-font-weight);
		line-height: var(--cds-body-compact-01-line-height);
		letter-spacing: var(--cds-body-compact-01-letter-spacing);
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary:hover {
		background-color: #2563eb;
	}

	.btn-secondary {
		background-color: white;
		color: #374151;
		border-color: #d1d5db;
	}

	.btn-secondary:hover {
		background-color: #f9fafb;
	}

	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

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

	.status-invited {
		background-color: #fef3c7;
		color: #92400e;
	}

	.status-in_progress {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.status-completed {
		background-color: #dcfce7;
		color: #166534;
	}

	.status-terminated {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		padding: var(--cds-spacing-06) 0;
	}

	.page-info {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.spinning {
		animation: spin 1s linear infinite;
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
		.header {
			flex-direction: column;
			align-items: stretch;
		}

		.actions {
			justify-content: space-between;
		}

		.employee-container.grid-view {
			grid-template-columns: 1fr;
		}
	}
</style>
