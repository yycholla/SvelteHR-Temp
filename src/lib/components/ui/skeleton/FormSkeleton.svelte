<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';

	const { fields = 6 }: { fields?: number } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Skeleton class="h-6 w-48 mb-2" />
		<Skeleton class="h-4 w-96" />
	</Card.Header>
	<Card.Content>
		<div class="space-y-6">
			{#each Array(fields) as _, index}
				<div class="space-y-2">
					<!-- Field label -->
					<Skeleton class="h-4 w-32" />
					<!-- Field input -->
					{#if index % 4 === 3}
						<!-- Textarea field (larger) -->
						<Skeleton class="h-24 w-full" />
					{:else if index % 4 === 2}
						<!-- Select/dropdown field -->
						<Skeleton class="h-10 w-full" />
					{:else}
						<!-- Regular input field -->
						<Skeleton class="h-10 w-full" />
					{/if}
				</div>
			{/each}

			<!-- Form actions -->
			<div class="flex gap-3 pt-4">
				<Skeleton class="h-10 w-24" />
				<Skeleton class="h-10 w-24" />
			</div>
		</div>
	</Card.Content>
</Card.Root>
