<script lang="ts">
	import {
		type ColumnDef,
		type SortingState,
		type VisibilityState,
		getCoreRowModel,
		getPaginationRowModel,
		getSortedRowModel
	} from '@tanstack/table-core';
	import { createSvelteTable } from '$lib/components/ui/data-table/data-table.svelte.js';
	import type { Document } from './types';
	
	// Import sub-components
	import TableControls from './TableControls.svelte';
	import TableHeader from './TableHeader.svelte';
	import TableBody from './TableBody.svelte';
	import TablePagination from './TablePagination.svelte';

	interface Props {
		documents: Document[];
		assignees?: Array<{ id: string; displayName: string }>;
		canPreview: (doc: Document) => boolean;
		canDownload: (doc: Document) => boolean;
		canViewDocuments: boolean;
		currentPage: number;
		pageSize: number;
		totalPages: number;
		onPageChange: (page: number) => void;
		onPageSizeChange?: (size: number) => void;
		showPerPageControl?: boolean;
		columnVisibilityState?: VisibilityState;
		onColumnVisibilityChange?: (visibility: VisibilityState) => void;
		onPreview: (documentId: string) => void;
		onDownload: (documentId: string) => void;
		dense?: boolean;
	}

	const {
		documents,
		assignees = [],
		canPreview,
		canDownload,
		canViewDocuments,
		currentPage,
		pageSize,
		totalPages,
		onPageChange,
		onPageSizeChange,
		showPerPageControl = true,
		columnVisibilityState,
		onColumnVisibilityChange,
		onPreview,
		onDownload,
		dense = false
	}: Props = $props();

	// Sorting state
	let sorting = $state<SortingState>([]);

	// Row selection state
	let rowSelection = $state<Record<string, boolean>>({});

	// Count selected documents
	const selectedCount = $derived(
		Object.keys(rowSelection).filter((key) => rowSelection[key]).length
	);

	// Column visibility state - use external state if provided, otherwise internal
	let internalColumnVisibility = $state<VisibilityState>({});
	const columnVisibility = $derived(columnVisibilityState ?? internalColumnVisibility);

	// Define columns
	const baseColumns: ColumnDef<Document>[] = [
		{
			accessorKey: 'filename',
			header: 'Filename',
			size: 300
		},
		{
			accessorKey: 'category',
			header: 'Category',
			size: 150
		},
		{
			accessorKey: 'sensitivity_level',
			header: 'Sensitivity',
			size: 150
		},
		{
			accessorKey: 'assigned_users',
			header: 'Assignees',
			size: 200
		},
		{
			accessorKey: 'uploaded_at',
			header: 'Upload Date',
			size: 120
		},
		{
			accessorKey: 'expiration_date',
			header: 'Expiration',
			size: 120
		},
		{
			accessorKey: 'file_size_bytes',
			header: 'Size',
			size: 100
		},
		{
			accessorKey: 'version_number',
			header: 'Version',
			size: 80
		}
	];

	// Build columns array with conditional checkbox and actions
	const columns = $derived.by(() => {
		const cols: ColumnDef<Document>[] = [];

		// Add checkbox column for bulk selection
		cols.push({
			id: 'select',
			header: '',
			size: 35,
			enableHiding: false,
			enableSorting: false
		});

		// Add base columns
		cols.push(...baseColumns);

		// Add actions column
		cols.push({
			id: 'actions',
			header: 'Actions',
			size: 150,
			enableHiding: false
		});

		return cols;
	});

	// Create table instance
	const table = createSvelteTable({
		get data() {
			return documents;
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
</script>

<div class={dense ? 'h-full flex flex-col' : 'space-y-4'}>
	<!-- Controls Row: Columns only when not in external control mode -->
	{#if showPerPageControl}
		<TableControls {table} />
	{/if}

	<!-- DataTable -->
	<div
		class={dense 
			? 'flex-1 overflow-auto border-t bg-background' 
			: 'overflow-auto rounded-md border bg-card text-card-foreground'}
		data-testid="document-datatable"
	>
		<div class="w-full table-auto">
			<TableHeader {table} {dense} />
			<TableBody
				{table}
				{columns}
				{canPreview}
				{canDownload}
				{onPreview}
				{onDownload}
				{dense}
			/>
		</div>

		{#if !dense}
			<TablePagination
				{currentPage}
				{totalPages}
				{onPageChange}
			/>
		{/if}
	</div>
	
	{#if dense}
		<div class="border-t p-2 bg-background flex-shrink-0">
			<TablePagination
				{currentPage}
				{totalPages}
				{onPageChange}
				dense={true}
			/>
		</div>
	{/if}
</div>