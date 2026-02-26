<script lang="ts">
	type LegacyTextareaProps = Record<string, unknown> & {
		id?: string;
		label?: string;
		value?: string;
		placeholder?: string;
		errorText?: string;
		helperText?: string;
		rows?: number;
		required?: boolean;
		class?: string;
	};

	let {
		id,
		label,
		value = $bindable(''),
		placeholder,
		errorText,
		helperText,
		rows = 3,
		required = false,
		class: className = '',
		...rest
	}: LegacyTextareaProps = $props();

	const fallbackId = `textarea-${Math.random().toString(36).slice(2, 10)}`;
	let textareaId = $derived(id || fallbackId);
</script>

<div class="space-y-1">
	{#if label}
		<label for={textareaId} class="block text-sm font-medium">{label}</label>
	{/if}
	<textarea
		id={textareaId}
		bind:value
		{placeholder}
		{rows}
		{required}
		class={className}
		aria-invalid={errorText ? 'true' : undefined}
		{...rest}
	></textarea>
	{#if errorText}
		<p class="text-sm text-red-600">{errorText}</p>
	{:else if helperText}
		<p class="text-sm text-gray-500">{helperText}</p>
	{/if}
</div>
