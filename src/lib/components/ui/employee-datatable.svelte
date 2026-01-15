<script lang="ts">
	import { logger } from '$lib/utils/logger';
	import {
		type ColumnDef,
		type SortingState,
		type VisibilityState,
		getCoreRowModel,
		getPaginationRowModel,
		getSortedRowModel
	} from '@tanstack/table-core';
	import { createSvelteTable } from '$lib/components/ui/data-table/data-table.svelte.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { ChevronDown, Settings2 } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { writable } from 'svelte/store';
	import { getContextClient } from '@urql/svelte';
	import BulkActionsToast from '$lib/components/ui/employee-bulk-actions-toast.svelte';

	// Import decomposed components
	import EmployeeTableContent from '$lib/components/ui/employee-table/EmployeeTableContent.svelte';
	import EmployeeTablePagination from '$lib/components/ui/employee-table/EmployeeTablePagination.svelte';

	// Employee interface matching the data structure
	interface Employee {
		id: string;
		displayName: string;
		email: string | null;
		role: string | null;
		departmentId: string | null;
		hireDate: string | null;
		isActive: boolean;
	}

	interface Props {
		employees: Employee[];
		departments?: Array<{ id: string; name: string }>;
		canViewEmployees: boolean;
		canEditEmployees: boolean;
		canViewInactiveEmployees?: boolean;
		userDepartmentId?: string | null;
		isManager?: boolean;
		hasActiveFilters?: boolean;
		currentPage: number;
		pageSize: number;
		totalPages: number;
		onPageChange: (page: number) => void;
		onPageSizeChange?: (size: number) => void;
		showPerPageControl?: boolean;
		columnVisibilityState?: VisibilityState;
		onColumnVisibilityChange?: (visibility: VisibilityState) => void;
	}

	const {
		employees,
		departments = [],
		canViewEmployees,
		canEditEmployees,
		canViewInactiveEmployees = false,
		userDepartmentId = null,
		isManager = false,
		hasActiveFilters = false,
		currentPage,
		pageSize,
		totalPages,
		onPageChange,
		showPerPageControl = true,
		columnVisibilityState,
		onColumnVisibilityChange
	}: Props = $props();

	// Get urql client for GraphQL mutations
	const urqlClient = getContextClient();

	// Sorting state
	let sorting = $state<SortingState>([]);

	// Row selection state
	let rowSelection = $state<Record<string, boolean>>({});

	// Count selected employees
	const selectedCount = $derived(
		Object.keys(rowSelection).filter((key) => rowSelection[key]).length
	);

	// Get selected employee IDs
	const selectedEmployeeIds = $derived(
		Object.keys(rowSelection).filter((key) => rowSelection[key])
	);

	// Bulk action state - use a store so toast component can reactively update
	const bulkActionsStore = writable({
		selectedCount: 0,
		departments
	});
	let bulkActionsToastId: string | number | undefined = undefined;
	let isToastShowing = $state(false);

	// Column visibility state - use external state if provided, otherwise internal
	let internalColumnVisibility = $state<VisibilityState>({});
	const columnVisibility = $derived(columnVisibilityState ?? internalColumnVisibility);

	// Department lookup map for displaying names instead of IDs
	const departmentMap = $derived.by(() => {
		const map = new Map<string, string>();
		departments.forEach((dept) => {
			map.set(dept.id, dept.name);
		});
		return map;
	});

	// Check if manager can manage a specific employee
	function canManageEmployee(employee: Employee): boolean {
		// Admins can manage everyone
		if (!isManager) return true;

		// Managers can only manage employees in their department
		if (isManager && userDepartmentId) {
			return employee.departmentId === userDepartmentId;
		}

		return false;
	}

	// Format role display
	function formatRole(role: string | null): string {
		if (!role) return 'No role';
		return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	// Format hire date
	function formatHireDate(dateString: string | null): string {
		if (!dateString) return 'N/A';
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return 'N/A';
		}
	}

	// Get status badge variant
	function getStatusBadgeVariant(isActive: boolean): 'default' | 'secondary' {
		return isActive ? 'default' : 'secondary';
	}

	// Define columns - conditionally include checkbox and actions columns
	const baseColumns: ColumnDef<Employee>[] = [
		{
			accessorKey: 'displayName',
			header: 'Name',
			size: 250
		},
		{
			accessorKey: 'email',
			header: 'Email',
			size: 200
		},
		{
			accessorKey: 'departmentId',
			header: 'Department',
			size: 150
		},
		{
			accessorKey: 'role',
			header: 'Role',
			size: 150
		},
		{
			accessorKey: 'hireDate',
			header: 'Hire Date',
			size: 120
		},
		{
			accessorKey: 'isActive',
			header: 'Status',
			size: 100
		}
	];

	// Build columns array with conditional checkbox and actions
	const columns = $derived.by(() => {
		const cols: ColumnDef<Employee>[] = [];

		// Add checkbox column for managers and above
		if (canViewInactiveEmployees) {
			cols.push({
				id: 'select',
				header: '',
				size: 35,
				enableHiding: false,
				enableSorting: false
			});
		}

		// Add base columns
		cols.push(...baseColumns);

		// Add actions column only if user can view or edit employees
		if (canViewEmployees || canEditEmployees) {
			cols.push({
				id: 'actions',
				header: 'Actions',
				size: 120,
				enableHiding: false
			});
		}

		return cols;
	});

	// Create table instance
	const table = createSvelteTable({
		get data() {
			return employees;
		},
		get columns() {
			return columns;
		},
		state: {
			get sorting() {
				return sorting;
			},
			get columnVisibility() {
				return columnVisibility;
			},
			get rowSelection() {
				return rowSelection;
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
			}
		},
		enableRowSelection: true,
		getRowId: (row) => row.id,
		onColumnVisibilityChange: (updater) => {
			const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;

			if (onColumnVisibilityChange) {
				onColumnVisibilityChange(newVisibility);
			} else {
				internalColumnVisibility = newVisibility;
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
		pageCount: totalPages
	});

	// Handle row click
	function handleRowClick(employeeId: string) {
		goto(`/dashboard/employees/${employeeId}`);
	}

	// Handle view employee
	function handleViewEmployee(id: string, event: Event) {
		event.stopPropagation();
		goto(`/dashboard/employees/${id}`);
	}

	// Handle edit employee
	function handleEditEmployee(id: string, event: Event) {
		event.stopPropagation();
		goto(`/dashboard/employees/${id}/edit`);
	}

	// Bulk action handlers
	async function handleBulkDepartmentChange(departmentId: string) {
		const count = selectedCount; // Capture before clearing
		const employeeIds = [...selectedEmployeeIds]; // Capture employee IDs
		logger.info('Moving employees to department:', { departmentId, employeeIds });

		// Show loading toast
		const loadingToastId = toast.loading(
			`Updating ${count} ${count === 1 ? 'employee' : 'employees'}...`
		);

		try {
			// Execute mutations for each employee using nested mutation structure
			const results = await Promise.allSettled(
				employeeIds.map(async (employeeId) => {
					const result = await urqlClient.mutation(
						`
						mutation UpdateEmployeeDepartment($id: UUID!, $input: UpdateUserInput!) {
							users {
								updateUser(id: $id, input: $input) {
									id
									departmentId
								}
							}
						}
					`,
						{
							id: employeeId,
							input: { departmentId }
						}
					);

					if (result.error) {
						throw new Error(result.error.message);
					}

					return result;
				})
			);

			// Count successes and failures
			const successCount = results.filter((r) => r.status === 'fulfilled').length;
			const failureCount = results.filter((r) => r.status === 'rejected').length;

			// Dismiss loading toast
			toast.dismiss(loadingToastId);

			// Show result message
			if (failureCount === 0) {
				toast.success(
					`Moved ${successCount} ${successCount === 1 ? 'employee' : 'employees'} to new department`
				);
			} else if (successCount > 0) {
				toast.warning(
					`Updated ${successCount} ${successCount === 1 ? 'employee' : 'employees'}, but ${failureCount} failed`
				);
			} else {
				toast.error(`Failed to update employees. Please try again.`);
			}

			// Reset selection - effect will handle dismissing bulk actions toast
			rowSelection = {};

			// Reload the page to show updated data
			if (successCount > 0) {
				window.location.reload();
			}
		} catch (error) {
			logger.error('Bulk department change failed', error as Error);
			toast.dismiss(loadingToastId);
			toast.error('Failed to update employees. Please try again.');
		}
	}

	async function handleBulkStatusChange(newStatus: 'active' | 'inactive' | 'terminated') {
		const count = selectedCount; // Capture before clearing
		const employeeIds = [...selectedEmployeeIds]; // Capture employee IDs
		logger.info('Changing employee status to:', { newStatus, employeeIds });

		// Show loading toast
		const loadingToastId = toast.loading(
			`Updating ${count} ${count === 1 ? 'employee' : 'employees'}...`
		);

		try {
			// Execute mutations for each employee using nested mutation structure
			const results = await Promise.allSettled(
				employeeIds.map(async (employeeId) => {
					const result = await urqlClient.mutation(
						`
						mutation UpdateEmployeeStatus($id: UUID!, $input: UpdateUserInput!) {
							users {
								updateUser(id: $id, input: $input) {
									id
									status
								}
							}
						}
					`,
						{
							id: employeeId,
							input: { status: newStatus }
						}
					);

					// Debug logging to see actual response
					logger.info('[Status Change] Full result:', { result });
					logger.info('[Status Change] Has error?', { hasError: !!result.error });
					logger.info('[Status Change] Error details:', { error: result.error });
					logger.info('[Status Change] Data:', { data: result.data });

					if (result.error) {
						logger.error('[Status Change] GraphQL Error:', new Error(result.error.message));
						throw new Error(result.error.message);
					}

					return result;
				})
			);

			// Count successes and failures
			const successCount = results.filter((r) => r.status === 'fulfilled').length;
			const failureCount = results.filter((r) => r.status === 'rejected').length;

			logger.info('[Status Change] Results summary:', {
				successCount,
				failureCount,
				results
			});

			// Dismiss loading toast
			toast.dismiss(loadingToastId);

			// Format status for display (capitalize first letter)
			const statusDisplay = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

			// Show result message
			if (failureCount === 0) {
				const message = `Set ${successCount} ${successCount === 1 ? 'employee' : 'employees'} as ${statusDisplay}`;
				logger.info('[Status Change] Success toast:', { message });
				toast.success(message);
			} else if (successCount > 0) {
				const message = `Updated ${successCount} ${successCount === 1 ? 'employee' : 'employees'}, but ${failureCount} failed`;
				logger.info('[Status Change] Warning toast:', { message });
				toast.warning(message);
			} else {
				const message = `Failed to update employees. Please try again.`;
				logger.info('[Status Change] Error toast:', { message });
				toast.error(message);
			}

			// Reset selection - effect will handle dismissing bulk actions toast
			rowSelection = {};

			// Reload the page to show updated data
			if (successCount > 0) {
				window.location.reload();
			}
		} catch (error) {
			logger.error('Bulk status change failed', error as Error);
			toast.dismiss(loadingToastId);
			toast.error('Failed to update employees. Please try again.');
		}
	}

	function clearSelection() {
		// Just clear the selection - the effect will handle dismissing the toast
		rowSelection = {};
	}

	// Update store whenever selectedCount changes
	$effect(() => {
		bulkActionsStore.set({
			selectedCount,
			departments
		});
	});

	// Show/hide toast only when crossing the selection threshold
	$effect(() => {
		const hasSelection = selectedCount > 0;

		if (hasSelection && !isToastShowing) {
			// Show toast when we have selections for the first time
			isToastShowing = true;
			bulkActionsToastId = toast.custom(BulkActionsToast, {
				duration: Infinity,
				unstyled: true,
				componentProps: {
					bulkActionsStore,
					onClear: clearSelection,
					onMoveDepartment: handleBulkDepartmentChange,
					onChangeStatus: handleBulkStatusChange
				}
			});
		} else if (!hasSelection && isToastShowing) {
			// Dismiss toast when selection goes to 0
			isToastShowing = false;
			if (bulkActionsToastId !== undefined) {
				toast.dismiss(bulkActionsToastId);
				bulkActionsToastId = undefined;
			}
		}
	});
</script>

<div class="space-y-4">
	<!-- Controls Row: Columns only when not in external control mode -->
	{#if showPerPageControl}
		<div class="flex items-center justify-end gap-2">
			<!-- Column Visibility -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant="outline" size="sm" {...props}>
							<Settings2 class="mr-2 h-4 w-4" />
							Columns
							<ChevronDown class="ml-2 h-4 w-4" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-48">
					<DropdownMenu.Label>Toggle Columns</DropdownMenu.Label>
					<DropdownMenu.Separator />
					{#each table.getAllColumns().filter((col) => col.getCanHide()) as column (column.id)}
						<DropdownMenu.CheckboxItem
							class="capitalize"
							checked={column.getIsVisible()}
							onCheckedChange={(value) => column.toggleVisibility(!!value)}
						>
							{column.id.replace(/([A-Z])/g, ' $1').trim()}
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/if}

	<!-- DataTable -->
	<EmployeeTableContent
		{table}
		{columns}
		{hasActiveFilters}
		{departmentMap}
		{canViewEmployees}
		{canEditEmployees}
		loading={false}
		onRowClick={handleRowClick}
		onViewEmployee={handleViewEmployee}
		onEditEmployee={handleEditEmployee}
		{canManageEmployee}
		{formatRole}
		{formatHireDate}
		{getStatusBadgeVariant}
	/>

	<!-- Pagination -->
	{#if totalPages > 1}
		<EmployeeTablePagination {currentPage} {totalPages} {onPageChange} />
	{/if}
</div>
