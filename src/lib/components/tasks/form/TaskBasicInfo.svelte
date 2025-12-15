<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';

	interface Props {
		title: string;
		description: string;
		fieldErrors: Record<string, string>;
	}

	let { title = $bindable(), description = $bindable(), fieldErrors }: Props = $props();
</script>

<div class="space-y-4 rounded-lg border bg-card p-6">
	<h3 class="border-b pb-2 text-lg font-semibold">Basic Information</h3>

	<!-- Title -->
	<div class="space-y-2">
		<Label for="title">
			Task Title <span class="text-destructive">*</span>
		</Label>
		<Input
			id="title"
			bind:value={title}
			placeholder="Enter task title"
			class={fieldErrors.title ? 'border-destructive' : ''}
			maxlength={255}
			required
		/>
		{#if fieldErrors.title}
			<p class="text-sm text-destructive">{fieldErrors.title}</p>
		{/if}
	</div>

	<!-- Description -->
	<div class="space-y-2">
		<Label for="description">Description</Label>
		<Textarea
			id="description"
			bind:value={description}
			placeholder="Enter task description (optional)"
			class={fieldErrors.description ? 'border-destructive' : ''}
			rows={5}
			maxlength={5000}
		/>
		{#if fieldErrors.description}
			<p class="text-sm text-destructive">{fieldErrors.description}</p>
		{/if}
		<p class="text-xs text-muted-foreground">
			{description?.length || 0} / 5000 characters
		</p>
	</div>
</div>
