<script lang="ts">
	import {
		getCoreRowModel,
		getSortedRowModel,
		getPaginationRowModel,
		type ColumnDef,
		type SortingState,
		type VisibilityState
	} from '@tanstack/table-core';
	import { createSvelteTable } from '$lib/components/ui/data-table/data-table.svelte.js';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Users, Eye, Edit, ChevronDown, ChevronUp, ChevronsUpDown, Settings2, X, UserCog, ToggleLeft, ToggleRight } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { writable } from 'svelte/store';
	import { getContextClient } from '@urql/svelte';
	import BulkActionsToast from '$lib/components/ui/employee-bulk-actions-toast.svelte';

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

	let { employees, departments = [], canViewEmployees, canEditEmployees, canViewInactiveEmployees = false, userDepartmentId = null, isManager = false, hasActiveFilters = false, currentPage, pageSize, totalPages, onPageChange, onPageSizeChange, showPerPageControl = true, columnVisibilityState, onColumnVisibilityChange }: Props = $props();

	// Get urql client for GraphQL mutations
	const urqlClient = getContextClient();

	// Sorting state
	let sorting = $state<SortingState>([]);

	// Row selection state
	let rowSelection = $state<Record<string, boolean>>({});

	// Count selected employees
	const selectedCount = $derived(Object.keys(rowSelection).filter(key => rowSelection[key]).length);

	// Get selected employee IDs
	const selectedEmployeeIds = $derived(Object.keys(rowSelection).filter(key => rowSelection[key]));

	// Bulk action state - use a store so toast component can reactively update
	const bulkActionsStore = writable({
		selectedCount: 0,
		departments: departments
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
		console.log('Moving employees to department:', departmentId, 'Employee IDs:', employeeIds);

		// Show loading toast
		const loadingToastId = toast.loading(`Updating ${count} ${count === 1 ? 'employee' : 'employees'}...`);

		try {
			// Execute mutations for each employee using nested mutation structure
			const results = await Promise.allSettled(
				employeeIds.map(async (employeeId) => {
					const result = await urqlClient.mutation(`
						mutation UpdateEmployeeDepartment($id: UUID!, $input: UpdateUserInput!) {
							users {
								updateUser(id: $id, input: $input) {
									id
									departmentId
								}
							}
						}
					`, {
						id: employeeId,
						input: { departmentId }
					});

					if (result.error) {
						throw new Error(result.error.message);
					}

					return result;
				})
			);

			// Count successes and failures
			const successCount = results.filter(r => r.status === 'fulfilled').length;
			const failureCount = results.filter(r => r.status === 'rejected').length;

			// Dismiss loading toast
			toast.dismiss(loadingToastId);

			// Show result message
			if (failureCount === 0) {
				toast.success(`Moved ${successCount} ${successCount === 1 ? 'employee' : 'employees'} to new department`);
			} else if (successCount > 0) {
				toast.warning(`Updated ${successCount} ${successCount === 1 ? 'employee' : 'employees'}, but ${failureCount} failed`);
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
			console.error('[Bulk Department Update Error]', error);
			toast.dismiss(loadingToastId);
			toast.error('Failed to update employees. Please try again.');
		}
	}

	async function handleBulkStatusChange(newStatus: boolean) {
		const count = selectedCount; // Capture before clearing
		const employeeIds = [...selectedEmployeeIds]; // Capture employee IDs
		console.log('Changing employee status to:', newStatus ? 'Active' : 'Inactive', 'Employee IDs:', employeeIds);

		// Show loading toast
		const loadingToastId = toast.loading(`Updating ${count} ${count === 1 ? 'employee' : 'employees'}...`);

		try {
			// Execute mutations for each employee using nested mutation structure
			const results = await Promise.allSettled(
				employeeIds.map(async (employeeId) => {
					const result = await urqlClient.mutation(`
						mutation UpdateEmployeeStatus($id: UUID!, $input: UpdateUserInput!) {
							users {
								updateUser(id: $id, input: $input) {
									id
									isActive
								}
							}
						}
					`, {
						id: employeeId,
						input: { isActive: newStatus }
					});

					if (result.error) {
						throw new Error(result.error.message);
					}

					return result;
				})
			);

			// Count successes and failures
			const successCount = results.filter(r => r.status === 'fulfilled').length;
			const failureCount = results.filter(r => r.status === 'rejected').length;

			// Dismiss loading toast
			toast.dismiss(loadingToastId);

			// Show result message
			if (failureCount === 0) {
				toast.success(`Set ${successCount} ${successCount === 1 ? 'employee' : 'employees'} as ${newStatus ? 'Active' : 'Inactive'}`);
			} else if (successCount > 0) {
				toast.warning(`Updated ${successCount} ${successCount === 1 ? 'employee' : 'employees'}, but ${failureCount} failed`);
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
			console.error('[Bulk Status Update Error]', error);
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
					{#each table
						.getAllColumns()
						.filter((col) => col.getCanHide()) as column (column.id)}
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
	<div class="rounded-md border overflow-auto bg-card text-card-foreground" data-testid="employee-datatable">
		<Table.Root class="table-auto w-full">
		<Table.Header>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<Table.Row>
					{#each headerGroup.headers as header (header.id)}
						<Table.Head
							class={header.column.getCanSort() ? 'cursor-pointer' : '' + (header.column.id === 'select' ? ' pl-6 pr-2' : header.column.id === 'displayName' ? ' pl-2' : '')}
							style={header.column.columnDef.size ? `width: ${header.column.columnDef.size}px; min-width: ${header.column.columnDef.size}px;` : ''}
							onclick={header.column.getCanSort()
								? () => header.column.toggleSorting()
								: undefined}
						>
							{#if !header.isPlaceholder}
								<div class="flex items-center gap-2">
									{#if header.column.id === 'select'}
										<Tooltip.Provider delayDuration={0}>
											<Tooltip.Root>
												<Tooltip.Trigger>
													<Checkbox
														checked={table.getIsAllRowsSelected()}
														indeterminate={table.getIsSomeRowsSelected()}
														disabled={!hasActiveFilters}
														onCheckedChange={(value) => {
															table.toggleAllRowsSelected(!!value);
														}}
													/>
												</Tooltip.Trigger>
												{#if !hasActiveFilters}
													<Tooltip.Content>
														<p>Selecting all employees is blocked</p>
													</Tooltip.Content>
												{/if}
											</Tooltip.Root>
										</Tooltip.Provider>
									{:else if header.column.id === 'actions'}
										<div class="text-right w-full">Actions</div>
									{:else}
										<span>{header.column.columnDef.header}</span>
									{/if}
									{#if header.column.getCanSort()}
										{#if header.column.getIsSorted() === 'asc'}
											<ChevronUp class="h-4 w-4" />
										{:else if header.column.getIsSorted() === 'desc'}
											<ChevronDown class="h-4 w-4" />
										{:else}
											<ChevronsUpDown class="h-4 w-4 opacity-50" />
										{/if}
									{/if}
								</div>
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			{/each}
		</Table.Header>
		<Table.Body>
			{#if table.getRowModel().rows?.length}
				{#each table.getRowModel().rows as row (row.id)}
					<Table.Row
						class="cursor-pointer hover:bg-muted/50"
						onclick={() => handleRowClick(row.original.id)}
					>
						{#each row.getVisibleCells() as cell (cell.id)}
							<Table.Cell
								class={cell.column.id === 'select' ? 'pl-6 pr-2' : cell.column.id === 'displayName' ? 'pl-2' : ''}
								style={cell.column.columnDef.size ? `width: ${cell.column.columnDef.size}px; min-width: ${cell.column.columnDef.size}px;` : ''}
							>
								{#if cell.column.id === 'select'}
									<Checkbox
										checked={row.getIsSelected()}
										disabled={!row.getCanSelect()}
										onCheckedChange={(value) => {
											row.toggleSelected(!!value);
										}}
										onclick={(e) => e.stopPropagation()}
									/>
								{:else if cell.column.id === 'displayName'}
									<div class="flex items-center gap-1.5">
										<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
											<Users class="h-5 w-5 text-primary" />
										</div>
										<div class="font-medium">{row.original.displayName}</div>
									</div>
								{:else if cell.column.id === 'email'}
									{#if row.original.email}
										<a href="mailto:{row.original.email}" class="text-sm hover:text-primary" onclick={(e) => e.stopPropagation()}>
											{row.original.email}
										</a>
									{:else}
										<span class="text-sm text-muted-foreground">N/A</span>
									{/if}
								{:else if cell.column.id === 'departmentId'}
									{#if row.original.departmentId}
										<span class="text-sm">{departmentMap.get(row.original.departmentId) || 'Unknown'}</span>
									{:else}
										<span class="text-sm text-muted-foreground">N/A</span>
									{/if}
								{:else if cell.column.id === 'role'}
									{#if row.original.role}
										<Badge variant="outline">{formatRole(row.original.role)}</Badge>
									{:else}
										<span class="text-sm text-muted-foreground">N/A</span>
									{/if}
								{:else if cell.column.id === 'hireDate'}
									<span class="text-sm text-muted-foreground">
										{formatHireDate(row.original.hireDate)}
									</span>
								{:else if cell.column.id === 'isActive'}
									<Badge variant={getStatusBadgeVariant(row.original.isActive)}>
										{row.original.isActive ? 'Active' : 'Inactive'}
									</Badge>
								{:else if cell.column.id === 'actions'}
									{@const canManage = canManageEmployee(row.original)}
									<div class="flex gap-1 justify-end">
										{#if canViewEmployees}
											<Button
												variant="ghost"
												size="sm"
												disabled={!canManage}
												class={!canManage ? 'opacity-50 cursor-not-allowed' : ''}
												onclick={(e) => {
													if (canManage) {
														handleViewEmployee(row.original.id, e);
													} else {
														e.stopPropagation();
													}
												}}
											>
												<Eye class="h-4 w-4" />
											</Button>
										{/if}
										{#if canEditEmployees}
											<Button
												variant="ghost"
												size="sm"
												disabled={!canManage}
												class={!canManage ? 'opacity-50 cursor-not-allowed' : ''}
												onclick={(e) => {
													if (canManage) {
														handleEditEmployee(row.original.id, e);
													} else {
														e.stopPropagation();
													}
												}}
											>
												<Edit class="h-4 w-4" />
											</Button>
										{/if}
									</div>
								{/if}
							</Table.Cell>
						{/each}
					</Table.Row>
				{/each}
			{:else}
				<Table.Row>
					<Table.Cell colspan={columns.length} class="h-24 text-center">
						<div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
							<Users class="h-8 w-8" />
							<p>No employees found</p>
						</div>
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between px-6 py-4 border-t bg-card text-card-foreground" data-testid="employee-pagination">
			<div class="text-sm text-muted-foreground">
				Page {currentPage} of {totalPages}
			</div>
			<div class="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={currentPage <= 1}
					onclick={() => onPageChange(currentPage - 1)}
				>
					Previous
				</Button>

				{#if totalPages <= 7}
					{#each Array(totalPages) as _, i}
						<Button
							variant={currentPage === i + 1 ? 'default' : 'outline'}
							size="sm"
							onclick={() => onPageChange(i + 1)}
						>
							{i + 1}
						</Button>
					{/each}
				{:else}
					<!-- Complex pagination with ellipsis -->
					<Button
						variant={currentPage === 1 ? 'default' : 'outline'}
						size="sm"
						onclick={() => onPageChange(1)}
					>
						1
					</Button>

					{#if currentPage > 3}
						<span class="px-2 text-muted-foreground">...</span>
					{/if}

					{#each Array(Math.min(5, totalPages - 2)) as _, i}
						{@const pageNum = Math.max(2, Math.min(currentPage - 2 + i, totalPages - 1))}
						{#if pageNum >= 2 && pageNum <= totalPages - 1}
							<Button
								variant={currentPage === pageNum ? 'default' : 'outline'}
								size="sm"
								onclick={() => onPageChange(pageNum)}
							>
								{pageNum}
							</Button>
						{/if}
					{/each}

					{#if currentPage < totalPages - 2}
						<span class="px-2 text-muted-foreground">...</span>
					{/if}

					<Button
						variant={currentPage === totalPages ? 'default' : 'outline'}
						size="sm"
						onclick={() => onPageChange(totalPages)}
					>
						{totalPages}
					</Button>
				{/if}

				<Button
					variant="outline"
					size="sm"
					disabled={currentPage >= totalPages}
					onclick={() => onPageChange(currentPage + 1)}
				>
					Next
				</Button>
			</div>
		</div>
	{/if}
	</div>
</div>
