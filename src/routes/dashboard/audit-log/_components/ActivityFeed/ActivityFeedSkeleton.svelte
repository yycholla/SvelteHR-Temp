<script lang="ts">
	interface SkeletonProps {
		count?: number;
	}

	let { count = 3 }: SkeletonProps = $props();
</script>

<div class="activity-feed-skeleton">
	{#each Array(count) as _, i (i)}
		<div class="skeleton-item border-b p-4 animate-pulse">
			<div class="mb-2 flex justify-between">
				<div class="h-4 w-32 rounded bg-gray-200"></div>
				<div class="h-4 w-24 rounded bg-gray-200"></div>
			</div>
			<div class="mb-2 h-3 w-full rounded bg-gray-200"></div>
			<div class="h-3 w-3/4 rounded bg-gray-200"></div>
		</div>
	{/each}
</div>
