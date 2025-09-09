<script lang="ts">
	import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';

	let {
		currentPage = 1,
		totalPages = 1,
		pageSize = 20,
		pageSizeOptions = [10, 20, 50, 100],
		totalItems = 0,
		onPageChange,
		onPageSizeChange
	}: {
		currentPage: number;
		totalPages: number;
		pageSize: number;
		pageSizeOptions: number[];
		totalItems: number;
		onPageChange: (page: number) => void;
		onPageSizeChange: (size: number) => void;
	} = $props();

	// Calculate displayed range
	let startItem = $derived((currentPage - 1) * pageSize + 1);
	let endItem = $derived(Math.min(currentPage * pageSize, totalItems));

	// Generate page numbers to show
	let visiblePages = $derived.by(() => {
		const delta = 2; // Number of pages to show on each side of current page
		const pages: (number | string)[] = [];

		// Always show first page
		if (currentPage > delta + 2) {
			pages.push(1);
			if (currentPage > delta + 3) {
				pages.push('...');
			}
		}

		// Show pages around current page
		const start = Math.max(1, currentPage - delta);
		const end = Math.min(totalPages, currentPage + delta);

		for (let i = start; i <= end; i++) {
			pages.push(i);
		}

		// Always show last page
		if (currentPage < totalPages - delta - 1) {
			if (currentPage < totalPages - delta - 2) {
				pages.push('...');
			}
			pages.push(totalPages);
		}

		return pages;
	});

	function goToFirstPage() {
		if (currentPage > 1) {
			onPageChange(1);
		}
	}

	function goToPreviousPage() {
		if (currentPage > 1) {
			onPageChange(currentPage - 1);
		}
	}

	function goToNextPage() {
		if (currentPage < totalPages) {
			onPageChange(currentPage + 1);
		}
	}

	function goToLastPage() {
		if (currentPage < totalPages) {
			onPageChange(totalPages);
		}
	}

	function handlePageSizeChange(value: string) {
		const newSize = parseInt(value);
		if (pageSizeOptions.includes(newSize)) {
			onPageSizeChange(newSize);
		}
	}
</script>

<div class="flex items-center justify-between p-4">
	<!-- Results Information -->
	<div class="text-sm text-muted-foreground">
		{#if totalItems === 0}
			No results
		{:else}
			Showing {startItem.toLocaleString()} to {endItem.toLocaleString()} of {totalItems.toLocaleString()}
			results
		{/if}
	</div>

	<!-- Pagination Controls -->
	<div class="flex items-center space-x-4">
		<!-- Page Size Selector -->
		<div class="flex items-center space-x-2">
			<span class="text-sm text-muted-foreground">Rows per page:</span>
			<Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
				<SelectTrigger class="h-8 w-20 rounded-lg">
					<SelectValue />
				</SelectTrigger>
				<SelectContent class="rounded-xl">
					{#each pageSizeOptions as size}
						<SelectItem value={size.toString()} class="rounded-lg">
							{size}
						</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>

		{#if totalPages > 1}
			<!-- Page Navigation -->
			<div class="flex items-center space-x-1">
				<!-- First Page -->
				<Button
					variant="ghost"
					size="sm"
					onclick={goToFirstPage}
					disabled={currentPage === 1}
					class="h-8 w-8 rounded-lg p-0"
					aria-label="Go to first page"
				>
					<ChevronsLeft class="h-4 w-4" />
				</Button>

				<!-- Previous Page -->
				<Button
					variant="ghost"
					size="sm"
					onclick={goToPreviousPage}
					disabled={currentPage === 1}
					class="h-8 w-8 rounded-lg p-0"
					aria-label="Go to previous page"
				>
					<ChevronLeft class="h-4 w-4" />
				</Button>

				<!-- Page Numbers -->
				<div class="flex items-center space-x-1">
					{#each visiblePages as page}
						{#if page === '...'}
							<span class="px-2 py-1 text-sm text-muted-foreground">...</span>
						{:else}
							<Button
								variant={page === currentPage ? 'default' : 'ghost'}
								size="sm"
								onclick={() => onPageChange(page as number)}
								class="h-8 w-8 rounded-lg p-0"
								aria-label="Go to page {page}"
								aria-current={page === currentPage ? 'page' : undefined}
							>
								{page}
							</Button>
						{/if}
					{/each}
				</div>

				<!-- Next Page -->
				<Button
					variant="ghost"
					size="sm"
					onclick={goToNextPage}
					disabled={currentPage === totalPages}
					class="h-8 w-8 rounded-lg p-0"
					aria-label="Go to next page"
				>
					<ChevronRight class="h-4 w-4" />
				</Button>

				<!-- Last Page -->
				<Button
					variant="ghost"
					size="sm"
					onclick={goToLastPage}
					disabled={currentPage === totalPages}
					class="h-8 w-8 rounded-lg p-0"
					aria-label="Go to last page"
				>
					<ChevronsRight class="h-4 w-4" />
				</Button>
			</div>

			<!-- Page Info -->
			<div class="text-sm text-muted-foreground">
				Page {currentPage} of {totalPages}
			</div>
		{/if}
	</div>
</div>
