<!--
	Data Table Component
	
	Advanced data table with sorting, filtering, pagination, and bulk operations
	Supports responsive design and accessibility features
	
	Usage:
	<DataTable
		data={employees}
		columns={employeeColumns}
		onSort={handleSort}
		onFilter={handleFilter}
		selectable
		pagination
	/>
-->

<script lang="ts">
	import { cn } from '$lib/utils';
	import Button from './Button.svelte';

	// Column definition interface
	interface TableColumn<T = any> {
		key: string;
		label: string;
		sortable?: boolean;
		filterable?: boolean;
		width?: string;
		align?: 'left' | 'center' | 'right';
		render?: (value: any, row: T, index: number) => any;
		headerRender?: () => any;
	}

	// Filter definition interface
	interface TableFilter {
		column: string;
		value: any;
		operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
	}

	// Sort definition interface
	interface TableSort {
		column: string;
		direction: 'asc' | 'desc';
	}

	// Pagination interface
	interface TablePagination {
		page: number;
		limit: number;
		total: number;
	}

	// Component props
	interface DataTableProps<T = any> {
		data: T[];
		columns: TableColumn<T>[];
		loading?: boolean;
		selectable?: boolean;
		selectedRows?: T[];
		sortBy?: TableSort;
		filters?: TableFilter[];
		pagination?: TablePagination;
		emptyMessage?: string;
		striped?: boolean;
		bordered?: boolean;
		hover?: boolean;
		compact?: boolean;
		stickyHeader?: boolean;
		maxHeight?: string;
		class?: string;
		onSort?: (sort: TableSort) => void;
		onFilter?: (filters: TableFilter[]) => void;
		onSelectionChange?: (selected: T[]) => void;
		onPageChange?: (page: number) => void;
		onRowClick?: (row: T, index: number) => void;
		children?: any;
	}

	let {
		data = [],
		columns = [],
		loading = false,
		selectable = false,
		selectedRows = $bindable([]),
		sortBy,
		filters = [],
		pagination,
		emptyMessage = 'No data available',
		striped = false,
		bordered = true,
		hover = true,
		compact = false,
		stickyHeader = false,
		maxHeight,
		class: className = '',
		onSort,
		onFilter,
		onSelectionChange,
		onPageChange,
		onRowClick,
		children,
		...restProps
	}: DataTableProps = $props();

	// Internal state
	let internalSort = $state<TableSort | undefined>(sortBy);
	let internalFilters = $state<TableFilter[]>([...filters]);
	let allSelected = $state(false);
	let indeterminate = $state(false);

	// Update selection state based on selected rows
	$: {
		if (data.length > 0) {
			const selectedCount = selectedRows?.length || 0;
			allSelected = selectedCount === data.length;
			indeterminate = selectedCount > 0 && selectedCount < data.length;
		} else {
			allSelected = false;
			indeterminate = false;
		}
	}

	// Table container classes
	$: containerClasses = cn(
		'relative overflow-auto rounded-md border',
		maxHeight && 'max-h-[var(--max-height)]',
		className
	);

	// Table classes
	$: tableClasses = cn(
		'w-full text-sm',
		bordered && 'border-collapse',
		!bordered && 'border-separate border-spacing-0'
	);

	// Table body classes
	$: tbodyClasses = cn(
		'divide-y divide-border',
		striped && '[&>tr:nth-child(even)]:bg-muted/50'
	);

	// Table row classes
	$: getRowClasses = (index: number, selected: boolean) => cn(
		'transition-colors',
		hover && 'hover:bg-muted/50',
		selected && 'bg-accent/50',
		onRowClick && 'cursor-pointer',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
	);

	// Table cell classes
	$: getCellClasses = (column: TableColumn, isHeader = false) => cn(
		isHeader ? 'h-12 px-4 py-3 font-medium' : compact ? 'px-4 py-2' : 'px-4 py-3',
		column.align === 'center' && 'text-center',
		column.align === 'right' && 'text-right',
		isHeader && stickyHeader && 'sticky top-0 bg-background z-10 border-b'
	);

	// Handle sort
	function handleSort(column: string) {
		if (!columns.find(col => col.key === column)?.sortable) return;

		const newSort: TableSort = {
			column,
			direction: internalSort?.column === column && internalSort.direction === 'asc' ? 'desc' : 'asc'
		};

		internalSort = newSort;
		onSort?.(newSort);
	}

	// Handle select all
	function handleSelectAll(checked: boolean) {
		if (checked) {
			selectedRows = [...data];
		} else {
			selectedRows = [];
		}
		onSelectionChange?.(selectedRows);
	}

	// Handle row selection
	function handleRowSelect(row: any, checked: boolean) {
		if (checked) {
			selectedRows = [...(selectedRows || []), row];
		} else {
			selectedRows = (selectedRows || []).filter(r => r !== row);
		}
		onSelectionChange?.(selectedRows);
	}

	// Check if row is selected
	function isRowSelected(row: any): boolean {
		return Boolean(selectedRows?.includes(row));
	}

	// Handle row click
	function handleRowClick(row: any, index: number, event: MouseEvent) {
		// Don't trigger if clicking on interactive elements
		const target = event.target as HTMLElement;
		if (target.closest('button, input, a, [role="button"]')) return;

		onRowClick?.(row, index);
	}

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent, row: any, index: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onRowClick?.(row, index);
		}
	}

	// Get sort icon
	function getSortIcon(column: string): string {
		if (internalSort?.column !== column) return '↕️';
		return internalSort.direction === 'asc' ? '↑' : '↓';
	}

	// Render cell content
	function renderCell(column: TableColumn, value: any, row: any, index: number) {
		if (column.render) {
			return column.render(value, row, index);
		}
		return value;
	}

	// Generate unique table ID
	const tableId = `datatable-${Math.random().toString(36).substr(2, 9)}`;
