<script lang="ts">
	/**
	 * Pagination Component
	 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
	 * Task: T043
	 * Created: 2025-10-02
	 *
	 * Comprehensive pagination component with page size selection,
	 * page navigation, and jump-to-page functionality.
	 */

	import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/svelte';

	interface Props {
		currentPage: number;
		pageSize: number;
		totalCount: number;
		pageSizeOptions?: number[];
		onPageChange: (page: number) => void;
		onPageSizeChange: (pageSize: number) => void;
		showJumpToPage?: boolean;
		showPageSizeSelector?: boolean;
		maxVisiblePages?: number;
	}

	const {
		currentPage,
		pageSize,
		totalCount,
		pageSizeOptions = [10, 20, 50, 100],
		onPageChange,
		onPageSizeChange,
		showJumpToPage = true,
		showPageSizeSelector = true,
		maxVisiblePages = 5
	}: Props = $props();

	let jumpToPageInput = $state('');

	// Computed properties
	const totalPages = $derived(Math.ceil(totalCount / pageSize));
	const startIndex = $derived((currentPage - 1) * pageSize + 1);
	const endIndex = $derived(Math.min(currentPage * pageSize, totalCount));

	const canGoPrevious = $derived(currentPage > 1);
	const canGoNext = $derived(currentPage < totalPages);

	const visiblePages = $derived(() => {
		if (totalPages <= maxVisiblePages) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const pages: number[] = [];
		const halfVisible = Math.floor(maxVisiblePages / 2);

		let startPage = Math.max(1, currentPage - halfVisible);
		let endPage = Math.min(totalPages, currentPage + halfVisible);

		// Adjust if we're near the start or end
		if (currentPage <= halfVisible) {
			endPage = Math.min(totalPages, maxVisiblePages);
		} else if (currentPage >= totalPages - halfVisible) {
			startPage = Math.max(1, totalPages - maxVisiblePages + 1);
		}

		// Always show first page
		if (startPage > 1) {
			pages.push(1);
			if (startPage > 2) {
				pages.push(-1); // Ellipsis indicator
			}
		}

		// Add visible pages
		for (let i = startPage; i <= endPage; i++) {
			pages.push(i);
		}

		// Always show last page
		if (endPage < totalPages) {
			if (endPage < totalPages - 1) {
				pages.push(-1); // Ellipsis indicator
			}
			pages.push(totalPages);
		}

		return pages;
	});

	function handlePageChange(page: number) {
		if (page >= 1 && page <= totalPages && page !== currentPage) {
			onPageChange(page);
		}
	}

	function handlePageSizeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newPageSize = parseInt(target.value, 10);
		onPageSizeChange(newPageSize);
	}

	function handleFirstPage() {
		handlePageChange(1);
	}

	function handleLastPage() {
		handlePageChange(totalPages);
	}

	function handlePreviousPage() {
		handlePageChange(currentPage - 1);
	}

	function handleNextPage() {
		handlePageChange(currentPage + 1);
	}

	function handleJumpToPage(event: Event) {
		event.preventDefault();
		const pageNum = parseInt(jumpToPageInput, 10);

		if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
			handlePageChange(pageNum);
			jumpToPageInput = '';
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleJumpToPage(event);
		}
	}
</script>

