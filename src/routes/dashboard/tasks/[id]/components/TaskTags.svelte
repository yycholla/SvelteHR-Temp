<script lang="ts">
	import { Plus, X } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';

	interface Props {
		tags: string[];
		taskType: { name: string } | null;
		onUpdateTags: (tags: string[]) => void;
	}

	let { tags = $bindable(), taskType, onUpdateTags }: Props = $props();

	let newTag = $state('');
	let isAddingTag = $state(false);

	function addTag() {
		if (!newTag.trim()) return;
		if (tags.includes(newTag.trim())) {
			newTag = '';
			return;
		}

		const updatedTags = [...tags, newTag.trim()];
		onUpdateTags(updatedTags);
		newTag = '';
		isAddingTag = false;
	}

	function removeTag(tagToRemove: string) {
		const updatedTags = tags.filter((t) => t !== tagToRemove);
		onUpdateTags(updatedTags);
	}
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
	<div class="flex flex-col space-y-1.5 border-b p-6">
		<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
	</div>
	<div class="p-6">
		<div class="flex flex-wrap gap-2">
			{#if taskType}
				<span
					class="inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
				>
					{taskType.name}
				</span>
			{/if}

			{#each tags as tag}
				<span
					class="inline-flex items-center rounded-full border border-transparent bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold transition-colors"
				>
					{tag}
					<button
						class="ml-1 hover:text-destructive focus:outline-none"
						onclick={() => removeTag(tag)}
					>
						<X class="h-3 w-3" />
					</button>
				</span>
			{/each}

			{#if isAddingTag}
				<div class="flex items-center">
					<Input
						bind:value={newTag}
						class="h-6 w-24 px-2 py-0 text-xs"
						autofocus
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								addTag();
							} else if (e.key === 'Escape') {
								isAddingTag = false;
								newTag = '';
							}
						}}
						onblur={() => {
							// Delay to allow click to register if needed, or just close
							setTimeout(() => {
								isAddingTag = false;
								newTag = '';
							}, 200);
						}}
					/>
				</div>
			{:else}
				<button
					class="inline-flex items-center rounded-full border border-dashed border-muted-foreground px-2.5 py-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
					onclick={() => (isAddingTag = true)}
				>
					<Plus class="mr-1 h-3 w-3" /> Add
				</button>
			{/if}
		</div>
	</div>
</div>
