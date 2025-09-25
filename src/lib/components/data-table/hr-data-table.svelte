<!--
@fileoverview Advanced data table component for SvelteHR management system
@component HrDataTable
@description Generic, reusable data table with filtering, sorting, pagination, and actions
-->

<script lang="ts" module>
	import type { Snippet } from 'svelte';

	/**
	 * Column configuration interface for the data table
	 */
	export interface DataTableColumn<T = any> {
		/** Unique identifier for the column */
		key: string;
		/** Display label for the column header */
		label: string;
		/** Whether the column is sortable */
		sortable?: boolean;
		/** Whether the column is filterable */
		filterable?: boolean;
		/** Custom width for the column */
		width?: string;
		/** Custom CSS classes for the column */
		className?: string;
		/** Custom cell renderer snippet */
		cellRenderer?: Snippet<[{ value: any; row: T; column: DataTableColumn<T> }]>;
		/** Format function for cell value display */
		format?: (value: any) => string;
		/** Hide column on mobile */
		hideMobile?: boolean;
		/** Column alignment */
		align?: 'left' | 'center' | 'right';
	}

	/**
	 * Action button configuration for row actions
	 */
	export interface RowAction<T = any> {
		/** Unique identifier for the action */
		id: string;
		/** Display label for the action */
		label: string;
		/** Icon component or string */
		icon?: any;
		/** Action handler function */
		handler: (row: T) => void | Promise<void>;
		/** CSS classes for styling */
		className?: string;
		/** Show action only when condition is met */
		show?: (row: T) => boolean;
		/** Disable action when condition is met */
		disabled?: (row: T) => boolean;
		/** Action variant */
		variant?: 'default' | 'destructive' | 'outline' | 'ghost';
	}

	/**
	 * Filter configuration interface
	 */
	export interface TableFilter {
		/** Column key to filter on */
		key: string;
		/** Filter value */
		value: any;
		/** Filter operator */
		operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
	}

	/**
	 * Sort configuration interface
	 */
	export interface TableSort {
		/** Column key to sort on */
		key: string;
		/** Sort direction */
		direction: 'asc' | 'desc';
	}

	/**
	 * Main component props interface
	 */
	export interface HrDataTableProps<T = any> {
		/** Array of data to display */
		data: T[];
		/** Column configuration array */
		columns: DataTableColumn<T>[];
		/** Loading state */
		loading?: boolean;
		/** Empty state message */
		emptyMessage?: string;
		/** Enable row selection */
		selectable?: boolean;
		/** Multiple row selection */
		multiSelect?: boolean;
		/** Selected rows */
		selectedRows?: T[];
		/** Row actions configuration */
		actions?: RowAction<T>[];
		/** Enable search functionality */
		searchable?: boolean;
		/** Search placeholder text */
		searchPlaceholder?: string;
		/** Enable pagination */
		paginated?: boolean;
		/** Items per page */
		pageSize?: number;
		/** Available page size options */
		pageSizeOptions?: number[];
		/** Current page (1-indexed) */
		currentPage?: number;
		/** Total items count */
		totalItems?: number;
		/** Enable filtering */
		filterable?: boolean;
		/** Active filters */
		filters?: TableFilter[];
		/** Current sort configuration */
		sort?: TableSort | null;
		/** Row key function for unique identification */
		rowKey?: (row: T) => string | number;
		/** Custom CSS classes for the table */
		className?: string;
		/** Sticky header */
		stickyHeader?: boolean;
		/** Show row numbers */
		showRowNumbers?: boolean;
		/** Compact mode */
		compact?: boolean;
		/** Enable row hover effects */
		hoverable?: boolean;
		/** Custom row click handler */
		onRowClick?: (row: T) => void;
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		Search,
		ChevronUp,
		ChevronDown,
		MoreHorizontal,
		Filter,
		X,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight
	} from 'lucide-svelte';

	let {
		data = [],
		columns = [],
		loading = false,
		emptyMessage = 'No data available',
		selectable = false,
		multiSelect = true,
		selectedRows = $bindable([]),
		actions = [],
		searchable = true,
		searchPlaceholder = 'Search...',
		paginated = true,
		pageSize = 10,
		pageSizeOptions = [10, 25, 50, 100],
		currentPage = $bindable(1),
		totalItems = undefined,
		filterable = true,
		filters = $bindable([]),
		sort = $bindable(null),
		rowKey = (row: any) => row.id || Math.random().toString(),
		className = '',
		stickyHeader = false,
		showRowNumbers = false,
		compact = false,
		hoverable = true,
		onRowClick = undefined,
		...restProps
	}: HrDataTableProps = $props();

	// Internal state
	let searchTerm = $state('');
	let showFilters = $state(false);
	let columnFilters = $state<Record<string, string>>({});

	// Computed values
	const totalItemsComputed = $derived(totalItems ?? filteredData.length);
	const totalPages = $derived(Math.ceil(totalItemsComputed / pageSize));
	const startItem = $derived((currentPage - 1) * pageSize + 1);
	const endItem = $derived(Math.min(currentPage * pageSize, totalItemsComputed));

	// Filter and search data
	const filteredData = $derived(() => {
		let result = [...data];

		// Apply search
		if (searchTerm.trim()) {
			const searchLower = searchTerm.toLowerCase();
			result = result.filter(row =>
				columns.some(col => {
					const value = row[col.key];
					if (value == null) return false;
					return String(value).toLowerCase().includes(searchLower);
				})
			);
		}

		// Apply column filters
		Object.entries(columnFilters).forEach(([key, filterValue]) => {
			if (filterValue.trim()) {
				const filterLower = filterValue.toLowerCase();
				result = result.filter(row => {
					const value = row[key];
					if (value == null) return false;
					return String(value).toLowerCase().includes(filterLower);
				});
			}
		});

		// Apply external filters
		filters?.forEach(filter => {
			result = result.filter(row => {
				const value = row[filter.key];
				switch (filter.operator || 'contains') {
					case 'equals':
						return value === filter.value;
					case 'contains':
						return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
					case 'startsWith':
						return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
					case 'endsWith':
						return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
					case 'gt':
						return Number(value) > Number(filter.value);
					case 'lt':
						return Number(value) < Number(filter.value);
					case 'gte':
						return Number(value) >= Number(filter.value);
					case 'lte':
						return Number(value) <= Number(filter.value);
					default:
						return true;
				}
			});
		});

		return result;
	});

	// Sort data
	const sortedData = $derived(() => {
		if (!sort) return filteredData;

		return [...filteredData].sort((a, b) => {
			const aVal = a[sort.key];
			const bVal = b[sort.key];

			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return sort.direction === 'asc' ? -1 : 1;
			if (bVal == null) return sort.direction === 'asc' ? 1 : -1;

			let result = 0;
			if (typeof aVal === 'number' && typeof bVal === 'number') {
				result = aVal - bVal;
			} else {
				result = String(aVal).localeCompare(String(bVal));
			}

			return sort.direction === 'asc' ? result : -result;
		});
	});

	// Paginate data
	const paginatedData = $derived(() => {
		if (!paginated) return sortedData;
		const start = (currentPage - 1) * pageSize;
		return sortedData.slice(start, start + pageSize);
	});

	// Selection helpers
	const allSelected = $derived(
		paginatedData.length > 0 &&
		paginatedData.every(row => selectedRows.some(selected => rowKey(selected) === rowKey(row)))
	);

	const someSelected = $derived(
		paginatedData.some(row => selectedRows.some(selected => rowKey(selected) === rowKey(row)))
	);

	// Event handlers
	function handleSort(columnKey: string) {
		if (!columns.find(col => col.key === columnKey)?.sortable) return;

		if (sort?.key === columnKey) {
			sort = sort.direction === 'asc'
				? { key: columnKey, direction: 'desc' }
				: null;
		} else {
			sort = { key: columnKey, direction: 'asc' };
		}
	}

	function handleSelectAll() {
		if (allSelected) {
			selectedRows = selectedRows.filter(selected =>
				!paginatedData.some(row => rowKey(selected) === rowKey(row))
			);
		} else {
			const newSelections = paginatedData.filter(row =>
				!selectedRows.some(selected => rowKey(selected) === rowKey(row))
			);
			selectedRows = [...selectedRows, ...newSelections];
		}
	}

	function handleRowSelect(row: any) {
		const key = rowKey(row);
		const isSelected = selectedRows.some(selected => rowKey(selected) === key);

		if (multiSelect) {
			if (isSelected) {
				selectedRows = selectedRows.filter(selected => rowKey(selected) !== key);
			} else {
				selectedRows = [...selectedRows, row];
			}
		} else {
			selectedRows = isSelected ? [] : [row];
		}
	}

	function handlePageChange(newPage: number) {
		currentPage = Math.max(1, Math.min(newPage, totalPages));
	}

	function handlePageSizeChange(newSize: string) {
		const size = parseInt(newSize);
		pageSize = size;
		currentPage = 1; // Reset to first page
	}

	function removeFilter(filterKey: string) {
		delete columnFilters[filterKey];
		columnFilters = { ...columnFilters };
	}

	function clearAllFilters() {
		searchTerm = '';
		columnFilters = {};
		filters = [];
	}

	function getCellValue(row: any, column: DataTableColumn) {
		const value = row[column.key];
		return column.format ? column.format(value) : value;
	}

	function isRowSelected(row: any) {
		return selectedRows.some(selected => rowKey(selected) === rowKey(row));
	}
