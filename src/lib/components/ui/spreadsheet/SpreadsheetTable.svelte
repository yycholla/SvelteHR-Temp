<script lang="ts" generics="T">
	import { Check, X, Save, ArrowUp, ArrowDown, ArrowUpDown, X as XIcon, Filter } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ColumnVisibilityControl from './ColumnVisibilityControl.svelte';
	import BulkActionsToolbar from './BulkActionsToolbar.svelte';
	import ExportDropdown from './ExportDropdown.svelte';
	import type { SpreadsheetConfig, ColumnVisibility, RowEdit, ColumnSort, ColumnFilters, SortDirection } from './types';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Table configuration */
		config: SpreadsheetConfig<T>;

		/** Data rows */
		data: T[];

		/** Additional table classes */
		class?: string;

		/** Custom cell renderer snippet */
		customCell?: Snippet<[{ column: typeof config.columns[0]; row: T; value: unknown }]>;
	}

	const { config, data, class: className, customCell }: Props = $props();

	// Column visibility state
	let columnVisibility = $state<ColumnVisibility>(
		config.columns.reduce(
			(acc, col) => {
				acc[col.id] = col.visible !== false;
				return acc;
			},
			{} as ColumnVisibility
		)
	);

	// Sorting state
	let currentSort = $state<ColumnSort | null>(null);

	// Filtering state
	let columnFilters = $state<ColumnFilters>({});

	// Track which filter dropdown is open
	let openFilterDropdown = $state<string | null>(null);

	// Visible columns
	const visibleColumns = $derived(
		config.columns.filter((col) => columnVisibility[col.id] !== false)
	);

	// Filtered and sorted data
	const processedData = $derived.by(() => {
		let result = [...data];

		// Apply column filters
		if (config.enableFiltering) {
			Object.entries(columnFilters).forEach(([columnId, filterValue]) => {
				if (filterValue === null || filterValue === '' || filterValue === undefined) return;

				const column = config.columns.find((col) => col.id === columnId);
				if (!column) return;

				result = result.filter((row) => {
					const value = column.getValue(row);

					if (column.filterConfig?.type === 'select') {
						// For boolean values
						if (typeof filterValue === 'boolean') {
							return value === filterValue;
						}
						return String(value) === String(filterValue);
					}

					// Text filtering
					const valueStr = String(value).toLowerCase();
					const filterStr = String(filterValue).toLowerCase();
					return valueStr.includes(filterStr);
				});
			});
		}

		// Apply sorting
		if (config.enableSorting && currentSort && currentSort.direction) {
			const sortColumn = currentSort;  // Store in const to satisfy TypeScript
			const column = config.columns.find((col) => col.id === sortColumn.columnId);
			if (column) {
				result.sort((a, b) => {
					const aVal = column.getSortValue ? column.getSortValue(a) : column.getValue(a);
					const bVal = column.getSortValue ? column.getSortValue(b) : column.getValue(b);

					// Handle different types
					const aComp = aVal as string | number | Date;
					const bComp = bVal as string | number | Date;

					let comparison = 0;
					if (aComp < bComp) comparison = -1;
					if (aComp > bComp) comparison = 1;

					return sortColumn.direction === 'asc' ? comparison : -comparison;
				});
			}
		}

		return result;
	});

	// Edit state
	let editingCell = $state<{ rowId: string; columnId: string } | null>(null);
	let pendingEdits = $state<Map<string, RowEdit<T>>>(new Map());
	let editValues = $state<Record<string, unknown>>({});

	// Selection state
	let selectedRows = $state<Set<string>>(new Set());

	// Get selected row data
	const selectedRowData = $derived(
		processedData.filter(row => selectedRows.has(config.getRowId(row)))
	);

	// Check if all visible rows are selected
	const allSelected = $derived(
		processedData.length > 0 && processedData.every(row => selectedRows.has(config.getRowId(row)))
	);

	// Check if some (but not all) rows are selected
	const someSelected = $derived(
		processedData.some(row => selectedRows.has(config.getRowId(row))) && !allSelected
	);

	// Check if a cell is being edited
	function isEditing(rowId: string, columnId: string): boolean {
		return editingCell?.rowId === rowId && editingCell?.columnId === columnId;
	}

	// Start editing a cell
	function startEdit(row: T, columnId: string) {
		const rowId = config.getRowId(row);
		const column = config.columns.find((col) => col.id === columnId);
		if (!column?.editable) return;

		editingCell = { rowId, columnId };
		const currentValue = column.getEditValue ? column.getEditValue(row) : column.getValue(row);
		editValues[`${rowId}-${columnId}`] = currentValue;
	}

	// Cancel editing
	function cancelEdit() {
		if (editingCell) {
			const key = `${editingCell.rowId}-${editingCell.columnId}`;
			delete editValues[key];
		}
		editingCell = null;
	}

	// Save cell edit
	async function saveEdit(row: T) {
		if (!editingCell) return;

		const { rowId, columnId } = editingCell;
		const column = config.columns.find((col) => col.id === columnId);
		if (!column?.field) {
			cancelEdit();
			return;
		}

		const key = `${rowId}-${columnId}`;
		const newValue = editValues[key];
		const editKey = `${rowId}-${column.field}`;

		// Store the edit
		pendingEdits.set(editKey, {
			rowId,
			field: column.field,
			value: newValue,
			originalRow: row
		});

		// Trigger onEdit callback if provided
		if (config.onEdit) {
			config.onEdit(Array.from(pendingEdits.values()));
		}

		editingCell = null;

		// Auto-save immediately if onSave is provided
		if (config.onSave) {
			await saveAllEdits();
		}
	}

	// Save all edits
	async function saveAllEdits() {
		if (config.onSave && pendingEdits.size > 0) {
			await config.onSave(Array.from(pendingEdits.values()));
			pendingEdits.clear();
		}
	}

	// Column visibility controls
	function toggleColumn(columnId: string) {
		columnVisibility[columnId] = !columnVisibility[columnId];
	}

	function showAllColumns() {
		config.columns.forEach((col) => {
			if (col.hideable !== false) {
				columnVisibility[col.id] = true;
			}
		});
	}

	function hideAllColumns() {
		config.columns.forEach((col) => {
			if (col.hideable !== false) {
				columnVisibility[col.id] = false;
			}
		});
	}

	// Render cell value
	function renderCell(column: typeof config.columns[0], row: T): string {
		const value = column.getValue(row);
		if (column.render) {
			return column.render(value, row);
		}
		if (value === null || value === undefined) {
			return '—';
		}
		return String(value);
	}

	// Handle keyboard navigation in edit mode
	function handleKeydown(event: KeyboardEvent, row: T) {
		if (event.key === 'Enter') {
			saveEdit(row);
		} else if (event.key === 'Escape') {
			cancelEdit();
		}
	}

	// Sorting handlers
	function toggleSort(columnId: string) {
		if (!config.enableSorting) return;

		const column = config.columns.find((col) => col.id === columnId);
		if (!column?.sortable) return;

		if (!currentSort || currentSort.columnId !== columnId) {
			currentSort = { columnId, direction: 'asc' };
		} else if (currentSort.direction === 'asc') {
			currentSort = { columnId, direction: 'desc' };
		} else {
			currentSort = null;
		}
	}

	function getSortIcon(columnId: string) {
		if (!currentSort || currentSort.columnId !== columnId) {
			return ArrowUpDown;
		}
		return currentSort.direction === 'asc' ? ArrowUp : ArrowDown;
	}

	function getSortState(columnId: string): SortDirection {
		if (currentSort?.columnId === columnId) {
			return currentSort.direction;
		}
		return null;
	}

	// Filter handlers
	function updateFilter(columnId: string, value: string | number | boolean | null) {
		columnFilters[columnId] = value;
	}

	function clearFilter(columnId: string) {
		delete columnFilters[columnId];
	}

	function clearAllFilters() {
		columnFilters = {};
	}

	function hasActiveFilter(columnId: string): boolean {
		const value = columnFilters[columnId];
		return value !== null && value !== '' && value !== undefined;
	}

	function getActiveFilterCount(): number {
		return Object.values(columnFilters).filter(v => v !== null && v !== '' && v !== undefined).length;
	}

	// Selection handlers
	function toggleRowSelection(rowId: string) {
		if (!config.enableRowSelection) return;

		const newSelected = new Set(selectedRows);
		if (newSelected.has(rowId)) {
			newSelected.delete(rowId);
		} else {
			// For single selection mode, clear previous selection
			if (config.selectionMode === 'single') {
				newSelected.clear();
			}
			newSelected.add(rowId);
		}
		selectedRows = newSelected;

		// Notify callback
		if (config.onSelectionChange) {
			config.onSelectionChange(selectedRows);
		}
	}

	function toggleSelectAll() {
		if (!config.enableRowSelection) return;

		if (allSelected) {
			// Deselect all
			selectedRows = new Set();
		} else {
			// Select all visible rows
			selectedRows = new Set(processedData.map(row => config.getRowId(row)));
		}

		// Notify callback
		if (config.onSelectionChange) {
			config.onSelectionChange(selectedRows);
		}
	}

	function deselectAll() {
		selectedRows = new Set();
		if (config.onSelectionChange) {
			config.onSelectionChange(selectedRows);
		}
	}
