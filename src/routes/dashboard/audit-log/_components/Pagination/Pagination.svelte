<!-- Pagination Component -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';

	interface PaginationProps {
		currentPage: number;
		totalPages: number;
		pageSize: number;
		totalItems: number;
		onPageChange: (page: number) => void;
		onPageSizeChange: (size: number) => void;
		pageSizeOptions?: number[];
	}

	let {
		currentPage,
		totalPages,
		pageSize,
		totalItems,
		onPageChange,
		onPageSizeChange,
		pageSizeOptions = [10, 20, 50, 100]
	}: PaginationProps = $props();

	let isPrevDisabled = $derived(currentPage === 1);
	let isNextDisabled = $derived(currentPage === totalPages || totalPages === 0);
	let jumpToPageValue = $state('');

	// Calculate item range display
	let startIndex = $derived((currentPage - 1) * pageSize + 1);
	let endIndex = $derived(Math.min(currentPage * pageSize, totalItems));

	function handleJumpToPage() {
		const pageNum = Number.parseInt(jumpToPageValue, 10);
		if (!Number.isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
			onPageChange(pageNum);
			jumpToPageValue = '';
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleJumpToPage();
		}
	}

	function handlePageSizeChange(v: string) {
		const nextPageSize = Number(v);
		if (!Number.isNaN(nextPageSize)) {
			onPageSizeChange(nextPageSize);
			onPageChange(1);
		}
	}
</script>

<nav
	class="pagination flex items-center justify-between gap-4 p-4 border-t"
	aria-label="Pagination navigation"
>
	<!-- Total count display -->
	<div class="text-sm text-gray-600">
		{#if totalItems === 0}
			No items
		{:else}
			Showing {startIndex} to {endIndex} of {totalItems} items
		{/if}
	</div>

	<!-- Navigation buttons -->
	<div class="flex items-center gap-2">
		<Button
			variant="outline"
			size="sm"
			disabled={isPrevDisabled}
			onclick={() => onPageChange(1)}
			aria-label="Go to first page"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
				/>
			</svg>
			First
		</Button>
		<Button
			variant="outline"
			size="sm"
			disabled={isPrevDisabled}
			onclick={() => onPageChange(currentPage - 1)}
			aria-label="Go to previous page"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Prev
		</Button>
		<span
			class="text-sm px-3"
			aria-current="page"
			aria-label={`Page ${currentPage} of ${totalPages}`}
		>
			Page {currentPage} of {totalPages}
		</span>
		<Button
			variant="outline"
			size="sm"
			disabled={isNextDisabled}
			onclick={() => onPageChange(currentPage + 1)}
			aria-label="Go to next page"
		>
			Next
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</Button>
		<Button
			variant="outline"
			size="sm"
			disabled={isNextDisabled}
			onclick={() => onPageChange(totalPages)}
			aria-label="Go to last page"
		>
			Last
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 5l7 7-7 7M5 5l7 7-7 7"
				/>
			</svg>
		</Button>
	</div>

	<!-- Jump to page input -->
	<div class="flex items-center gap-2">
		<label for="jump-to-page" class="text-sm text-gray-600">Jump to page:</label>
		<Input
			id="jump-to-page"
			type="number"
			min="1"
			max={totalPages}
			bind:value={jumpToPageValue}
			onkeypress={handleKeyPress}
			class="w-20"
			placeholder="1"
		/>
		<Button variant="outline" size="sm" onclick={handleJumpToPage} disabled={!jumpToPageValue}>
			Go
		</Button>
	</div>

	<!-- Page size selector -->
	<div class="flex items-center gap-2">
		<label for="page-size" class="text-sm text-gray-600">Items per page:</label>
		<Select.Root type="single" value={String(pageSize)} onValueChange={handlePageSizeChange}>
			<Select.Trigger id="page-size" class="w-32">
				<Select.Value placeholder={`${pageSize} / page`} />
			</Select.Trigger>
			<Select.Content>
				{#each pageSizeOptions as option}
					<Select.Item value={String(option)}>{option} / page</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
</nav>
