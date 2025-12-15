<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	interface Props {
		currentPage: number;
		totalPages: number;
		totalDepartments: number;
		pageSize: string;
		hasPreviousPage: boolean;
		hasNextPage: boolean;
		onPageChange: (page: number) => void;
	}

	let {
		currentPage,
		totalPages,
		totalDepartments,
		pageSize,
		hasPreviousPage,
		hasNextPage,
		onPageChange
	}: Props = $props();

	// Variable for variant 'outline' string to avoid Svelte error if it treats it as variable
	const outline = 'outline';
</script>

<Card.Root>
	<Card.Content class="py-4">
		<div class="flex items-center justify-between">
			<div class="text-sm text-muted-foreground">
				Showing {(currentPage - 1) * Number(pageSize) + 1} to {Math.min(
					currentPage * Number(pageSize),
					totalDepartments
				)} of {totalDepartments} departments
			</div>
			<div class="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={!hasPreviousPage}
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
					variant={outline}
					size="sm"
					disabled={!hasNextPage}
					onclick={() => onPageChange(currentPage + 1)}
				>
					Next
				</Button>
			</div>
		</div>
	</Card.Content>
</Card.Root>


