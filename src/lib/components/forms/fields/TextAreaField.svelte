<script lang="ts">
	import type { FormField } from '$lib/forms/types';
	import BaseField from './BaseField.svelte';

	export let field: FormField;
	export let value: string = '';
	export let errors: string[] | undefined = undefined;
	export let constraints: any = undefined;

	$: rows = field.ui_config?.size === 'small' ? 3 : field.ui_config?.size === 'large' ? 8 : 5; // default medium
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
	<textarea
		id={fieldId}
		name={field.name}
		bind:value
		{required}
		{placeholder}
		{rows}
		aria-describedby={ariaDescribedBy}
		aria-invalid={hasError ? 'true' : 'false'}
		class="resize-vertical flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		class:border-destructive={hasError}
	/>
</BaseField>
