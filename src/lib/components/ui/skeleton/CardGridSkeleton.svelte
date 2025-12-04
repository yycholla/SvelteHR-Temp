<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';

	const { cards = 6, columns = 3 }: { cards?: number; columns?: number } = $props();

	// Grid class based on columns
	const gridClass =
		{
			2: 'md:grid-cols-2',
			3: 'md:grid-cols-2 lg:grid-cols-3',
			4: 'md:grid-cols-2 lg:grid-cols-4',
			6: 'md:grid-cols-3 lg:grid-cols-6'
		}[columns] || 'md:grid-cols-2 lg:grid-cols-3';
</script>

<div class="grid grid-cols-1 {gridClass} gap-6">
	{#each Array(cards) as _}
		<Card.Root>
			<Card.Header>
				<div class="flex items-start justify-between">
					<div class="space-y-2 flex-1">
						<Skeleton class="h-5 w-3/4" />
						<Skeleton class="h-3 w-1/2" />
					</div>
					<Skeleton class="h-8 w-8 rounded-full" />
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					<Skeleton class="h-8 w-24" />
					<div class="flex items-center gap-2">
						<Skeleton class="h-4 w-16" />
						<Skeleton class="h-4 w-24" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
