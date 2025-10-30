<script lang="ts">
	import {
		DataTable,
		Toolbar,
		ToolbarContent,
		ToolbarSearch,
		ToolbarMenu,
		ToolbarMenuItem,
		Pagination,
		DataTableSkeleton,
		Button,
		Tag
	} from 'carbon-components-svelte';
	import { Search, FilterEdit, Download, Add } from 'carbon-icons-svelte';

	// Import contract types
	import type {
		CarbonColumn,
		BatchAction,
		ToolbarAction
	} from '../../../contracts/component-interface';

	// Props
	let {
		data = [],
		columns = [],
		loading = false,
		selectable = false,
		sortable = true,
		filterable = true,
		searchable = true,
		paginated = true,
		pageSize = $bindable(10),
		pageSizes = [10, 25, 50, 100],
		title = '',
		description = '',
		emptyStateTitle = 'No data',
		emptyStateDescription = 'No data to display',
		batchActions = [],
		toolbarActions = [],
		exportable = false,
		selectedRowIds = $bindable([]),
		accessibility = {
			tableLabel: 'Data table',
			sortAnnouncements: true,
			selectionAnnouncements: true,
			paginationAnnouncements: true
		},
		onRowClick = undefined,
		onSelectionChange = undefined,
		onBatchAction = undefined,
		onToolbarAction = undefined,
		onExport = undefined
	}: {
		data?: any[];
		columns?: CarbonColumn[];
		loading?: boolean;
		selectable?: boolean;
		sortable?: boolean;
		filterable?: boolean;
		searchable?: boolean;
		paginated?: boolean;
		pageSize?: number;
		pageSizes?: number[];
		title?: string;
		description?: string;
		emptyStateTitle?: string;
		emptyStateDescription?: string;
		batchActions?: BatchAction[];
		toolbarActions?: ToolbarAction[];
		exportable?: boolean;
		selectedRowIds?: any[];
		accessibility?: {
			tableLabel: string;
			sortAnnouncements: boolean;
			selectionAnnouncements: boolean;
			paginationAnnouncements: boolean;
		};
		onRowClick?: ((row: any) => void) | undefined;
		onSelectionChange?: ((selectedRows: any[]) => void) | undefined;
		onBatchAction?: ((action: string, selectedRows: any[]) => void) | undefined;
		onToolbarAction?: ((action: string) => void) | undefined;
		onExport?: ((data: any[]) => void) | undefined;
	} = $props();

	// Pure Carbon data handling
	let currentPage = $state(1);
	let searchValue = $state('');
	let sortKey = $state('');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	// Filter and search logic
	let filteredData = $derived(
		data.filter((row) => {
			if (!searchValue) return true;
			return Object.values(row).some((value) =>
				String(value).toLowerCase().includes(searchValue.toLowerCase())
			);
		})
	);

	// Sort logic
	let sortedData = $derived(
		sortKey
			? [...filteredData].sort((a, b) => {
					const aVal = a[sortKey];
					const bVal = b[sortKey];

					if (aVal === bVal) return 0;

					const comparison = aVal < bVal ? -1 : 1;
					return sortDirection === 'asc' ? comparison : -comparison;
				})
			: filteredData
	);

	// Pagination logic
	let totalItems = $derived(sortedData.length);
	let totalPages = $derived(Math.ceil(totalItems / pageSize));
	let startIndex = $derived((currentPage - 1) * pageSize);
	let endIndex = $derived(Math.min(startIndex + pageSize, totalItems));
	let paginatedData = $derived(sortedData.slice(startIndex, endIndex));

	// Carbon table headers
	let headers = $derived(
		columns.map((col) => ({
			key: col.key,
			value: col.label,
			sort: col.sortable !== false,
			columnMenu: false,
			width: col.width,
			...col.carbonProps
		}))
	);

	// Carbon table rows
	let carbonRows = $derived(
		paginatedData.map((row, index) => ({
			id: row.id || (startIndex + index).toString(),
			...row
		}))
	);

	// Accessibility helper functions
	function announceToScreenReader(message: string) {
		if (!accessibility.sortAnnouncements) return;

		// Create a temporary live region for announcements
		const announcement = document.createElement('div');
		announcement.setAttribute('aria-live', 'polite');
		announcement.setAttribute('aria-atomic', 'true');
		announcement.className = 'sr-only';
		announcement.textContent = message;

		document.body.appendChild(announcement);

		setTimeout(() => {
			document.body.removeChild(announcement);
		}, 1000);
	}

	// Enhanced event handlers
	function handleRowClick(row: any) {
		onRowClick?.(row);
	}

	function handleSelect(selectedRows: any[]) {
		selectedRowIds = selectedRows.map((row) => row.id);
		onSelectionChange?.(selectedRows);

		if (accessibility.selectionAnnouncements) {
			const count = selectedRows.length;
			const total = carbonRows.length;
			announceToScreenReader(`${count} of ${total} rows selected`);
		}
	}

	function handleBatchAction(actionKey: string) {
		const selectedRows = carbonRows.filter((row) => selectedRowIds.includes(row.id));
		onBatchAction?.(actionKey, selectedRows);
	}

	function handleToolbarAction(actionKey: string) {
		onToolbarAction?.(actionKey);
	}

	function handleExport() {
		const exportData = carbonRows;
		onExport?.(exportData);
	}

	function handleSearch(event: CustomEvent) {
		searchValue = event.detail;
		currentPage = 1; // Reset to first page when searching
	}

	function handleSort(key: string) {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
		currentPage = 1; // Reset to first page when sorting
	}

	function formatCellValue(column: CarbonColumn, value: any, row: any): string {
		if (column.format) {
			return column.format(value, row);
		}

		switch (column.type) {
			case 'date':
				return value ? new Date(value).toLocaleDateString() : '';
			case 'boolean':
				return value ? 'Yes' : 'No';
			case 'number':
				return typeof value === 'number' ? value.toLocaleString() : value?.toString() || '';
			default:
				return value?.toString() || '';
		}
	}

	function getTagVariant(column: CarbonColumn, value: any, row: any) {
		if (column.tagVariant) {
			return column.tagVariant(value, row);
		}
		return 'blue';
	}

	// Clear search function
	function clearSearch() {
		searchValue = '';
		currentPage = 1;
	}
