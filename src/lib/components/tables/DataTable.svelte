<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '../base/Button.svelte';
  import Badge from '../base/Badge.svelte';

  const dispatch = createEventDispatcher();

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
  export let data: TableData[] = [];
  export let columns: Column[] = [];
  export let loading: boolean = false;
  export let selectable: boolean = false;
  export let sortable: boolean = true;
  export let hoverable: boolean = true;
  export let striped: boolean = false;
  export let compact: boolean = false;
  export let emptyMessage: string = 'No data available';
  export let loadingMessage: string = 'Loading...';
  export let currentSort: { key: string; direction: 'asc' | 'desc' } | null = null;
  export let selectedRows: any[] = [];

  // Internal state
  let allSelected = false;
  $: allSelected = data.length > 0 && selectedRows.length === data.length;
  $: someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  // Computed classes
  $: tableClasses = [
    'data-table',
    hoverable && 'data-table--hoverable',
    striped && 'data-table--striped',
    compact && 'data-table--compact'
  ].filter(Boolean).join(' ');

  // Event handlers
  function handleSort(column: Column) {
    if (!sortable || !column.sortable) return;

    let direction: 'asc' | 'desc' = 'asc';
    
    if (currentSort?.key === column.key) {
      direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }

    dispatch('sort', { key: column.key, direction });
  }

  function handleRowClick(row: TableData, index: number) {
    dispatch('rowClick', { row, index });
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      selectedRows = [...data];
    } else {
      selectedRows = [];
    }
    dispatch('selectionChange', selectedRows);
  }

  function handleRowSelect(row: TableData, checked: boolean) {
    if (checked) {
      selectedRows = [...selectedRows, row];
    } else {
      selectedRows = selectedRows.filter(r => r !== row);
    }
    dispatch('selectionChange', selectedRows);
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

  function getBadgeVariant(column: Column, value: any, row: TableData): string {
    if (column.badgeVariant) {
      return column.badgeVariant(value, row);
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
                on:change={(e) => handleSelectAll(e.currentTarget.checked)}
              />
            </th>
          {/if}
          
          {#each columns as column}
            <th 
              class="data-table__head-cell"
              class:data-table__head-cell--sortable={sortable && column.sortable}
              class:data-table__head-cell--sorted={currentSort?.key === column.key}
              class:data-table__head-cell--center={column.align === 'center'}
              class:data-table__head-cell--right={column.align === 'right'}
              style:width={column.width}
              on:click={() => handleSort(column)}
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
            <td 
              class="data-table__loading-cell" 
              colspan={columns.length + (selectable ? 1 : 0)}
            >
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
            <td 
              class="data-table__empty-cell" 
              colspan={columns.length + (selectable ? 1 : 0)}
            >
              <div class="data-table__empty">
                <div class="data-table__empty-icon">
                  <i class="icon-inbox"></i>
                </div>
                <span class="data-table__empty-message">{emptyMessage}</span>
              </div>
            </td>
          </tr>
        {:else}
          {#each data as row, index}
            <tr 
              class="data-table__body-row"
              class:data-table__body-row--selected={isRowSelected(row)}
              on:click={() => handleRowClick(row, index)}
            >
              {#if selectable}
                <td class="data-table__body-cell data-table__body-cell--select">
                  <input
                    type="checkbox"
                    class="data-table__checkbox"
                    checked={isRowSelected(row)}
                    on:change={(e) => handleRowSelect(row, e.currentTarget.checked)}
                    on:click={(e) => e.stopPropagation()}
                  />
                </td>
              {/if}
              
              {#each columns as column}
                <td 
                  class="data-table__body-cell"
                  class:data-table__body-cell--center={column.align === 'center'}
                  class:data-table__body-cell--right={column.align === 'right'}
                >
                  {#if column.type === 'badge'}
                    <Badge 
                      variant={getBadgeVariant(column, row[column.key], row)}
                      size="sm"
                    >
                      {formatCellValue(column, row[column.key], row)}
                    </Badge>
                  {:else if column.component}
                    <svelte:component 
                      this={column.component} 
                      value={row[column.key]} 
                      {row} 
                      {column}
                    />
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

<style lang="postcss">
  /* Wrapper and Container */
  .data-table-wrapper {
    @apply w-full;
  }

  .data-table-container {
    @apply overflow-x-auto border border-gray-200 rounded-lg;
  }

  /* Base Table */
  .data-table {
    @apply min-w-full divide-y divide-gray-200 bg-white;
  }

  /* Table Head */
  .data-table__head {
    @apply bg-gray-50;
  }

  .data-table__head-row {
    @apply divide-x divide-gray-200;
  }

  .data-table__head-cell {
    @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider;
  }

  .data-table__head-cell--select {
    @apply w-12 px-4;
  }

  .data-table__head-cell--center {
    @apply text-center;
  }

  .data-table__head-cell--right {
    @apply text-right;
  }

  .data-table__head-cell--sortable {
    @apply cursor-pointer hover:bg-gray-100 select-none;
  }

  .data-table__head-cell--sorted {
    @apply bg-gray-100 text-gray-900;
  }

  .data-table__head-content {
    @apply flex items-center space-x-1;
  }

  .data-table__head-cell--center .data-table__head-content {
    @apply justify-center;
  }

  .data-table__head-cell--right .data-table__head-content {
    @apply justify-end;
  }

  .data-table__head-label {
    @apply flex-1;
  }

  .data-table__sort-icon {
    @apply flex-shrink-0 text-gray-400;
  }

  .data-table__sort-icon i {
    @apply w-4 h-4;
  }

  /* Table Body */
  .data-table__body {
    @apply bg-white divide-y divide-gray-200;
  }

  .data-table__body-row {
    @apply divide-x divide-gray-200;
  }

  .data-table__body-cell {
    @apply px-6 py-4 whitespace-nowrap text-sm text-gray-900;
  }

  .data-table__body-cell--select {
    @apply w-12 px-4;
  }

  .data-table__body-cell--center {
    @apply text-center;
  }

  .data-table__body-cell--right {
    @apply text-right;
  }

  .data-table__cell-content {
    @apply truncate;
  }

  /* Table Variants */
  .data-table--hoverable .data-table__body-row {
    @apply hover:bg-gray-50 cursor-pointer;
  }

  .data-table--striped .data-table__body-row:nth-child(even) {
    @apply bg-gray-50;
  }

  .data-table--compact .data-table__head-cell {
    @apply px-4 py-2;
  }

  .data-table--compact .data-table__body-cell {
    @apply px-4 py-2;
  }

  /* Selection States */
  .data-table__body-row--selected {
    @apply bg-blue-50;
  }

  .data-table__checkbox {
    @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded;
  }

  /* Loading State */
  .data-table__loading-row {
    @apply bg-gray-50;
  }

  .data-table__loading-cell {
    @apply px-6 py-8;
  }

  .data-table__loading {
    @apply flex items-center justify-center space-x-3 text-gray-500;
  }

  .data-table__spinner svg {
    @apply w-5 h-5;
  }

  /* Empty State */
  .data-table__empty-row {
    @apply bg-gray-50;
  }

  .data-table__empty-cell {
    @apply px-6 py-8;
  }

  .data-table__empty {
    @apply flex flex-col items-center justify-center text-gray-500;
  }

  .data-table__empty-icon {
    @apply mb-3;
  }

  .data-table__empty-icon i {
    @apply w-12 h-12 text-gray-300;
  }

  .data-table__empty-message {
    @apply text-sm font-medium;
  }

  /* Animations */
  .animate-spin {
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

  /* Responsive */
  @media (max-width: 640px) {
    .data-table__head-cell {
      @apply px-4 py-3;
    }

    .data-table__body-cell {
      @apply px-4 py-3;
    }
  }
</style>