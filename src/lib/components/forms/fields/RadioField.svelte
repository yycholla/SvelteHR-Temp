<script lang="ts">
	import type { FormField } from '$lib/forms/types';
	import BaseField from './BaseField.svelte';

	export let field: FormField;
	export let value: string = '';
	export let errors: string[] | undefined = undefined;
	export let constraints: any = undefined;

	$: options = field.options || [];
	$: isInline = field.ui_config?.variant === 'inline';
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
>
	<fieldset
		aria-describedby={ariaDescribedBy}
		aria-invalid={hasError ? 'true' : 'false'}
		class="radio-group"
		class:inline={isInline}
	>
		<legend class="sr-only">{field.label}</legend>

		<div class="radio-options" class:flex-row={isInline} class:flex-col={!isInline}>
			{#each options as option, index}
				<div class="radio-option">
					<input
						type="radio"
						id="{fieldId}_{index}"
						name={field.name}
						value={option.value}
						bind:group={value}
						{required}
						class="radio-input h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary dark:border-gray-600"
					/>
					<label
						for="{fieldId}_{index}"
						class="radio-label ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						{option.label}
						{#if option.description}
							<span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">
								{option.description}
							</span>
						{/if}
					</label>
				</div>
			{/each}
		</div>
	</fieldset>
</BaseField>

<style>
	.radio-group {
		border: none;
		padding: 0;
		margin: 0;
	}

	.radio-options {
		display: flex;
		gap: 1rem;
	}

	.radio-options.flex-col {
		flex-direction: column;
	}

	.radio-options.flex-row {
		flex-direction: row;
		flex-wrap: wrap;
	}

	.radio-option {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.radio-input {
		margin-top: 0.125rem; /* Align with first line of label text */
	}

	.radio-label {
		cursor: pointer;
		line-height: 1.4;
	}

	@media (max-width: 640px) {
		.radio-options.flex-row {
			flex-direction: column;
		}
	}
</style>
