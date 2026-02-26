<script lang="ts">
	interface LegacyOption {
		value: string;
		label: string;
	}

	type LegacySelectProps = Record<string, unknown> & {
		id?: string;
		label?: string;
		value?: string;
		options?: LegacyOption[];
		placeholder?: string;
		errorText?: string;
		helperText?: string;
		required?: boolean;
		class?: string;
	};

	let {
		id,
		label,
		value = $bindable(''),
		options = [],
		placeholder = 'Select an option',
		errorText,
		helperText,
		required = false,
		class: className = '',
		...rest
	}: LegacySelectProps = $props();

	const fallbackId = `select-${Math.random().toString(36).slice(2, 10)}`;
	let selectId = $derived(id || fallbackId);
</script>

<div class="space-y-1">
	{#if label}
		<label for={selectId} class="block text-sm font-medium">{label}</label>
	{/if}
	<select
		id={selectId}
		bind:value
		{required}
		class={className}
		aria-invalid={errorText ? 'true' : undefined}
		{...rest}
	>
		<option value="">{placeholder}</option>
		{#each options as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	{#if errorText}
		<p class="text-sm text-red-600">{errorText}</p>
	{:else if helperText}
		<p class="text-sm text-gray-500">{helperText}</p>
	{/if}
</div>