</script>

<div
	class="carbon-data-table-wrapper"
	role="region"
	aria-label={accessibility.tableLabel}
	data-testid="carbon-data-table"
>
	{#if loading}
		<DataTableSkeleton
			{headers}
			rows={5}
			showHeader={!!title}
			showToolbar={searchable || toolbarActions.length > 0}
		/>
	{:else}
		<DataTable
			{headers}
			rows={carbonRows}
			{title}
			{description}
			{sortable}
			{selectable}
			{selectedRowIds}
			on:click:row={({ detail }) => handleRowClick(detail)}
			on:update={(e) =>
				handleSelect(
					e.detail.selectedRowIds
						.map((id) => carbonRows.find((row) => row.id === id))
						.filter(Boolean)
				)}
		>
			<Toolbar>
				<ToolbarContent>
					{#if searchable}
						<ToolbarSearch
							placeholder="Search table..."
							bind:value={searchValue}
							on:clear={clearSearch}
						/>
					{/if}

					{#if toolbarActions.length > 0}
						{#each toolbarActions as action (action.key)}
							<Button
								kind="ghost"
								icon={action.icon || Add}
								iconDescription={action.label}
								tooltipAlignment="end"
								on:click={() => handleToolbarAction(action.key)}
							>
								{action.label}
							</Button>
						{/each}
					{/if}

					{#if exportable}
						<Button
							kind="ghost"
							icon={Download}
							iconDescription="Export data"
							tooltipAlignment="end"
							on:click={handleExport}
						>
							Export
						</Button>
					{/if}

					{#if batchActions.length > 0 && selectedRowIds.length > 0}
						<ToolbarMenu>
							{#each batchActions as action (action.key)}
								<ToolbarMenuItem primaryFocus on:click={() => handleBatchAction(action.key)}>
									{action.label}
								</ToolbarMenuItem>
							{/each}
						</ToolbarMenu>
					{/if}
				</ToolbarContent>
			</Toolbar>

			<!-- Pure Carbon DataTable -->
			<div class="bx--data-table-container">
				<table class="bx--data-table">
					<thead>
						<tr>
							{#if selectable}
								<th class="bx--table-column-checkbox">
									<!-- Carbon handles this automatically -->
								</th>
							{/if}
							{#each columns as column (column.key)}
								<th
									class="bx--table-header-cell"
									class:bx--table-sort={sortable && column.sortable !== false}
									class:bx--table-sort--active={sortKey === column.key}
									class:bx--table-sort--ascending={sortKey === column.key &&
										sortDirection === 'asc'}
									class:bx--table-sort--descending={sortKey === column.key &&
										sortDirection === 'desc'}
									style={column.width ? `width: ${column.width}` : ''}
								>
									{#if sortable && column.sortable !== false}
										<button
											class="bx--table-sort__flex"
											onclick={() => handleSort(column.key)}
											aria-label="Sort by {column.label}"
										>
											<span class="bx--table-header-label">{column.label}</span>
											<svg class="bx--table-sort__icon" width="16" height="16" viewBox="0 0 16 16">
												<path
													d="M12.3 9.3L8.5 13.1c-.1.1-.4.1-.5 0L4.2 9.3c-.2-.2-.2-.5 0-.7s.5-.2.7 0L8 11.6l3.1-3.1c.2-.2.5-.2.7 0s.2.6 0 .8z"
												/>
												<path
													d="M4.2 6.7l3.8-3.8c.1-.1.4-.1.5 0l3.8 3.8c.2.2.2.5 0 .7s-.5.2-.7 0L8 4.4 4.9 7.5c-.2.2-.5.2-.7 0s-.2-.6 0-.8z"
												/>
											</svg>
										</button>
									{:else}
										<span class="bx--table-header-label">{column.label}</span>
									{/if}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each carbonRows as row (row.id)}
							<tr
								class="bx--table-row"
								class:bx--table-row--selected={selectedRowIds.includes(row.id)}
								onclick={() => handleRowClick(row)}
							>
								{#if selectable}
									<td class="bx--table-column-checkbox">
										<input
											type="checkbox"
											class="bx--checkbox"
											checked={selectedRowIds.includes(row.id)}
											onchange={(e) => {
												if (e.target.checked) {
													selectedRowIds = [...selectedRowIds, row.id];
												} else {
													selectedRowIds = selectedRowIds.filter((id) => id !== row.id);
												}
												handleSelect(carbonRows.filter((r) => selectedRowIds.includes(r.id)));
											}}
										/>
									</td>
								{/if}
								{#each columns as column (column.key)}
									<td
										class="bx--table-cell carbon-table-cell"
										class:text-center={column.align === 'center'}
										class:text-right={column.align === 'right'}
									>
										{#if column.type === 'tag'}
											<Tag type={getTagVariant(column, row[column.key], row)} size="sm">
												{formatCellValue(column, row[column.key], row)}
											</Tag>
										{:else if column.component}
											{@const Component = column.component}
											<Component value={row[column.key]} {row} {column} />
										{:else}
											<span class="carbon-cell-content">
												{formatCellValue(column, row[column.key], row)}
											</span>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
						{#if carbonRows.length === 0}
							<tr>
								<td
									colspan={columns.length + (selectable ? 1 : 0)}
									class="bx--table-cell carbon-empty-state"
								>
									<div class="carbon-empty-state-content">
										<h3>{emptyStateTitle}</h3>
										<p>{emptyStateDescription}</p>
									</div>
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>

			{#if paginated}
				<Pagination
					bind:pageSize
					{pageSizes}
					{totalItems}
					pageSizeInputDisabled={false}
					forwardText="Next page"
					backwardText="Previous page"
					itemsPerPageText="Items per page:"
					itemRangeText={(min, max, total) => `${min}–${max} of ${total} items`}
					pageInputDisabled={false}
					pageText="Page"
					page={currentPage}
					on:update={(e) => {
						const { detail } = e;
						if (detail.pageSize !== pageSize) {
							pageSize = detail.pageSize;
							currentPage = 1; // Reset to first page when changing page size
						}
						if (detail.page !== currentPage) {
							currentPage = detail.page;
						}

						// Announce pagination changes
						if (accessibility.paginationAnnouncements) {
							const currentRows = carbonRows.length;
							const total = totalItems;
							announceToScreenReader(`Page changed. Showing ${currentRows} of ${total} items`);
						}
					}}
				/>
			{/if}
		</DataTable>
	{/if}
</div>

<style>
	.carbon-data-table-wrapper {
		width: 100%;
	}

	.carbon-table-cell {
		padding: var(--cds-spacing-04) var(--cds-spacing-05);
		font-size: var(--cds-body-short-01-font-size);
		line-height: var(--cds-body-short-01-line-height);
	}

	.carbon-cell-content {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.text-center {
		text-align: center;
	}

	.text-right {
		text-align: right;
	}

	/* Ensure proper Carbon styling integration */
	:global(.bx--data-table) {
		width: 100%;
		font-size: var(--cds-body-short-01-font-size);
	}

	:global(.bx--data-table td) {
		border-bottom: 1px solid var(--cds-border-subtle-01);
		padding: var(--cds-spacing-04) var(--cds-spacing-05);
	}

	:global(.bx--data-table th) {
		border-bottom: 1px solid var(--cds-border-strong-01);
		padding: var(--cds-spacing-04) var(--cds-spacing-05);
		font-size: var(--cds-body-short-02-font-size);
		font-weight: var(--cds-body-short-02-font-weight);
	}

	/* Improve toolbar spacing */
	:global(.bx--toolbar) {
		padding: var(--cds-spacing-04) var(--cds-spacing-05);
		background: var(--cds-layer-01);
		border-bottom: 1px solid var(--cds-border-subtle-01);
	}

	:global(.bx--toolbar-content) {
		gap: var(--cds-spacing-04);
	}

	:global(.bx--toolbar-search-container-expandable) {
		min-width: 240px;
	}

	/* Pagination improvements */
	:global(.bx--pagination) {
		border-top: 1px solid var(--cds-border-subtle-01);
		background: var(--cds-layer-01);
		padding: var(--cds-spacing-04) var(--cds-spacing-05);
	}

	/* Tag improvements within tables */
	:global(.bx--data-table .bx--tag) {
		font-size: var(--cds-helper-text-01-font-size);
		padding: var(--cds-spacing-02) var(--cds-spacing-03);
	}

	/* Table hover states */
	:global(.bx--data-table tbody tr:hover td) {
		background: var(--cds-layer-hover-01);
	}

	/* Selected row styling */
	:global(.bx--data-table tbody tr.bx--data-table--selected td) {
		background: var(--cds-layer-selected-01);
		border-color: var(--cds-border-interactive);
	}

	/* Empty state styling */
	:global(.bx--data-table--empty-state) {
		padding: var(--cds-spacing-09);
		text-align: center;
		color: var(--cds-text-secondary);
	}

	/* Screen reader only content */
	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		:global(.bx--data-table th) {
			border-bottom: 2px solid var(--cds-border-strong);
		}

		:global(.bx--data-table td) {
			border-bottom: 1px solid var(--cds-border-strong);
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		:global(.bx--data-table tbody tr) {
			transition: none;
		}
	}

	/* Enhanced Carbon DataTable styling */
	:global(.bx--data-table-container) {
		overflow-x: auto;
	}

	:global(.bx--table-header-cell) {
		position: relative;
		vertical-align: top;
		border-bottom: 1px solid var(--cds-border-strong-01);
	}

	:global(.bx--table-sort__flex) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: var(--cds-spacing-04) var(--cds-spacing-05);
		background: none;
		border: none;
		cursor: pointer;
		font-size: var(--cds-body-short-02-font-size);
		font-weight: var(--cds-body-short-02-font-weight);
	}

	:global(.bx--table-sort__flex:hover) {
		background: var(--cds-layer-hover-01);
	}

	:global(.bx--table-sort__icon) {
		fill: var(--cds-icon-secondary);
		margin-left: var(--cds-spacing-03);
		transition: transform 150ms ease;
	}

	:global(.bx--table-sort--ascending .bx--table-sort__icon) {
		transform: rotate(180deg);
	}

	:global(.bx--table-sort--active .bx--table-sort__icon) {
		fill: var(--cds-icon-primary);
	}

	:global(.bx--table-row) {
		cursor: pointer;
		transition: background-color 150ms ease;
	}

	:global(.bx--table-row:hover) {
		background: var(--cds-layer-hover-01);
	}

	:global(.bx--table-row--selected) {
		background: var(--cds-layer-selected-01);
	}

	:global(.bx--table-row--selected:hover) {
		background: var(--cds-layer-selected-hover-01);
	}

	/* Enhanced empty state styling */
	.carbon-empty-state {
		text-align: center;
		padding: var(--cds-spacing-09) var(--cds-spacing-05);
	}

	.carbon-empty-state-content h3 {
		font-size: var(--cds-productive-heading-03-font-size);
		font-weight: var(--cds-productive-heading-03-font-weight);
		line-height: var(--cds-productive-heading-03-line-height);
		color: var(--cds-text-primary);
		margin-bottom: var(--cds-spacing-03);
	}

	.carbon-empty-state-content p {
		font-size: var(--cds-body-short-01-font-size);
		line-height: var(--cds-body-short-01-line-height);
		color: var(--cds-text-secondary);
		margin: 0;
	}

	/* Focus improvements for accessibility */
	:global(.bx--data-table th:focus),
	:global(.bx--data-table td:focus),
	:global(.bx--data-table tr:focus),
	:global(.bx--table-sort__flex:focus) {
		outline: 2px solid var(--cds-focus);
		outline-offset: 2px;
	}
</style>
