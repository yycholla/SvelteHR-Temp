<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Edit, Save } from '@lucide/svelte';
	import type { OnboardingForm } from '$lib/graphql/form-operations';

	interface Props {
		form: OnboardingForm;
		editingForm: boolean;
		formTitle: string;
		formDescription: string;
		formIsRequired: boolean;
		onSave: () => void;
	}

	let {
		form,
		editingForm = $bindable(),
		formTitle = $bindable(),
		formDescription = $bindable(),
		formIsRequired = $bindable(),
		onSave
	}: Props = $props();
</script>

<Card class="mb-6 p-6">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-xl font-semibold">Form Settings</h2>
		{#if editingForm}
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={() => (editingForm = false)}>Cancel</Button>
				<Button size="sm" onclick={onSave}>
					<Save class="w-4 h-4 mr-2" />
					Save
				</Button>
			</div>
		{:else}
			<Button variant="outline" size="sm" onclick={() => (editingForm = true)}>
				<Edit class="w-4 h-4 mr-2" />
				Edit
			</Button>
		{/if}
	</div>

	{#if editingForm}
		<div class="space-y-4">
			<div>
				<Label for="form-title">Title</Label>
				<Input id="form-title" bind:value={formTitle} placeholder="Enter form title" />
			</div>
			<div>
				<Label for="form-description">Description</Label>
				<Textarea
					id="form-description"
					bind:value={formDescription}
					placeholder="Enter form description"
					rows={3}
				/>
			</div>
			<div class="flex items-center space-x-2">
				<Checkbox id="form-required" bind:checked={formIsRequired} />
				<Label for="form-required">Required form (employees must complete this)</Label>
			</div>
		</div>
	{:else}
		<div class="space-y-2">
			<div>
				<span class="text-sm text-gray-500">Title:</span>
				<p class="text-base font-medium">{form.title}</p>
			</div>
			{#if form.description}
				<div>
					<span class="text-sm text-gray-500">Description:</span>
					<p class="text-base">{form.description}</p>
				</div>
			{/if}
			<div>
				<span class="text-sm text-gray-500">Required:</span>
				<p class="text-base">{form.isRequired ? 'Yes' : 'No'}</p>
			</div>
		</div>
	{/if}
</Card>
