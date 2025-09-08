<script lang="ts">
	import type { FormField } from '$lib/forms/types';
	import BaseField from './BaseField.svelte';

	export let field: FormField;
	export let value: string | string[] = field.type === 'multi_select' ? [] : '';
	export let errors: string[] | undefined = undefined;
	export let constraints: any = undefined;

	$: isMultiple = field.type === 'multi_select';
	$: options = field.options || [];

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;

		if (isMultiple) {
			const selectedOptions = Array.from(target.selectedOptions);
			value = selectedOptions.map((option) => option.value);
		} else {
			value = target.value;
		}
	}
</script>

<BaseField
	{field}
	{errors}
	{constraints}
	{value}
	let:fieldId
	let:ariaDescribedBy
	let:hasError
	let:required
	let:placeholder
>
	<select
		id={fieldId}
		name={field.name}
		{required}
		multiple={isMultiple}
		aria-describedby={ariaDescribedBy}
		aria-invalid={hasError ? 'true' : 'false'}
		on:change={handleChange}
		class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		class:border-destructive={hasError}
		class:h-auto={isMultiple}
		class:py-2={isMultiple}
	>
		{#if !isMultiple && !required}
			<option value="">
				{placeholder || `Select ${field.label.toLowerCase()}`}
			</option>
		{/if}

		{#each options as option}
			<option
				value={option.value}
				selected={isMultiple
					? Array.isArray(value) && value.includes(option.value)
					: value === option.value}
			>
				{option.label}
			</option>
		{/each}
	</select>

	{#if isMultiple && field.ui_config?.help_text}
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
			Hold Ctrl/Cmd to select multiple options
		</p>
	{/if}
</BaseField>
