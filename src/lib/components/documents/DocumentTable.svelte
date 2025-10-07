<script lang="ts">
	// DocumentTable component (Feature 024)
	// Paginated, filterable, sortable document table with RBAC-aware actions

	import DocumentCard from './DocumentCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Search, Grid, List, ArrowUpDown } from 'lucide-svelte';
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
</script>

<div class="document-table">
	<!-- Header with view toggle -->
	<div class="flex justify-between items-center mb-4">
		<div>
			<h2 class="text-xl font-semibold">
				Documents
				<span class="text-sm text-muted-foreground ml-2">({totalCount})</span>
			</h2>
		</div>

		<div class="flex gap-2">
			<Button
				variant={viewMode === 'grid' ? 'default' : 'outline'}
				size="icon"
				onclick={() => (viewMode = 'grid')}
				title="Grid view"
			>
				<Grid class="h-4 w-4" />
			</Button>
			<Button
				variant={viewMode === 'list' ? 'default' : 'outline'}
				size="icon"
				onclick={() => (viewMode = 'list')}
				title="List view"
			>
				<List class="h-4 w-4" />
			</Button>
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

		<Select.Root
			type="single"
			bind:value={() => selectedCategory, (v) => {
				selectedCategory = v ?? 'all';
				applyFilters();
			}}
		>
			<Select.Trigger>
				<Select.Value placeholder="All Categories" />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All Categories</Select.Item>
				{#each categories as category}
					<Select.Item value={category}>{category}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<Select.Root
			type="single"
			bind:value={() => selectedSensitivity, (v) => {
				selectedSensitivity = v ?? 'all';
				applyFilters();
			}}
		>
			<Select.Trigger>
				<Select.Value placeholder="All Sensitivity Levels" />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All Levels</Select.Item>
				{#each sensitivityLevels as level}
					<Select.Item value={level}>{level}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

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

	<!-- Document list/grid -->
	{#if hasDocuments}
		<div class:grid={viewMode === 'grid'} class:flex={viewMode === 'list'} class="gap-4" class:grid-cols-1={viewMode === 'grid'} class:md:grid-cols-2={viewMode === 'grid'} class:lg:grid-cols-3={viewMode === 'grid'} class:flex-col={viewMode === 'list'}>
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

