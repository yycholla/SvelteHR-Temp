<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';

	const { rows = 5, columns = 4 }: { rows?: number; columns?: number } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Skeleton class="h-6 w-48 mb-2" />
		<Skeleton class="h-4 w-64" />
	</Card.Header>
	<Card.Content>
		<div class="space-y-3">
			<!-- Table header skeleton -->
			<div class="flex gap-4 pb-2 border-b">
				{#each Array(columns) as _}
					<Skeleton class="h-4 flex-1" />
				{/each}
			</div>

			<!-- Table rows skeleton -->
			{#each Array(rows) as _, rowIndex}
				<div class="flex gap-4 items-center py-2">
					{#each Array(columns) as _, colIndex}
						{#if colIndex === 0}
							<!-- First column - typically avatar or icon -->
							<Skeleton class="h-10 w-10 rounded-full flex-shrink-0" />
						{:else if colIndex === columns - 1}
							<!-- Last column - typically actions -->
							<Skeleton class="h-8 w-20 ml-auto" />
						{:else}
							<!-- Middle columns - text content -->
							<Skeleton class="h-4 flex-1" />
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	</Card.Content>
</Card.Root>