<div class="pagination-container">
	{#if totalCount > 0}
		<!-- Page Size Selector -->
		{#if showPageSizeSelector}
			<div class="page-size-selector">
				<label for="page-size">Items per page:</label>
				<select
					id="page-size"
					value={pageSize}
					onchange={handlePageSizeChange}
					class="page-size-select"
				>
					{#each pageSizeOptions as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Pagination Info -->
		<div class="pagination-info">
			<span class="info-text">
				Showing <strong>{startIndex}</strong> to <strong>{endIndex}</strong> of
				<strong>{totalCount}</strong>
				{totalCount === 1 ? 'item' : 'items'}
			</span>
		</div>

		<!-- Pagination Controls -->
		<div class="pagination-controls">
			<!-- First Page Button -->
			<button
				type="button"
				class="pagination-btn"
				onclick={handleFirstPage}
				disabled={!canGoPrevious}
				aria-label="Go to first page"
				title="First page"
			>
				<ChevronsLeft size={16} />
			</button>

			<!-- Previous Page Button -->
			<button
				type="button"
				class="pagination-btn"
				onclick={handlePreviousPage}
				disabled={!canGoPrevious}
				aria-label="Go to previous page"
				title="Previous page"
			>
				<ChevronLeft size={16} />
			</button>

			<!-- Page Numbers -->
			<div class="page-numbers">
				{#each visiblePages() as page (page)}
					{#if page === -1}
						<span class="ellipsis">...</span>
					{:else}
						<button
							type="button"
							class="page-btn"
							class:active={page === currentPage}
							onclick={() => handlePageChange(page)}
							aria-label="Go to page {page}"
							aria-current={page === currentPage ? 'page' : undefined}
						>
							{page}
						</button>
					{/if}
				{/each}
			</div>

			<!-- Next Page Button -->
			<button
				type="button"
				class="pagination-btn"
				onclick={handleNextPage}
				disabled={!canGoNext}
				aria-label="Go to next page"
				title="Next page"
			>
				<ChevronRight size={16} />
			</button>

			<!-- Last Page Button -->
			<button
				type="button"
				class="pagination-btn"
				onclick={handleLastPage}
				disabled={!canGoNext}
				aria-label="Go to last page"
				title="Last page"
			>
				<ChevronsRight size={16} />
			</button>
		</div>

		<!-- Jump to Page -->
		{#if showJumpToPage && totalPages > maxVisiblePages}
			<div class="jump-to-page">
				<form onsubmit={handleJumpToPage}>
					<label for="jump-to-page-input">Go to:</label>
					<input
						type="number"
						id="jump-to-page-input"
						bind:value={jumpToPageInput}
						onkeydown={handleKeydown}
						min="1"
						max={totalPages}
						placeholder={String(currentPage)}
						class="jump-input"
					/>
					<button type="submit" class="jump-btn" disabled={!jumpToPageInput}>Go</button>
				</form>
			</div>
		{/if}
	{:else}
		<!-- Empty State -->
		<div class="pagination-empty">
			<span class="empty-text">No items to display</span>
		</div>
	{/if}
</div>

<style>
	.pagination-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		background-color: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		flex-wrap: wrap;
	}

	.page-size-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-size-selector label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.page-size-select {
		padding: 0.375rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		background-color: white;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.page-size-select:hover {
		border-color: #9ca3af;
	}

	.page-size-select:focus {
		outline: 2px solid rgba(59, 130, 246, 0.5);
		border-color: #3b82f6;
	}

	.pagination-info {
		display: flex;
		align-items: center;
		flex: 1;
	}

	.info-text {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.info-text strong {
		color: #111827;
		font-weight: 600;
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pagination-btn,
	.page-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		height: 2rem;
		padding: 0.375rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background-color: white;
		color: #374151;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.pagination-btn:hover:not(:disabled),
	.page-btn:hover:not(:disabled) {
		background-color: #f9fafb;
		border-color: #9ca3af;
	}

	.pagination-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-numbers {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.page-btn.active {
		background-color: #3b82f6;
		border-color: #3b82f6;
		color: white;
	}

	.page-btn.active:hover {
		background-color: #2563eb;
		border-color: #2563eb;
	}

	.ellipsis {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		height: 2rem;
		font-size: 0.875rem;
		color: #9ca3af;
	}

	.jump-to-page {
		display: flex;
		align-items: center;
	}

	.jump-to-page form {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.jump-to-page label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.jump-input {
		width: 4rem;
		padding: 0.375rem 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		text-align: center;
		transition: all 0.15s ease;
	}

	.jump-input:hover {
		border-color: #9ca3af;
	}

	.jump-input:focus {
		outline: 2px solid rgba(59, 130, 246, 0.5);
		border-color: #3b82f6;
	}

	/* Remove spinner arrows from number input */
	.jump-input::-webkit-inner-spin-button,
	.jump-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.jump-input[type='number'] {
		appearance: textfield;
		-moz-appearance: textfield;
	}

	.jump-btn {
		padding: 0.375rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background-color: white;
		color: #374151;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.jump-btn:hover:not(:disabled) {
		background-color: #f9fafb;
		border-color: #9ca3af;
	}

	.jump-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pagination-empty {
		width: 100%;
		text-align: center;
		padding: 1rem;
	}

	.empty-text {
		font-size: 0.875rem;
		color: #9ca3af;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.pagination-container {
			flex-direction: column;
			align-items: stretch;
		}

		.pagination-info {
			text-align: center;
			justify-content: center;
		}

		.pagination-controls {
			justify-content: center;
		}

		.page-size-selector {
			justify-content: center;
		}

		.jump-to-page {
			justify-content: center;
		}
	}
</style>
