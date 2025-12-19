<script lang="ts">
	/**
	 * Phone Input Field with Formsnap
	 */
	import { Field, Control, Label as FormLabel, FieldErrors } from 'formsnap';
	import type { SuperForm } from 'sveltekit-superforms';
	import { getContext } from 'svelte';
	import { Input } from '$lib/components/ui/input';

	interface Props {
		name: string;
		label?: string;
		required?: boolean;
		placeholder?: string;
	}

	let {
		name,
		label,
		required = false,
		placeholder = '(555) 123-4567'
	}: Props = $props();

	// Get form from context
	const form = getContext<SuperForm<Record<string, unknown>>>('form');
</script>

<Field {form} {name}>
	<Control>
		{#snippet children({ props })}
			<div class="space-y-2">
				{#if label}
					<FormLabel>
						{label}
						{#if required}
							<span class="text-red-500">*</span>
						{/if}
					</FormLabel>
				{/if}

				<Input
					{...props}
					type="tel"
					{placeholder}
					autocomplete="tel"
				/>

				<FieldErrors />
			</div>
		{/snippet}
	</Control>
</Field>
