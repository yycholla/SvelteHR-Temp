<script lang="ts">
	/**
	 * Text Input Field with Formsnap
	 */
	import { Field, Control, Label as FormLabel, FieldErrors } from 'formsnap';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { SuperForm } from 'sveltekit-superforms';
	import { getContext } from 'svelte';

	interface Props {
		name: string;
		label?: string;
		required?: boolean;
		placeholder?: string;
		multiline?: boolean;
		rows?: number;
	}

	let {
		name,
		label,
		required = false,
		placeholder,
		multiline = false,
		rows = 4
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

				{#if multiline}
					<Textarea
						{...props}
						{placeholder}
						{rows}
						class="resize-none"
					/>
				{:else}
					<Input
						{...props}
						type="text"
						{placeholder}
					/>
				{/if}

				<FieldErrors />
			</div>
		{/snippet}
	</Control>
</Field>
