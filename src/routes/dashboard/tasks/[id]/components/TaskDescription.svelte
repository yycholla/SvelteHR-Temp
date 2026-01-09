<script lang="ts">
	interface Props {
		description: string | null;
	}

	const { description }: Props = $props();
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
	<div class="flex flex-col space-y-1.5 p-6 pb-4">
		<h3 class="text-lg font-semibold leading-none tracking-tight">Description</h3>
	</div>
	<div class="p-6 pt-0 text-sm leading-relaxed text-muted-foreground">
		{#if description}
			<div class="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
				{description}
			</div>
		{:else}
			<p class="italic text-muted-foreground">No description provided.</p>
		{/if}
	</div>
</div>