</script>

<div class={cn('w-full space-y-4', className)} {...restProps}>
	<!-- Search and Controls -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 items-center space-x-2">
			{#if searchable}
				<div class="relative flex-1 max-w-sm">
					<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						bind:value={searchTerm}
						placeholder={searchPlaceholder}
						class="pl-9"
						data-testid="data-table-search"
					/>
				</div>
			{/if}

			{#if filterable}
				<Button
					variant="outline"
					size="sm"
					onclick={() => showFilters = !showFilters}
					data-testid="data-table-filter-toggle"
				>
					<Filter class="h-4 w-4" />
					Filters
					{#if Object.keys(columnFilters).length > 0 || filters.length > 0}
						<Badge variant="secondary" class="ml-1 px-1 text-xs">
							{Object.keys(columnFilters).length + filters.length}
						</Badge>
					{/if}
				</Button>
			{/if}
		</div>

		{#if paginated}
			<div class="flex items-center space-x-2">
				<span class="text-sm text-muted-foreground">Rows per page</span>
				<Select.Root value={pageSize.toString()} onSelectedChange={handlePageSizeChange}>
					<Select.Trigger class="w-16">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						{#each pageSizeOptions as option}
							<Select.Item value={option.toString()}>{option}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{/if}
	</div>

	<!-- Filters Panel -->
	{#if showFilters && filterable}
		<div class="rounded-lg border bg-muted/50 p-4" data-testid="data-table-filters">
			<div class="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
				{#each columns.filter(col => col.filterable !== false) as column}
					<div class="space-y-2">
						<label class="text-sm font-medium" for="filter-{column.key}">
							{column.label}
						</label>
						<div class="flex items-center space-x-2">
							<Input
								id="filter-{column.key}"
								bind:value={columnFilters[column.key]}
								placeholder="Filter {column.label.toLowerCase()}..."
								class="flex-1"
							/>
							{#if columnFilters[column.key]}
								<Button
									variant="ghost"
									size="icon"
									onclick={() => removeFilter(column.key)}
									class="h-8 w-8"
								>
									<X class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			{#if Object.keys(columnFilters).length > 0 || filters.length > 0}
				<div class="mt-4 flex justify-end">
					<Button variant="ghost" size="sm" onclick={clearAllFilters}>
						Clear all filters
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Table Container -->
	<div class="rounded-md border bg-background">
		<div class="relative overflow-auto" class:max-h-96={stickyHeader}>
			<table class="w-full caption-bottom text-sm">
				<!-- Header -->
				<thead class={cn('border-b', stickyHeader && 'sticky top-0 z-10 bg-background')}>
					<tr class="border-b transition-colors hover:bg-muted/50">
						{#if selectable}
							<th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">
								{#if multiSelect}
									<Checkbox
										checked={allSelected}
										indeterminate={someSelected && !allSelected}
										onCheckedChange={handleSelectAll}
										aria-label="Select all rows"
									/>
								{/if}
							</th>
						{/if}

						{#if showRowNumbers}
							<th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-16">
								#
							</th>
						{/if}

						{#each columns as column}
							<th
								class={cn(
									'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
									column.className,
									column.hideMobile && 'hidden sm:table-cell',
									column.sortable && 'cursor-pointer hover:text-foreground',
									column.align === 'center' && 'text-center',
									column.align === 'right' && 'text-right'
								)}
								style={column.width ? `width: ${column.width}` : undefined}
								onclick={() => column.sortable && handleSort(column.key)}
							>
								<div class="flex items-center space-x-2">
									<span>{column.label}</span>
									{#if column.sortable && sort?.key === column.key}
										{#if sort.direction === 'asc'}
											<ChevronUp class="h-4 w-4" />
										{:else}
											<ChevronDown class="h-4 w-4" />
										{/if}
									{/if}
								</div>
							</th>
						{/each}

						{#if actions.length > 0}
							<th class="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-16">
								Actions
							</th>
						{/if}
					</tr>
				</thead>

				<!-- Body -->
				<tbody>
					{#if loading}
						{#each Array.from({ length: pageSize }) as _, i}
							<tr class="border-b transition-colors">
								{#if selectable}
									<td class="p-4">
										<Skeleton class="h-4 w-4 rounded" />
									</td>
								{/if}
								{#if showRowNumbers}
									<td class="p-4">
										<Skeleton class="h-4 w-8" />
									</td>
								{/if}
								{#each columns as column}
									<td class={cn('p-4', column.hideMobile && 'hidden sm:table-cell')}>
										<Skeleton class="h-4 w-full" />
									</td>
								{/each}
								{#if actions.length > 0}
									<td class="p-4">
										<Skeleton class="h-8 w-8 rounded" />
									</td>
								{/if}
							</tr>
						{/each}
					{:else if paginatedData.length === 0}
						<tr>
							<td
								colspan={columns.length + (selectable ? 1 : 0) + (showRowNumbers ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
								class="h-24 text-center text-muted-foreground"
							>
								{emptyMessage}
							</td>
						</tr>
					{:else}
						{#each paginatedData as row, index}
							<tr
								class={cn(
									'border-b transition-colors',
									hoverable && 'hover:bg-muted/50',
									onRowClick && 'cursor-pointer',
									compact && 'h-10',
									isRowSelected(row) && 'bg-muted/50'
								)}
								onclick={() => onRowClick?.(row)}
								data-testid="data-table-row"
							>
								{#if selectable}
									<td class="p-4">
										<Checkbox
											checked={isRowSelected(row)}
											onCheckedChange={() => handleRowSelect(row)}
											aria-label="Select row"
										/>
									</td>
								{/if}

								{#if showRowNumbers}
									<td class="p-4 text-muted-foreground">
										{startItem + index}
									</td>
								{/if}

								{#each columns as column}
									<td
										class={cn(
											'p-4',
											column.className,
											column.hideMobile && 'hidden sm:table-cell',
											column.align === 'center' && 'text-center',
											column.align === 'right' && 'text-right'
										)}
									>
										{#if column.cellRenderer}
											{@render column.cellRenderer({ value: row[column.key], row, column })}
										{:else}
											<span class="truncate">
												{getCellValue(row, column) ?? '-'}
											</span>
										{/if}
									</td>
								{/each}

								{#if actions.length > 0}
									<td class="p-4">
										<DropdownMenu.Root>
											<DropdownMenu.Trigger asChild let:builder>
												<Button
													builders={[builder]}
													variant="ghost"
													size="icon"
													class="h-8 w-8"
													data-testid="data-table-row-actions"
												>
													<MoreHorizontal class="h-4 w-4" />
													<span class="sr-only">Open menu</span>
												</Button>
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="end">
												{#each actions as action}
													{#if action.show ? action.show(row) : true}
														<DropdownMenu.Item
															onclick={() => action.handler(row)}
															disabled={action.disabled ? action.disabled(row) : false}
															class={action.className}
														>
															{#if action.icon}
																<svelte:component this={action.icon} class="mr-2 h-4 w-4" />
															{/if}
															{action.label}
														</DropdownMenu.Item>
													{/if}
												{/each}
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</td>
								{/if}
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Pagination -->
	{#if paginated && !loading && paginatedData.length > 0}
		<div class="flex items-center justify-between px-2" data-testid="data-table-pagination">
			<div class="text-sm text-muted-foreground">
				Showing {startItem} to {endItem} of {totalItemsComputed} results
				{#if selectedRows.length > 0}
					({selectedRows.length} selected)
				{/if}
			</div>

			<div class="flex items-center space-x-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(1)}
					disabled={currentPage === 1}
					aria-label="Go to first page"
				>
					<ChevronsLeft class="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1}
					aria-label="Go to previous page"
				>
					<ChevronLeft class="h-4 w-4" />
				</Button>

				<div class="flex items-center space-x-1">
					<span class="text-sm text-muted-foreground">Page</span>
					<Input
						type="number"
						min="1"
						max={totalPages}
						bind:value={currentPage}
						class="w-16 text-center"
						aria-label="Current page"
					/>
					<span class="text-sm text-muted-foreground">of {totalPages}</span>
				</div>

				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					aria-label="Go to next page"
				>
					<ChevronRight class="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(totalPages)}
					disabled={currentPage === totalPages}
					aria-label="Go to last page"
				>
					<ChevronsRight class="h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}
</div>