</script>

<div
	class={containerClasses}
	style={maxHeight ? `--max-height: ${maxHeight}` : undefined}
	{...restProps}
>
	{#if loading}
		<div class="flex items-center justify-center h-32">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			<span class="ml-2 text-muted-foreground">Loading...</span>
		</div>
	{:else}
		<table id={tableId} class={tableClasses} role="table" aria-label="Data table">
			<thead class="bg-muted/50">
				<tr role="row">
					{#if selectable}
						<th class={getCellClasses({ key: 'select', label: '', align: 'center' }, true)} scope="col">
							<input
								type="checkbox"
								checked={allSelected}
								{indeterminate}
								onchange={(e) => handleSelectAll(e.currentTarget.checked)}
								class="rounded border-input focus:ring-2 focus:ring-ring focus:ring-offset-2"
								aria-label="Select all rows"
							/>
						</th>
					{/if}
					
					{#each columns as column}
						<th
							class={getCellClasses(column, true)}
							scope="col"
							style={column.width ? `width: ${column.width}` : undefined}
						>
							{#if column.sortable}
								<button
									type="button"
									class="flex items-center gap-2 font-medium hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
									onclick={() => handleSort(column.key)}
									aria-label={`Sort by ${column.label}`}
								>
									{#if column.headerRender}
										{@render column.headerRender?.()}
									{:else}
										{column.label}
									{/if}
									<span class="text-xs opacity-60">
										{getSortIcon(column.key)}
									</span>
								</button>
							{:else}
								{#if column.headerRender}
									{@render column.headerRender?.()}
								{:else}
									{column.label}
								{/if}
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			
			<tbody class={tbodyClasses}>
				{#if data.length === 0}
					<tr role="row">
						<td
							colspan={selectable ? columns.length + 1 : columns.length}
							class="px-4 py-8 text-center text-muted-foreground"
						>
							{emptyMessage}
						</td>
					</tr>
				{:else}
					{#each data as row, index}
						{@const selected = isRowSelected(row)}
						<tr
							role="row"
							class={getRowClasses(index, selected)}
							tabindex={onRowClick ? 0 : -1}
							onclick={(e) => handleRowClick(row, index, e)}
							onkeydown={(e) => handleKeydown(e, row, index)}
							aria-selected={selected}
						>
							{#if selectable}
								<td class={getCellClasses({ key: 'select', label: '', align: 'center' })}>
									<input
										type="checkbox"
										checked={selected}
										onchange={(e) => handleRowSelect(row, e.currentTarget.checked)}
										class="rounded border-input focus:ring-2 focus:ring-ring focus:ring-offset-2"
										aria-label={`Select row ${index + 1}`}
									/>
								</td>
							{/if}
							
							{#each columns as column}
								<td class={getCellClasses(column)} role="gridcell">
									{@render renderCell(column, row[column.key], row, index)}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

		{#if pagination}
			<div class="flex items-center justify-between px-4 py-3 border-t bg-background">
				<div class="flex items-center text-sm text-muted-foreground">
					Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
				</div>
				
				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={pagination.page <= 1}
						onclick={() => onPageChange?.(pagination.page - 1)}
					>
						Previous
					</Button>
					
					<span class="text-sm">
						Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
					</span>
					
					<Button
						variant="outline"
						size="sm"
						disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
						onclick={() => onPageChange?.(pagination.page + 1)}
					>
						Next
					</Button>
				</div>
			</div>
		{/if}
	{/if}

	{@render children?.()}
</div>

<style>
	/* Custom scrollbar styles */
	.relative::-webkit-scrollbar {
		height: 8px;
		width: 8px;
	}
	
	.relative::-webkit-scrollbar-track {
		background: hsl(var(--muted));
		border-radius: 4px;
	}
	
	.relative::-webkit-scrollbar-thumb {
		background: hsl(var(--border));
		border-radius: 4px;
	}
	
	.relative::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--muted-foreground));
	}

	/* Custom checkbox indeterminate styles */
	input[type="checkbox"]:indeterminate {
		background-color: hsl(var(--primary));
		border-color: hsl(var(--primary));
	}
	
	input[type="checkbox"]:indeterminate::before {
		content: '—';
		color: hsl(var(--primary-foreground));
		font-weight: bold;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
</style>