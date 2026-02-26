<script lang="ts">
	type LegacyInputProps = Record<string, unknown> & {
		id?: string;
		type?: string;
		label?: string;
		value?: string | number;
		placeholder?: string;
		errorText?: string;
		helperText?: string;
		required?: boolean;
		class?: string;
	};

	let {
		id,
		type = 'text',
		label,
		value = $bindable(''),
		placeholder,
		errorText,
		helperText,
		required = false,
		class: className = '',
		...rest
	}: LegacyInputProps = $props();

	const fallbackId = `input-${Math.random().toString(36).slice(2, 10)}`;
	let inputId = $derived(id || fallbackId);
</script>

<div class="space-y-1">
	{#if label}
		<label for={inputId} class="block text-sm font-medium">{label}</label>
	{/if}
	<input
		id={inputId}
		{type}
		bind:value
		{placeholder}
		{required}
		class={className}
		aria-invalid={errorText ? 'true' : undefined}
		{...rest}
	/>
	{#if errorText}
		<p class="text-sm text-red-600">{errorText}</p>
	{:else if helperText}
		<p class="text-sm text-gray-500">{helperText}</p>
	{/if}
</div>
