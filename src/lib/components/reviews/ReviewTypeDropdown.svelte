<script lang="ts">
	/**
	 * ReviewTypeDropdown Component
	 * Feature: 023-reviews-creation-it
	 * Task: T033
	 *
	 * Dropdown selector for review types with metadata display
	 */
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { reviewTypes, type ReviewType } from '$lib/schemas/reviews';
	import type { ReviewTypeMetadata } from '$lib/schemas/reviews';

	// Props
	let {
		value = $bindable<ReviewType>(),
		disabled = false,
		error = '',
		label = 'Review Type',
		required = false,
		metadata = []
	}: {
		value?: ReviewType;
		disabled?: boolean;
		error?: string;
		label?: string;
		required?: boolean;
		metadata?: ReviewTypeMetadata[];
	} = $props();

	// Use metadata from props if provided, otherwise use local reviewTypes
	const typeOptions = $derived(
		metadata.length > 0
			? metadata.map((m) => ({
					value: m.value,
					label: m.label,
					description: m.description,
					displayOrder: m.displayOrder
				}))
			: reviewTypes.map((t) => ({
					value: t.value,
					label: t.label,
					description: t.description,
					displayOrder: t.displayOrder
				}))
	);

	// Selected option
	const selectedOption = $derived(typeOptions.find((opt) => opt.value === value));

	// Handle selection change
	function handleValueChange(newValue: string | undefined) {
		if (newValue) {
			value = newValue as ReviewType;
		}
	}
</script>

<div class="review-type-dropdown">
	{#if label}
		<Label for="review-type-select" class="mb-2">
			{label}
			{#if required}
				<span class="text-destructive">*</span>
			{/if}
		</Label>
	{/if}

	<Select.Root {disabled} onSelectedChange={(v) => handleValueChange(v?.value)}>
		<Select.Trigger id="review-type-select" class="w-full {error ? 'border-destructive' : ''}">
			<Select.Value placeholder="Select a review type">
				{#if selectedOption}
					<div class="flex items-center gap-2">
						<span class="text-2xl">{reviewTypes.find((t) => t.value === value)?.icon || '📋'}</span>
						<span>{selectedOption.label}</span>
					</div>
				{/if}
			</Select.Value>
		</Select.Trigger>

		<Select.Content>
			<Select.Group>
				{#each typeOptions as option (option.value)}
					<Select.Item value={option.value} class="cursor-pointer">
						<div class="flex flex-col gap-1 py-1">
							<div class="flex items-center gap-2">
								<span class="text-xl">
									{reviewTypes.find((t) => t.value === option.value)?.icon || '📋'}
								</span>
								<span class="font-medium">{option.label}</span>
							</div>
							<span class="text-xs text-muted-foreground ml-7">{option.description}</span>
						</div>
					</Select.Item>
				{/each}
			</Select.Group>
		</Select.Content>
	</Select.Root>

	{#if error}
		<p class="text-sm text-destructive mt-1">{error}</p>
	{/if}

	{#if selectedOption}
		<p class="text-sm text-muted-foreground mt-2">
			{selectedOption.description}
		</p>
	{/if}
</div>

<style>
	.review-type-dropdown {
		width: 100%;
	}
</style>
