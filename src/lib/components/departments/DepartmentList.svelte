<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		departmentService,
		departments,
		isLoadingDepartments,
		departmentError
	} from '$lib/services/departmentService';
	import { currentUser, hasPermission } from '$lib/services/auth';
	import DataTable from '../tables/DataTable.svelte';
	import Button from '../base/Button.svelte';
	import Input from '../base/Input.svelte';
	import Select from '../base/Select.svelte';
	import Badge from '../base/Badge.svelte';
	import Card from '../base/Card.svelte';
	import type { Column } from '../tables/DataTable.svelte';
	import type { Department, DepartmentFilter } from '$lib/types';

	// Props
	export let showHeader: boolean = true;
	export let showFilters: boolean = true;
	export let showActions: boolean = true;
	export let selectable: boolean = true;
	export let compact: boolean = false;

	// Internal state
	let selectedDepartments: Department[] = [];
	let searchQuery = '';
	let statusFilter = '';
	let parentFilter = '';
	let sortField = 'name';
	let sortDirection: 'asc' | 'desc' = 'asc';

	// Filter options
	const statusOptions = [
		{ value: '', label: 'All Status' },
		{ value: 'true', label: 'Active' },
		{ value: 'false', label: 'Inactive' }
	];

	const parentOptions = [
		{ value: '', label: 'All Departments' },
		{ value: 'root', label: 'Root Departments' }
		// TODO: Add dynamic parent department options
	];

	// Table columns configuration
	const columns: Column[] = [
		{
			key: 'name',
			label: 'Department Name',
			sortable: true,
			type: 'custom'
		},
		{
			key: 'code',
			label: 'Code',
			sortable: true,
			type: 'text'
		},
		{
			key: 'manager',
			label: 'Manager',
			sortable: true,
			type: 'text',
			format: (value) => value?.display_name || value?.displayName || 'N/A'
		},
		{
			key: 'employeeCount',
			label: 'Employees',
			sortable: true,
			type: 'number'
		},
		{
			key: 'isActive',
			label: 'Status',
			sortable: true,
			type: 'badge',
			badgeVariant: (value) => (value ? 'success' : 'secondary')
		}
	];

	// Add actions column if permissions allow
	if (
		showActions &&
		$currentUser &&
		(hasPermission('department:update') || hasPermission('department:delete'))
	) {
		columns.push({
			key: 'actions',
			label: 'Actions',
			sortable: false,
			type: 'custom',
			align: 'center',
			width: '120px'
		});
	}

	// Reactive filters
	$: filters = buildFilters();
	$: hasFiltersApplied = searchQuery || statusFilter || parentFilter;

	// Load data when filters change
	$: if (filters) {
		loadDepartments();
	}

	function buildFilters(): DepartmentFilter {
		return {
			...(searchQuery && { searchQuery }),
			...(statusFilter !== '' && { isActive: statusFilter === 'true' }),
			...(parentFilter && parentFilter !== 'root' && { parentDepartmentId: parentFilter }),
			...(parentFilter === 'root' && { parentDepartmentId: null })
		};
	}

	async function loadDepartments() {
		try {
			await departmentService.loadDepartments({
				filters,
				sorting: { field: sortField, direction: sortDirection.toUpperCase() as 'ASC' | 'DESC' },
				reset: true
			});
		} catch (error) {
			console.error('Failed to load departments:', error);
		}
	}

	function handleSort(event: CustomEvent) {
		sortField = event.detail.key;
		sortDirection = event.detail.direction;
		loadDepartments();
	}

	function handleRowClick(event: CustomEvent) {
		const { row } = event.detail;
		goto(`/departments/${row.id}`);
	}

	function handleSelectionChange(event: CustomEvent) {
		selectedDepartments = event.detail;
	}

	function clearFilters() {
		searchQuery = '';
		statusFilter = '';
		parentFilter = '';
	}

	async function handleBulkAction(action: string) {
		if (selectedDepartments.length === 0) return;

		const departmentIds = selectedDepartments.map((dept) => dept.id);

		try {
			switch (action) {
				case 'activate':
					// TODO: Implement bulk department activation
					console.log('Bulk activate:', selectedDepartments);
					break;
				case 'archive':
					// TODO: Implement bulk department archiving
					console.log('Bulk archive:', selectedDepartments);
					break;
				case 'export':
					// Simple CSV export
					const csvData = selectedDepartments.map((dept) => ({
						Name: dept.name,
						Code: dept.code,
						Manager: dept.manager?.display_name || dept.manager?.displayName || 'N/A',
						'Employee Count': dept.employeeCount || 0,
						'Budget Limit': dept.budgetLimit || 'N/A',
						Status: dept.isActive ? 'Active' : 'Inactive'
					}));

					const csv = [
						Object.keys(csvData[0]).join(','),
						...csvData.map((row) => Object.values(row).join(','))
					].join('\n');

					const blob = new Blob([csv], { type: 'text/csv' });
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = `departments_${new Date().toISOString().split('T')[0]}.csv`;
					a.click();
					URL.revokeObjectURL(url);
					break;
			}
		} catch (error) {
			console.error('Bulk action failed:', error);
		}
	}

	function getStatusText(isActive: boolean): string {
		return isActive ? 'Active' : 'Inactive';
	}

	async function handleDeleteDepartment(department: Department) {
		const confirmed = confirm(
			`Are you sure you want to archive ${department.name}? This will move the department to inactive status.`
		);

		if (!confirmed) return;

		try {
			await departmentService.archiveDepartment(department.id, 'Manual archive via interface');
			await loadDepartments(); // Refresh the list
		} catch (error) {
			console.error('Failed to archive department:', error);
			alert('Failed to archive department. Please try again.');
		}
	}

	onMount(() => {
		loadDepartments();
	});
