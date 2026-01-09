<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	interface Props {
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
		dense?: boolean;
	}

	let { currentPage, totalPages, onPageChange, dense = false }: Props = $props();
</script>

{#if totalPages > 1}
	<div
		class={dense 
			? "flex items-center justify-between text-xs w-full"
			: "flex items-center justify-between border-t bg-card px-6 py-4 text-card-foreground"}
		data-testid="document-pagination"
	>
		<div class={dense ? "text-muted-foreground" : "text-sm text-muted-foreground"}>
			Page {currentPage} of {totalPages}
		</div>
		<div class="flex gap-2">
			<Button
				variant="outline"
				size="sm"
				disabled={currentPage <= 1}
				onclick={() => onPageChange(currentPage - 1)}
				class={dense ? "h-6 px-2 text-xs" : ""}
			>
				Previous
			</Button>

			{#if !dense}
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
			{/if}

			<Button
				variant="outline"
				size="sm"
				disabled={currentPage >= totalPages}
				onclick={() => onPageChange(currentPage + 1)}
				class={dense ? "h-6 px-2 text-xs" : ""}
			>
				Next
			</Button>
		</div>
	</div>
{/if}