</script>

<div class="flex flex-col h-full overflow-hidden {className}">
	<!-- Bulk Actions Toolbar -->
	{#if config.enableRowSelection && selectedRows.size > 0}
		<BulkActionsToolbar
			selectedCount={selectedRows.size}
			selectedIds={selectedRows}
			selectedRows={selectedRowData}
			bulkActions={config.bulkActions}
			onDeselectAll={deselectAll}
		/>
	{/if}

	<!-- Controls -->
	{#if config.showColumnControls || config.exportConfig?.enabled || (config.showSaveButton && pendingEdits.size > 0)}
		<div class="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b bg-muted/20">
			<div class="flex items-center gap-2">
				{#if config.showColumnControls}
					<ColumnVisibilityControl
						columns={config.columns}
						{columnVisibility}
						onToggle={toggleColumn}
						onShowAll={showAllColumns}
						onHideAll={hideAllColumns}
					/>
				{/if}
				{#if config.exportConfig?.enabled}
					<ExportDropdown
						data={processedData}
						columns={config.columns}
						filename={config.exportConfig.filename}
						formats={config.exportConfig.formats}
						includeHiddenColumns={config.exportConfig.includeHiddenColumns}
					/>
				{/if}
				{#if config.enableFiltering && getActiveFilterCount() > 0}
					<Button
						onclick={clearAllFilters}
						variant="outline"
						size="sm"
						class="gap-1.5 h-7 text-xs"
					>
						<XIcon class="h-3.5 w-3.5" />
						Clear Filters ({getActiveFilterCount()})
					</Button>
				{/if}
			</div>

			{#if config.showSaveButton && pendingEdits.size > 0}
				<div class="flex items-center gap-2">
					<span class="text-xs text-muted-foreground">
						{pendingEdits.size} unsaved {pendingEdits.size === 1 ? 'change' : 'changes'}
					</span>
					<Button
						onclick={saveAllEdits}
						disabled={config.loading}
						size="sm"
						class="gap-1.5 h-7 text-xs"
					>
						<Save class="h-3.5 w-3.5" />
						Save Changes
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Table -->
	<div class="flex-1 overflow-auto min-h-0 relative bg-background">
		<table class="w-full text-sm text-left border-collapse">
			<thead class="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b">
				<!-- Header Row -->
				<tr>
					{#if config.enableRowSelection}
						<th class="px-3 py-2 border-r w-10">
							<input
								type="checkbox"
								checked={allSelected}
								indeterminate={someSelected}
								onchange={toggleSelectAll}
								class="h-4 w-4 rounded border-gray-300 cursor-pointer"
								title={allSelected ? 'Deselect all' : 'Select all'}
							/>
						</th>
					{/if}
					{#each visibleColumns as column (column.id)}
						{@const SortIcon = getSortIcon(column.id)}
						{@const sortState = getSortState(column.id)}
						{@const hasFilter = hasActiveFilter(column.id)}
						<th
							class="px-3 py-2 border-r last:border-r-0 {column.width || ''} {column.headerClass || ''}"
							class:text-right={column.align === 'right'}
							class:text-center={column.align === 'center'}
						>
							<div class="flex items-center gap-1 justify-between">
								<span class="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
									{column.label}
								</span>
								<div class="flex items-center gap-0.5 ml-auto">
									{#if config.enableSorting && column.sortable}
										<button
											onclick={() => toggleSort(column.id)}
											class="p-0.5 rounded hover:bg-muted transition-colors"
											class:text-primary={sortState}
											title="Sort by {column.label}"
										>
											<SortIcon class="h-3.5 w-3.5" />
										</button>
									{/if}
									{#if config.enableFiltering && column.filterable}
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												{#snippet child({ props })}
													<button
														{...props}
														class="p-0.5 rounded hover:bg-muted transition-colors"
														class:text-primary={hasFilter}
														title="Filter {column.label}"
													>
														<Filter class="h-3.5 w-3.5" />
													</button>
												{/snippet}
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="start" class="w-64">
												<DropdownMenu.Label class="flex items-center justify-between">
													<span>Filter: {column.label}</span>
													{#if hasFilter}
														<button
															onclick={() => clearFilter(column.id)}
															class="text-xs text-muted-foreground hover:text-foreground underline"
														>
															Clear
														</button>
													{/if}
												</DropdownMenu.Label>
												<DropdownMenu.Separator />
												<div class="p-2">
													{#if column.filterConfig?.type === 'select' && column.filterConfig.options}
														<div class="space-y-1">
															{#each column.filterConfig.options as option}
																<label class="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer">
																	<input
																		type="radio"
																		name="filter-{column.id}"
																		value={option.value}
																		checked={columnFilters[column.id] === option.value}
																		onchange={() => updateFilter(column.id, option.value)}
																		class="h-3.5 w-3.5"
																	/>
																	<span class="text-sm">{option.label}</span>
																</label>
															{/each}
															<label class="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer">
																<input
																	type="radio"
																	name="filter-{column.id}"
																	checked={!columnFilters[column.id]}
																	onchange={() => clearFilter(column.id)}
																	class="h-3.5 w-3.5"
																/>
																<span class="text-sm text-muted-foreground">Show All</span>
															</label>
														</div>
													{:else}
														<input
															type="text"
															placeholder={column.filterConfig?.placeholder || `Filter by ${column.label}...`}
															value={columnFilters[column.id] || ''}
															oninput={(e) => updateFilter(column.id, (e.target as HTMLInputElement).value)}
															class="w-full h-8 rounded border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none transition-colors"
														/>
													{/if}
												</div>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									{/if}
								</div>
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y">
				{#each processedData as row (config.getRowId(row))}
					{@const rowId = config.getRowId(row)}
					{@const isSelected = selectedRows.has(rowId)}
					<tr class="hover:bg-muted/30 group {isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}">
						{#if config.enableRowSelection}
							<td class="px-3 py-1.5 border-r">
								<input
									type="checkbox"
									checked={isSelected}
									onchange={() => toggleRowSelection(rowId)}
									class="h-4 w-4 rounded border-gray-300 cursor-pointer"
								/>
							</td>
						{/if}
						{#each visibleColumns as column (column.id)}
							{@const editing = isEditing(rowId, column.id)}
							{@const value = column.getValue(row)}
							{@const displayValue = renderCell(column, row)}
							{@const editKey = `${rowId}-${column.id}`}
							{@const hasEdit = column.field && pendingEdits.has(`${rowId}-${column.field}`)}

							<td
								class="px-3 py-1.5 border-r last:border-r-0 {column.cellClass || ''} {hasEdit ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}"
								class:truncate={column.truncate}
								class:align-top={!editing}
								class:text-right={column.align === 'right'}
								class:text-center={column.align === 'center'}
								class:max-w-[200px]={column.truncate && !column.maxWidth}
								style={column.maxWidth && column.truncate ? `max-width: ${column.maxWidth}` : ''}
							>
								{#if editing}
									<!-- Inline Edit Mode -->
									<div class="flex items-center gap-1">
										{#if column.type === 'select' && column.options}
											<select
												bind:value={editValues[editKey]}
												onkeydown={(e) => handleKeydown(e, row)}
												class="flex-1 h-7 rounded border border-primary bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
											>
												{#each column.options as option (option.value)}
													<option value={option.value}>{option.label}</option>
												{/each}
											</select>
										{:else if column.type === 'number'}
											<input
												type="number"
												bind:value={editValues[editKey]}
												onkeydown={(e) => handleKeydown(e, row)}
												class="flex-1 h-7 rounded border border-primary bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
											/>
										{:else}
											<input
												type="text"
												bind:value={editValues[editKey]}
												onkeydown={(e) => handleKeydown(e, row)}
												class="flex-1 h-7 rounded border border-primary bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
											/>
										{/if}
										<button
											onclick={() => saveEdit(row)}
											class="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
											title="Save"
										>
											<Check class="h-3.5 w-3.5" />
										</button>
										<button
											onclick={cancelEdit}
											class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
											title="Cancel"
										>
											<X class="h-3.5 w-3.5" />
										</button>
									</div>
								{:else}
									<!-- Display Mode -->
									{#if customCell && column.type === 'custom'}
										<!-- Use custom cell snippet for custom columns -->
										{@render customCell({ column, row, value })}
									{:else}
										<div
											class="cursor-pointer"
											class:hover:bg-muted={column.editable && config.editMode === 'inline'}
											ondblclick={() =>
												config.editMode === 'inline' && column.editable && startEdit(row, column.id)}
											role="button"
											tabindex={column.editable && config.editMode === 'inline' ? 0 : -1}
										>
											{#if column.type === 'badge'}
												<Badge variant="outline" class="font-normal text-[10px] h-5">
													{displayValue}
												</Badge>
											{:else}
												{displayValue}
											{/if}
										</div>
									{/if}
								{/if}
							</td>
						{/each}
					</tr>
				{:else}
					<tr>
						<td colspan={visibleColumns.length + (config.enableRowSelection ? 1 : 0)} class="px-4 py-12 text-center text-muted-foreground text-xs">
							{#if Object.keys(columnFilters).length > 0}
								No results match your filters. <button onclick={clearAllFilters} class="underline hover:text-foreground">Clear filters</button>
							{:else}
								{config.emptyMessage || 'No data available'}
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
