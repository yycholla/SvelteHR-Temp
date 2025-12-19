<script lang="ts" generics="T">
	import { Check, X, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ColumnVisibilityControl from './ColumnVisibilityControl.svelte';
	import type { SpreadsheetConfig, ColumnVisibility, RowEdit } from './types';
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

	// Visible columns
	const visibleColumns = $derived(
		config.columns.filter((col) => columnVisibility[col.id] !== false)
	);

	// Edit state
	let editingCell = $state<{ rowId: string; columnId: string } | null>(null);
	let pendingEdits = $state<Map<string, RowEdit<T>>>(new Map());
	let editValues = $state<Map<string, unknown>>(new Map());

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
		editValues.set(`${rowId}-${columnId}`, currentValue);
	}

	// Cancel editing
	function cancelEdit() {
		if (editingCell) {
			const key = `${editingCell.rowId}-${editingCell.columnId}`;
			editValues.delete(key);
		}
		editingCell = null;
	}

	// Save cell edit
	function saveEdit(row: T) {
		if (!editingCell) return;

		const { rowId, columnId } = editingCell;
		const column = config.columns.find((col) => col.id === columnId);
		if (!column?.field) {
			cancelEdit();
			return;
		}

		const key = `${rowId}-${columnId}`;
		const newValue = editValues.get(key);
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
</script>

<div class="flex flex-col h-full overflow-hidden {className}">
	<!-- Controls -->
	{#if config.showColumnControls || (config.showSaveButton && pendingEdits.size > 0)}
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
				<tr>
					{#each visibleColumns as column (column.id)}
						<th
							class="px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 {column.width ||
								''} {column.headerClass || ''}"
							class:text-right={column.align === 'right'}
							class:text-center={column.align === 'center'}
						>
							{column.label}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y">
				{#each data as row (config.getRowId(row))}
					{@const rowId = config.getRowId(row)}
					<tr class="hover:bg-muted/30 group">
						{#each visibleColumns as column (column.id)}
							{@const editing = isEditing(rowId, column.id)}
							{@const value = column.getValue(row)}
							{@const displayValue = renderCell(column, row)}
							{@const editKey = `${rowId}-${column.id}`}
							{@const hasEdit = column.field && pendingEdits.has(`${rowId}-${column.field}`)}

							<td
								class="px-3 py-1.5 border-r last:border-r-0 {column.cellClass || ''}"
								class:truncate={column.truncate}
								class:align-top={!editing}
								class:text-right={column.align === 'right'}
								class:text-center={column.align === 'center'}
								class:max-w-[200px]={column.truncate && !column.maxWidth}
								class:bg-yellow-50={hasEdit}
								class:dark:bg-yellow-900/10={hasEdit}
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
												autofocus
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
												autofocus
											/>
										{:else}
											<input
												type="text"
												bind:value={editValues[editKey]}
												onkeydown={(e) => handleKeydown(e, row)}
												class="flex-1 h-7 rounded border border-primary bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
												autofocus
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
						<td colspan={visibleColumns.length} class="px-4 py-12 text-center text-muted-foreground text-xs">
							{config.emptyMessage || 'No data available'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
