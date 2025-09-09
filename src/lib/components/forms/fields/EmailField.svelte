<script lang="ts">
	import type { FormField } from '$lib/forms/types';
	import { Input } from '$lib/components/ui/input';
	import BaseField from './BaseField.svelte';

	export let field: FormField;
	export let value: string = '';
	export let errors: string[] | undefined = undefined;
	export let constraints: any = undefined;
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
	<Input
		id={fieldId}
		name={field.name}
		type="email"
		bind:value
		{required}
		placeholder={placeholder || 'Enter email address'}
		aria-describedby={ariaDescribedBy}
		aria-invalid={hasError ? 'true' : 'false'}
		class:border-destructive={hasError}
	/>
</BaseField>
