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
	import HtmlCheckbox from '$lib/components/ui/checkbox/html-checkbox.svelte';
	import {
		FileText,
		Eye,
		Download,
		ChevronDown,
		ChevronUp,
		ChevronsUpDown,
		Settings2,
		Lock
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { writable } from 'svelte/store';

	// Document interface matching the data structure
	interface Document {
		id: string;
		filename: string;
		file_type: string;
		file_size_bytes: number;
		category: string;
		sensitivity_level?: string;
		uploaded_at: string;
		uploaded_by: string;
		expiration_date?: string | null;
		version_number?: number;
		is_encrypted?: boolean;
		assigned_users?: Array<{ id: string; email: string; displayName: string }>;
	}

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
	}

	let {
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
		onDownload
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

	// Assignee lookup map for displaying names
	const assigneeMap = $derived.by(() => {
		const map = new Map<string, string>();
		assignees.forEach((assignee) => {
			map.set(assignee.id, assignee.displayName);
		});
		return map;
	});

	// File type icons mapping
	function getFileIcon(fileType: string): string {
		const icons: Record<string, string> = {
			PDF: '📄',
			JPEG: '🖼️',
			PNG: '🖼️',
			GIF: '🖼️',
			DOCX: '📝',
			XLSX: '📊',
			TXT: '📃',
			CSV: '📈'
		};
		return icons[fileType] || '📎';
	}

	// Sensitivity level badge colors with dark mode support
	function getSensitivityClass(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		const classes: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
			Public: 'secondary',
			Internal: 'default',
			Confidential: 'outline',
			'Sensitive-PII': 'destructive'
		};
		return classes[level] || 'secondary';
	}

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Format date
	function formatDate(dateString: string | null | undefined): string {
		if (!dateString) return 'N/A';
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return 'N/A';
		}
	}

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

	// Handle row click
	function handleRowClick(documentId: string) {
		goto(`/dashboard/documents/${documentId}`);
	}

	function clearSelection() {
		rowSelection = {};
	}
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
							{column.id.replace(/([A-Z_])/g, ' $1').trim()}
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/if}

	<!-- DataTable -->
	<div
		class="overflow-auto rounded-md border bg-card text-card-foreground"
		data-testid="document-datatable"
	>
		<Table.Root class="w-full table-auto">
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row>
						{#each headerGroup.headers as header (header.id)}
							<Table.Head
								class={header.column.getCanSort()
									? 'cursor-pointer'
									: '' +
										(header.column.id === 'select'
											? ' pr-2 pl-6'
											: header.column.id === 'filename'
												? ' pl-2'
												: '')}
								style={header.column.columnDef.size
									? `width: ${header.column.columnDef.size}px; min-width: ${header.column.columnDef.size}px;`
									: ''}
								onclick={header.column.getCanSort()
									? () => header.column.toggleSorting()
									: undefined}
							>
								{#if !header.isPlaceholder}
									<div class="flex items-center gap-2">
										{#if header.column.id === 'select'}
											{@const allSelected = table?.getIsAllPageRowsSelected() ?? false}
											{@const someSelected = table?.getIsSomePageRowsSelected() && !allSelected}
											<div class="flex items-center justify-center">
												<HtmlCheckbox
													checked={allSelected}
													indeterminate={someSelected}
													onCheckedChange={(value) => {
														table?.toggleAllPageRowsSelected(!!value);
													}}
													aria-label="Select all rows"
												/>
											</div>
										{:else if header.column.id === 'actions'}
											<div class="w-full text-right">Actions</div>
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
									class={cell.column.id === 'select'
										? 'pr-2 pl-6'
										: cell.column.id === 'filename'
											? 'pl-2'
											: ''}
									style={cell.column.columnDef.size
										? `width: ${cell.column.columnDef.size}px; min-width: ${cell.column.columnDef.size}px;`
										: ''}
								>
									{#if cell.column.id === 'select'}
										{@const isRowSelected = row?.getIsSelected() ?? false}
										<HtmlCheckbox
											checked={isRowSelected}
											disabled={!row?.getCanSelect()}
											onCheckedChange={(value) => {
												row?.toggleSelected(!!value);
											}}
											onclick={(e: MouseEvent) => e.stopPropagation()}
										/>
									{:else if cell.column.id === 'filename'}
										<div class="flex items-center gap-2">
											<span class="text-2xl">{getFileIcon(row.original.file_type)}</span>
											<div class="font-medium">{row.original.filename}</div>
											{#if row.original.is_encrypted}
												<Lock class="h-3 w-3 text-muted-foreground" />
											{/if}
										</div>
									{:else if cell.column.id === 'category'}
										<Badge variant="outline">{row.original.category}</Badge>
									{:else if cell.column.id === 'sensitivity_level'}
										{#if row.original.sensitivity_level}
											<Badge variant={getSensitivityClass(row.original.sensitivity_level)}>
												{row.original.sensitivity_level}
											</Badge>
										{:else}
											<span class="text-sm text-muted-foreground">Not set</span>
										{/if}
									{:else if cell.column.id === 'assigned_users'}
										{#if row.original.assigned_users && row.original.assigned_users.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each row.original.assigned_users.slice(0, 2) as assignee}
													<Badge variant="secondary" class="text-xs">
														{assignee.displayName}
													</Badge>
												{/each}
												{#if row.original.assigned_users.length > 2}
													<Badge variant="secondary" class="text-xs">
														+{row.original.assigned_users.length - 2} more
													</Badge>
												{/if}
											</div>
										{:else}
											<span class="text-sm text-muted-foreground">Unassigned</span>
										{/if}
									{:else if cell.column.id === 'uploaded_at'}
										<span class="text-sm text-muted-foreground">
											{formatDate(row.original.uploaded_at)}
										</span>
									{:else if cell.column.id === 'expiration_date'}
										{#if row.original.expiration_date}
											<span class="text-sm text-muted-foreground">
												{formatDate(row.original.expiration_date)}
											</span>
										{:else}
											<span class="text-sm text-muted-foreground">—</span>
										{/if}
									{:else if cell.column.id === 'file_size_bytes'}
										<span class="text-sm text-muted-foreground">
											{formatFileSize(row.original.file_size_bytes)}
										</span>
									{:else if cell.column.id === 'version_number'}
										{#if row.original.version_number}
											<Badge variant="outline" class="text-xs">
												v{row.original.version_number}
											</Badge>
										{:else}
											<span class="text-sm text-muted-foreground">—</span>
										{/if}
									{:else if cell.column.id === 'actions'}
										<div class="flex justify-end gap-1">
											{#if canPreview(row.original)}
												<Tooltip.Root>
													<Tooltip.Trigger>
														<Button
															variant="ghost"
															size="sm"
															onclick={(e) => {
																e.stopPropagation();
																onPreview(row.original.id);
															}}
														>
															<Eye class="h-4 w-4" />
														</Button>
													</Tooltip.Trigger>
													<Tooltip.Content>Preview Document</Tooltip.Content>
												</Tooltip.Root>
											{/if}
											{#if canDownload(row.original)}
												<Tooltip.Root>
													<Tooltip.Trigger>
														<Button
															variant="ghost"
															size="sm"
															onclick={(e) => {
																e.stopPropagation();
																onDownload(row.original.id);
															}}
														>
															<Download class="h-4 w-4" />
														</Button>
													</Tooltip.Trigger>
													<Tooltip.Content>Download Document</Tooltip.Content>
												</Tooltip.Root>
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
								<FileText class="h-8 w-8" />
								<p>No documents found</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div
				class="flex items-center justify-between border-t bg-card px-6 py-4 text-card-foreground"
				data-testid="document-pagination"
			>
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