</script>

<div class="department-list">
	{#if showHeader}
		<div class="department-list__header">
			<div class="department-list__title">
				<h1 class="text-2xl font-bold text-gray-900">Departments</h1>
				<p class="mt-1 text-sm text-gray-600">
					Manage your organization's departments and structure.
				</p>
			</div>

			<div class="department-list__actions">
				{#if $currentUser && hasPermission('department:create')}
					<Button
						variant="secondary"
						leftIcon="eye"
						on:click={() => goto('/departments/hierarchy')}
					>
						View Hierarchy
					</Button>

					<Button variant="primary" leftIcon="plus" on:click={() => goto('/departments/new')}>
						Add Department
					</Button>
				{/if}
			</div>
		</div>
	{/if}

	{#if showFilters}
		<Card padding="md" class="department-list__filters">
			<div class="filter-grid">
				<div class="filter-item">
					<Input
						type="search"
						placeholder="Search departments..."
						leftIcon="search"
						bind:value={searchQuery}
						on:input={() => loadDepartments()}
					/>
				</div>

				<div class="filter-item">
					<Select
						options={statusOptions}
						bind:value={statusFilter}
						placeholder="Filter by status"
					/>
				</div>

				<div class="filter-item">
					<Select
						options={parentOptions}
						bind:value={parentFilter}
						placeholder="Filter by hierarchy"
					/>
				</div>

				{#if hasFiltersApplied}
					<div class="filter-item">
						<Button variant="ghost" size="sm" leftIcon="x" on:click={clearFilters}>
							Clear Filters
						</Button>
					</div>
				{/if}
			</div>
		</Card>
	{/if}

	{#if selectedDepartments.length > 0}
		<Card padding="sm" class="department-list__bulk-actions">
			<div class="bulk-actions">
				<span class="bulk-actions__count">
					{selectedDepartments.length} department{selectedDepartments.length === 1 ? '' : 's'} selected
				</span>

				<div class="bulk-actions__buttons">
					{#if $currentUser && hasPermission('department:update')}
						<Button
							variant="secondary"
							size="sm"
							leftIcon="check"
							on:click={() => handleBulkAction('activate')}
						>
							Activate
						</Button>

						<Button
							variant="secondary"
							size="sm"
							leftIcon="archive"
							on:click={() => handleBulkAction('archive')}
						>
							Archive
						</Button>
					{/if}

					<Button
						variant="secondary"
						size="sm"
						leftIcon="download"
						on:click={() => handleBulkAction('export')}
					>
						Export
					</Button>
				</div>
			</div>
		</Card>
	{/if}

	<Card padding="none" class="department-list__table">
		<DataTable
			data={$departments}
			{columns}
			loading={$isLoadingDepartments}
			{selectable}
			{compact}
			hoverable={true}
			currentSort={{ key: sortField, direction: sortDirection }}
			bind:selectedRows={selectedDepartments}
			emptyMessage="No departments found"
			on:sort={handleSort}
			on:rowClick={handleRowClick}
			on:selectionChange={handleSelectionChange}
		>
			<svelte:fragment slot="cell" let:column let:value let:row>
				{#if column.key === 'name'}
					<div class="department-name-cell">
						<div class="department-info">
							<div class="department-name">{row.name}</div>
							{#if row.description}
								<div class="department-description">{row.description}</div>
							{/if}
							{#if row.parentDepartment}
								<div class="department-parent">
									<span class="text-xs text-gray-500">
										Under: {row.parentDepartment.name}
									</span>
								</div>
							{/if}
						</div>
					</div>
				{:else if column.key === 'isActive'}
					<Badge variant={row.isActive ? 'success' : 'secondary'} size="sm">
						{getStatusText(row.isActive)}
					</Badge>
				{:else if column.key === 'actions'}
					<div class="action-buttons">
						{#if $currentUser && hasPermission('department:update')}
							<Button
								variant="ghost"
								size="xs"
								iconOnly
								leftIcon="edit"
								on:click={(e) => {
									e.stopPropagation();
									goto(`/departments/${row.id}/edit`);
								}}
							/>
						{/if}

						{#if $currentUser && hasPermission('department:delete')}
							<Button
								variant="ghost"
								size="xs"
								iconOnly
								leftIcon="archive"
								on:click={(e) => {
									e.stopPropagation();
									handleDeleteDepartment(row);
								}}
							/>
						{/if}
					</div>
				{/if}
			</svelte:fragment>
		</DataTable>
	</Card>

	{#if $departmentError}
		<Card padding="md" class="department-list__error">
			<div class="error-message">
				<div class="error-icon">
					<i class="icon-alert-circle"></i>
				</div>
				<div class="error-content">
					<h3 class="error-title">Error Loading Departments</h3>
					<p class="error-description">{$departmentError}</p>
					<Button
						variant="secondary"
						size="sm"
						leftIcon="refresh-cw"
						on:click={() => loadDepartments()}
					>
						Retry
					</Button>
				</div>
			</div>
		</Card>
	{/if}
</div>

<style lang="postcss">
	.department-list {
		@apply space-y-6;
	}

	/* Header */
	.department-list__header {
		@apply flex items-start justify-between;
	}

	.department-list__title h1 {
		@apply text-2xl font-bold text-gray-900;
	}

	.department-list__title p {
		@apply mt-1 text-sm text-gray-600;
	}

	.department-list__actions {
		@apply flex items-center space-x-3;
	}

	/* Filters */
	.filter-grid {
		@apply grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
	}

	.filter-item {
		@apply min-w-0;
	}

	/* Bulk Actions */
	.bulk-actions {
		@apply flex items-center justify-between border-b border-blue-200 bg-blue-50 px-4 py-3;
	}

	.bulk-actions__count {
		@apply text-sm font-medium text-blue-900;
	}

	.bulk-actions__buttons {
		@apply flex items-center space-x-2;
	}

	/* Department Name Cell */
	.department-name-cell {
		@apply flex items-center space-x-3;
	}

	.department-info {
		@apply min-w-0 flex-1;
	}

	.department-name {
		@apply truncate text-sm font-medium text-gray-900;
	}

	.department-description {
		@apply truncate text-xs text-gray-500;
	}

	.department-parent {
		@apply truncate text-xs text-gray-500;
	}

	/* Action Buttons */
	.action-buttons {
		@apply flex items-center space-x-1;
	}

	/* Error State */
	.error-message {
		@apply flex items-start space-x-3;
	}

	.error-icon {
		@apply flex-shrink-0 text-red-500;
	}

	.error-icon i {
		@apply h-5 w-5;
	}

	.error-content {
		@apply flex-1;
	}

	.error-title {
		@apply text-sm font-medium text-gray-900;
	}

	.error-description {
		@apply mt-1 text-sm text-gray-600;
	}

	.error-content button {
		@apply mt-3;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.department-list__header {
			@apply flex-col items-start space-y-4;
		}

		.filter-grid {
			@apply grid-cols-1;
		}

		.bulk-actions {
			@apply flex-col items-start space-y-3 px-3 py-4;
		}

		.bulk-actions__buttons {
			@apply w-full justify-start;
		}
	}
</style>
