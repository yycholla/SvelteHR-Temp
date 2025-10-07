<script lang="ts">
	// DocumentTable component (Feature 024)
	// Paginated, filterable, sortable document table with RBAC-aware actions

	import DocumentCard from './DocumentCard.svelte';
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
	let viewMode = $state<'grid' | 'list'>('grid');
	let selectedCategory = $state<DocumentCategory | null>(filterCategory);
	let selectedSensitivity = $state<SensitivityLevel | null>(filterSensitivity);
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
			category: selectedCategory,
			sensitivity: selectedSensitivity,
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
		selectedCategory = null;
		selectedSensitivity = null;
		search = '';
		applyFilters();
	}
</script>

<div class="document-table">
	<!-- Header with view toggle -->
	<div class="table-header">
		<h2 class="table-title">
			Documents
			<span class="document-count">({totalCount})</span>
		</h2>

		<div class="view-toggle">
			<button
				class="toggle-button"
				class:active={viewMode === 'grid'}
				onclick={() => (viewMode = 'grid')}
				title="Grid view"
			>
				▦
			</button>
			<button
				class="toggle-button"
				class:active={viewMode === 'list'}
				onclick={() => (viewMode = 'list')}
				title="List view"
			>
				☰
			</button>
		</div>
	</div>

	<!-- Filters -->
	<div class="filters">
		<div class="filter-group">
			<label for="search">Search</label>
			<input
				id="search"
				type="text"
				placeholder="Search by filename..."
				bind:value={search}
				oninput={applyFilters}
			/>
		</div>

		<div class="filter-group">
			<label for="category">Category</label>
			<select id="category" bind:value={selectedCategory} onchange={applyFilters}>
				<option value={null}>All Categories</option>
				{#each categories as category}
					<option value={category}>{category}</option>
				{/each}
			</select>
		</div>

		<div class="filter-group">
			<label for="sensitivity">Sensitivity</label>
			<select id="sensitivity" bind:value={selectedSensitivity} onchange={applyFilters}>
				<option value={null}>All Levels</option>
				{#each sensitivityLevels as level}
					<option value={level}>{level}</option>
				{/each}
			</select>
		</div>

		<button class="clear-filters" onclick={clearFilters}>Clear Filters</button>
	</div>

	<!-- Sorting -->
	<div class="sorting">
		<span class="sort-label">Sort by:</span>
		<button
			class="sort-button"
			class:active={sortBy === 'uploaded_at'}
			onclick={() => handleSort('uploaded_at')}
		>
			Upload Date {sortBy === 'uploaded_at' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
		</button>
		<button
			class="sort-button"
			class:active={sortBy === 'filename'}
			onclick={() => handleSort('filename')}
		>
			Filename {sortBy === 'filename' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
		</button>
		<button
			class="sort-button"
			class:active={sortBy === 'file_size_bytes'}
			onclick={() => handleSort('file_size_bytes')}
		>
			File Size {sortBy === 'file_size_bytes' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
		</button>
	</div>

	<!-- Document list/grid -->
	{#if hasDocuments}
		<div class="document-container" class:grid-view={viewMode === 'grid'} class:list-view={viewMode === 'list'}>
			{#each documents as document (document.id)}
				<DocumentCard
					{document}
					canPreview={canPreview(document)}
					canDownload={canDownload(document)}
					{onPreview}
					{onDownload}
				/>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<div class="empty-icon">📁</div>
			<h3>No documents found</h3>
			<p>Try adjusting your filters or search query.</p>
		</div>
	{/if}

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="pagination">
			<div class="pagination-info">
				Showing {startIndex}-{endIndex} of {totalCount}
			</div>

			<div class="pagination-controls">
				<button
					class="page-button"
					onclick={() => goToPage(1)}
					disabled={currentPage === 1}
					title="First page"
				>
					««
				</button>
				<button
					class="page-button"
					onclick={() => goToPage(currentPage - 1)}
					disabled={currentPage === 1}
					title="Previous page"
				>
					«
				</button>

				{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
					const startPage = Math.max(1, currentPage - 2);
					return startPage + i;
				}).filter((p) => p <= totalPages) as page}
					<button
						class="page-button"
						class:active={page === currentPage}
						onclick={() => goToPage(page)}
					>
						{page}
					</button>
				{/each}

				<button
					class="page-button"
					onclick={() => goToPage(currentPage + 1)}
					disabled={currentPage === totalPages}
					title="Next page"
				>
					»
				</button>
				<button
					class="page-button"
					onclick={() => goToPage(totalPages)}
					disabled={currentPage === totalPages}
					title="Last page"
				>
					»»
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.document-table {
		width: 100%;
	}

	.table-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.table-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #2d3748;
		margin: 0;
	}

	.document-count {
		color: #718096;
		font-weight: 400;
	}

	.view-toggle {
		display: flex;
		gap: 0.5rem;
	}

	.toggle-button {
		padding: 0.5rem 0.75rem;
		background: white;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 1.25rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.toggle-button:hover {
		background: #f7fafc;
	}

	.toggle-button.active {
		background: #4299e1;
		color: white;
		border-color: #4299e1;
	}

	.filters {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 200px;
	}

	.filter-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #4a5568;
	}

	.filter-group input,
	.filter-group select {
		padding: 0.5rem;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.filter-group input:focus,
	.filter-group select:focus {
		outline: none;
		border-color: #4299e1;
		box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
	}

	.clear-filters {
		align-self: flex-end;
		padding: 0.5rem 1rem;
		background: white;
		color: #4a5568;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.clear-filters:hover {
		background: #f7fafc;
	}

	.sorting {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: #f7fafc;
		border-radius: 4px;
	}

	.sort-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #4a5568;
	}

	.sort-button {
		padding: 0.375rem 0.75rem;
		background: white;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.sort-button:hover {
		border-color: #4299e1;
	}

	.sort-button.active {
		background: #4299e1;
		color: white;
		border-color: #4299e1;
	}

	.document-container {
		margin-bottom: 1.5rem;
	}

	.grid-view {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.list-view {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: #718096;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #4a5568;
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		font-size: 0.875rem;
		margin: 0;
	}

	.pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f7fafc;
		border-radius: 4px;
	}

	.pagination-info {
		font-size: 0.875rem;
		color: #4a5568;
	}

	.pagination-controls {
		display: flex;
		gap: 0.25rem;
	}

	.page-button {
		min-width: 2.5rem;
		padding: 0.5rem 0.75rem;
		background: white;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.page-button:hover:not(:disabled) {
		background: #f7fafc;
		border-color: #4299e1;
	}

	.page-button.active {
		background: #4299e1;
		color: white;
		border-color: #4299e1;
	}

	.page-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
