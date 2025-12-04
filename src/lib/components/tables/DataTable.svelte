<script lang="ts">
	import Button from '../base/Button.svelte';
	import Badge from '../base/Badge.svelte';

	// Generic type for table data
	type TableData = Record<string, any>;

	// Column definition interface
	export interface Column {
		key: string;
		label: string;
		sortable?: boolean;
		width?: string;
		align?: 'left' | 'center' | 'right';
		type?: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'custom';
		format?: (value: any, row: TableData) => string;
		component?: any; // Svelte component for custom rendering
		badgeVariant?: (value: any, row: TableData) => string;
	}

	// Props
	let {
		data = [],
		columns = [],
		loading = false,
		selectable = false,
		sortable = true,
		hoverable = true,
		striped = false,
		compact = false,
		emptyMessage = 'No data available',
		loadingMessage = 'Loading...',
		currentSort = null,
		selectedRows = $bindable([]),
		onsort = undefined,
		onrowClick = undefined,
		onselectionChange = undefined
	}: {
		data?: TableData[];
		columns?: Column[];
		loading?: boolean;
		selectable?: boolean;
		sortable?: boolean;
		hoverable?: boolean;
		striped?: boolean;
		compact?: boolean;
		emptyMessage?: string;
		loadingMessage?: string;
		currentSort?: { key: string; direction: 'asc' | 'desc' } | null;
		selectedRows?: any[];
		onsort?: ((detail: { key: string; direction: 'asc' | 'desc' }) => void) | undefined;
		onrowClick?: ((detail: { row: TableData; index: number }) => void) | undefined;
		onselectionChange?: ((detail: any[]) => void) | undefined;
	} = $props();

	// Computed selection states
	let allSelected = $derived(data.length > 0 && selectedRows.length === data.length);
	let someSelected = $derived(selectedRows.length > 0 && selectedRows.length < data.length);

	// Computed classes
	let tableClasses = $derived(
		[
			'data-table',
			hoverable && 'data-table--hoverable',
			striped && 'data-table--striped',
			compact && 'data-table--compact'
		]
			.filter(Boolean)
			.join(' ')
	);

	// Event handlers
	function handleSort(column: Column) {
		if (!sortable || !column.sortable) return;

		let direction: 'asc' | 'desc' = 'asc';

		if (currentSort?.key === column.key) {
			direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
		}

		onsort?.({ key: column.key, direction });
	}

	function handleRowClick(row: TableData, index: number) {
		onrowClick?.({ row, index });
	}

	function handleSelectAll(checked: boolean) {
		if (checked) {
			selectedRows = [...data];
		} else {
			selectedRows = [];
		}
		onselectionChange?.(selectedRows);
	}

	function handleRowSelect(row: TableData, checked: boolean) {
		if (checked) {
			selectedRows = [...selectedRows, row];
		} else {
			selectedRows = selectedRows.filter((r) => r !== row);
		}
		onselectionChange?.(selectedRows);
	}

	function isRowSelected(row: TableData): boolean {
		return selectedRows.includes(row);
	}

	function formatCellValue(column: Column, value: any, row: TableData): string {
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

	function getBadgeVariant(
		column: Column,
		value: any,
		row: TableData
	): 'info' | 'success' | 'warning' | 'light' | 'dark' | 'primary' | 'secondary' | 'danger' {
		if (column.badgeVariant) {
			return column.badgeVariant(value, row) as any;
		}
		return 'secondary';
	}

	function getSortIcon(column: Column): string {
		if (!sortable || !column.sortable) return '';

		if (currentSort?.key === column.key) {
			return currentSort.direction === 'asc' ? 'chevron-up' : 'chevron-down';
		}

		return 'chevrons-up-down';
	}
</script>

<div class="data-table-wrapper">
	<div class="data-table-container">
		<table class={tableClasses}>
			<thead class="data-table__head">
				<tr class="data-table__head-row">
					{#if selectable}
						<th class="data-table__head-cell data-table__head-cell--select">
							<input
								type="checkbox"
								class="data-table__checkbox"
								checked={allSelected}
								indeterminate={someSelected}
								onchange={(e) => handleSelectAll(e.currentTarget.checked)}
							/>
						</th>
					{/if}

					{#each columns as column (column.key)}
						<th
							class="data-table__head-cell"
							class:data-table__head-cell--sortable={sortable && column.sortable}
							class:data-table__head-cell--sorted={currentSort?.key === column.key}
							class:data-table__head-cell--center={column.align === 'center'}
							class:data-table__head-cell--right={column.align === 'right'}
							style:width={column.width}
							onclick={() => handleSort(column)}
						>
							<div class="data-table__head-content">
								<span class="data-table__head-label">{column.label}</span>
								{#if sortable && column.sortable}
									<span class="data-table__sort-icon">
										<i class="icon-{getSortIcon(column)}"></i>
									</span>
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>

			<tbody class="data-table__body">
				{#if loading}
					<tr class="data-table__loading-row">
						<td class="data-table__loading-cell" colspan={columns.length + (selectable ? 1 : 0)}>
							<div class="data-table__loading">
								<div class="data-table__spinner">
									<svg class="animate-spin" viewBox="0 0 24 24">
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
											fill="none"
										/>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										/>
									</svg>
								</div>
								<span>{loadingMessage}</span>
							</div>
						</td>
					</tr>
				{:else if data.length === 0}
					<tr class="data-table__empty-row">
						<td class="data-table__empty-cell" colspan={columns.length + (selectable ? 1 : 0)}>
							<div class="data-table__empty">
								<div class="data-table__empty-icon">
									<i class="icon-inbox"></i>
								</div>
								<span class="data-table__empty-message">{emptyMessage}</span>
							</div>
						</td>
					</tr>
				{:else}
					{#each data as row, index (row.id || index)}
						<tr
							class="data-table__body-row"
							class:data-table__body-row--selected={isRowSelected(row)}
							onclick={() => handleRowClick(row, index)}
						>
							{#if selectable}
								<td class="data-table__body-cell data-table__body-cell--select">
									<input
										type="checkbox"
										class="data-table__checkbox"
										checked={isRowSelected(row)}
										onchange={(e) => handleRowSelect(row, e.currentTarget.checked)}
										onclick={(e) => e.stopPropagation()}
									/>
								</td>
							{/if}

							{#each columns as column (column.key)}
								<td
									class="data-table__body-cell"
									class:data-table__body-cell--center={column.align === 'center'}
									class:data-table__body-cell--right={column.align === 'right'}
								>
									{#if column.type === 'badge'}
										<Badge variant={getBadgeVariant(column, row[column.key], row)} size="sm">
											{formatCellValue(column, row[column.key], row)}
										</Badge>
									{:else if column.component}
										{@const Component = column.component}
										<Component value={row[column.key]} {row} {column} />
									{:else}
										<span class="data-table__cell-content">
											{formatCellValue(column, row[column.key], row)}
										</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
