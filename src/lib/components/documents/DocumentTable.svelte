<script lang="ts">
	// DocumentTable component (Feature 024)
	// Paginated, filterable, sortable document table with RBAC-aware actions

	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import NativeSelect from '$lib/components/ui/native-select/native-select.svelte';
	import * as Table from '$lib/components/ui/table';
	import { Search, ArrowUpDown } from '@lucide/svelte';
	import type { Document } from '$lib/types/document';
	import type {
		DocumentCategory,
		SensitivityLevel,
		FileType,
		SortField,
		SortOrder
	} from '$lib/types/document';

	interface Props {
		documents: Document[];
		totalCount: number;
		currentPage?: number;
		pageSize?: number;
		sortBy?: SortField;
		sortOrder?: SortOrder;
		filterCategory?: DocumentCategory | null;
		filterSensitivity?: SensitivityLevel | null;
		searchQuery?: string;
		canPreview?: (doc: Document) => boolean;
		canDownload?: (doc: Document) => boolean;
		onPageChange?: (page: number) => void;
		onSortChange?: (field: SortField, order: SortOrder) => void;
		onFilterChange?: (filters: {
			category?: DocumentCategory | null;
			sensitivity?: SensitivityLevel | null;
			search?: string;
		}) => void;
		onPreview?: (documentId: string) => void;
		onDownload?: (documentId: string) => void;
	}

	let {
		documents = [],
		totalCount = 0,
		currentPage = 1,
		pageSize = 20,
		sortBy = 'uploaded_at',
		sortOrder = 'desc',
		filterCategory = null,
		filterSensitivity = null,
		searchQuery = '',
		canPreview = () => false,
		canDownload = () => false,
		onPageChange = () => {},
		onSortChange = () => {},
		onFilterChange = () => {},
		onPreview = () => {},
		onDownload = () => {}
	}: Props = $props();

	// Svelte 5 state
	let selectedCategory = $state<string>(filterCategory || 'all');
	let selectedSensitivity = $state<string>(filterSensitivity || 'all');
	let search = $state(searchQuery);

	// Derived state
	let totalPages = $derived(Math.ceil(totalCount / pageSize));
	let hasDocuments = $derived(documents.length > 0);
	let startIndex = $derived((currentPage - 1) * pageSize + 1);
	let endIndex = $derived(Math.min(currentPage * pageSize, totalCount));

	// Categories and sensitivity levels for filters
	const categories: DocumentCategory[] = [
		'Contract',
		'Policy',
		'Report',
		'Invoice',
		'Certificate',
		'Payslip',
		'License',
		'Other'
	];

	const sensitivityLevels: SensitivityLevel[] = [
		'Public',
		'Internal',
		'Confidential',
		'Sensitive-PII'
	];

	// Handle filter changes
	function applyFilters() {
		onFilterChange({
			category: selectedCategory === 'all' ? null : (selectedCategory as DocumentCategory),
			sensitivity: selectedSensitivity === 'all' ? null : (selectedSensitivity as SensitivityLevel),
			search
		});
	}

	// Handle sort change
	function handleSort(field: SortField) {
		const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
		onSortChange(field, newOrder);
	}

	// Handle page navigation
	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			onPageChange(page);
		}
	}

	// Clear all filters
	function clearFilters() {
		selectedCategory = 'all';
		selectedSensitivity = 'all';
		search = '';
		applyFilters();
	}

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
	function getSensitivityClass(level: string): string {
		const classes: Record<string, string> = {
			Public: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
			Internal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
			Confidential: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
			'Sensitive-PII': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
		};
		return classes[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
	}

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div class="document-table">
	<!-- Header -->
	<div class="flex justify-between items-center mb-4">
		<div>
			<h2 class="text-xl font-semibold">
				Documents
				<span class="text-sm text-muted-foreground ml-2">({totalCount})</span>
			</h2>
		</div>
	</div>

	<!-- Filters -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
		<div class="relative">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Search by filename..."
				bind:value={search}
				oninput={applyFilters}
				class="pl-9"
			/>
		</div>

		<NativeSelect bind:value={selectedCategory} onchange={applyFilters}>
			<option value="all">All Categories</option>
			{#each categories as category}
				<option value={category}>{category}</option>
			{/each}
		</NativeSelect>

		<NativeSelect bind:value={selectedSensitivity} onchange={applyFilters}>
			<option value="all">All Sensitivity Levels</option>
			{#each sensitivityLevels as level}
				<option value={level}>{level}</option>
			{/each}
		</NativeSelect>

		<Button variant="outline" onclick={clearFilters}>Clear Filters</Button>
	</div>

	<!-- Sorting -->
	<div class="flex gap-2 mb-4">
		<span class="text-sm text-muted-foreground self-center">Sort by:</span>
		<Button
			variant={sortBy === 'uploaded_at' ? 'default' : 'outline'}
			size="sm"
			onclick={() => handleSort('uploaded_at')}
		>
			<ArrowUpDown class="mr-2 h-3 w-3" />
			Upload Date {sortBy === 'uploaded_at' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
		</Button>
		<Button
			variant={sortBy === 'filename' ? 'default' : 'outline'}
			size="sm"
			onclick={() => handleSort('filename')}
		>
			<ArrowUpDown class="mr-2 h-3 w-3" />
			Filename {sortBy === 'filename' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
		</Button>
		<Button
			variant={sortBy === 'file_size_bytes' ? 'default' : 'outline'}
			size="sm"
			onclick={() => handleSort('file_size_bytes')}
		>
			<ArrowUpDown class="mr-2 h-3 w-3" />
			File Size {sortBy === 'file_size_bytes' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
		</Button>
	</div>

	<!-- Document table -->
	{#if hasDocuments}
		<div class="border rounded-lg overflow-hidden">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-12"></Table.Head>
						<Table.Head>Filename</Table.Head>
						<Table.Head>Category</Table.Head>
						<Table.Head>Sensitivity</Table.Head>
						<Table.Head>Upload Date</Table.Head>
						<Table.Head>Size</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each documents as document (document.id)}
						<Table.Row
							class="cursor-pointer hover:bg-muted/50"
							onclick={() => goto(`/dashboard/documents/${document.id}`)}
						>
							<Table.Cell class="text-2xl">{getFileIcon(document.file_type)}</Table.Cell>
							<Table.Cell class="font-medium">{document.filename}</Table.Cell>
							<Table.Cell>
								<span class="text-sm text-muted-foreground">{document.category}</span>
							</Table.Cell>
							<Table.Cell>
								<div class="flex gap-2 flex-wrap items-center">
									<span
										class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getSensitivityClass(
											document.sensitivity_level
										)}"
									>
										{document.sensitivity_level}
									</span>
									{#if document.assigned_users && Array.isArray(document.assigned_users) && document.assigned_users.length > 0}
										{#each document.assigned_users as assignedUser}
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
												title="Assigned to {assignedUser.email}"
											>
												👤 {assignedUser.email}
											</span>
										{/each}
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground">
								{new Date(document.uploaded_at).toLocaleDateString()}
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground">
								{formatFileSize(document.file_size_bytes)}
							</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex gap-2 justify-end">
									{#if canPreview(document)}
										<Button
											variant="ghost"
											size="sm"
											onclick={(e) => {
												e.stopPropagation();
												onPreview(document.id);
											}}
										>
											👁️ Preview
										</Button>
									{/if}
									{#if canDownload(document)}
										<Button
											variant="ghost"
											size="sm"
											onclick={(e) => {
												e.stopPropagation();
												onDownload(document.id);
											}}
										>
											⬇️ Download
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<div class="text-center py-12">
			<div class="text-6xl mb-4">📁</div>
			<h3 class="text-lg font-semibold mb-2">No documents found</h3>
			<p class="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
		</div>
	{/if}

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex justify-between items-center mt-6 pt-4 border-t">
			<div class="text-sm text-muted-foreground">
				Showing {startIndex}-{endIndex} of {totalCount}
			</div>

			<div class="flex gap-1">
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(1)}
					disabled={currentPage === 1}
					title="First page"
				>
					««
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(currentPage - 1)}
					disabled={currentPage === 1}
					title="Previous page"
				>
					«
				</Button>

				{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
					const startPage = Math.max(1, currentPage - 2);
					return startPage + i;
				}).filter((p) => p <= totalPages) as page}
					<Button
						variant={page === currentPage ? 'default' : 'outline'}
						size="sm"
						onclick={() => goToPage(page)}
					>
						{page}
					</Button>
				{/each}

				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(currentPage + 1)}
					disabled={currentPage === totalPages}
					title="Next page"
				>
					»
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(totalPages)}
					disabled={currentPage === totalPages}
					title="Last page"
				>
					»»
				</Button>
			</div>
		</div>
	{/if}
</div>
