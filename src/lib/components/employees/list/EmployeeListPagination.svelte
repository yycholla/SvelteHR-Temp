<script lang="ts">
	interface Props {
		currentPage: number;
		totalPages: number;
		totalCount: number;
		onPageChange: (page: number) => void;
	}

	const { currentPage, totalPages, totalCount, onPageChange }: Props = $props();
</script>

<div class="pagination">
	<button
		class="btn-secondary"
		disabled={currentPage === 1}
		onclick={() => onPageChange(currentPage - 1)}
	>
		Previous
	</button>
	<span class="page-info">
		Page {currentPage} of {totalPages} ({totalCount} total)
	</span>
	<button
		class="btn-secondary"
		disabled={currentPage === totalPages}
		onclick={() => onPageChange(currentPage + 1)}
	>
		Next
	</button>
</div>

<style>
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		padding: var(--cds-spacing-06) 0;
	}

	.page-info {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.btn-secondary {
		background-color: white;
		color: #374151;
		border-color: #d1d5db;
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
		border-radius: 0.375rem;
		border: 1px solid #d1d5db;
		cursor: pointer;
	}

	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
