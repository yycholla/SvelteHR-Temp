<script lang="ts">
	import { SignatureCanvas } from './index';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils';

	/**
	 * SignatureField - Form field wrapper for SignatureCanvas
	 *
	 * Provides form integration with label, validation, and error handling
	 */

	// Props
	let {
		name,
		label,
		description,
		required = false,
		disabled = false,
		error,
		value = $bindable(null),
		width = 400,
		height = 150,
		penColor = '#000000',
		penWidth = 2,
		backgroundColor = '#ffffff',
		placeholder = 'Sign here',
		class: className
	}: {
		name: string;
		label: string;
		description?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		value?: string | null;
		width?: number;
		height?: number;
		penColor?: string;
		penWidth?: number;
		backgroundColor?: string;
		placeholder?: string;
		class?: string;
	} = $props();

	// Signature canvas reference
	let signatureCanvas = $state<any>(null);

	// Handle signature change
	function handleSignatureChange(signature: string | null) {
		value = signature;
	}

	// Public API
	export function clear() {
		signatureCanvas?.clear();
	}

	export function getSignature(): string | null {
		return signatureCanvas?.getSignature() ?? null;
	}

	export function isEmpty(): boolean {
		return signatureCanvas?.isSignatureEmpty() ?? true;
	}
</script>

<div class={cn('space-y-2', className)}>
	<!-- Label -->
	<Label for={name} class="flex items-center gap-1">
		{label}
		{#if required}
			<span class="text-red-500">*</span>
		{/if}
	</Label>

	<!-- Description -->
	{#if description}
		<p class="text-sm text-gray-500">{description}</p>
	{/if}

	<!-- Signature Canvas -->
	<SignatureCanvas
		bind:this={signatureCanvas}
		{width}
		{height}
		{penColor}
		{penWidth}
		{backgroundColor}
		{placeholder}
		{required}
		{disabled}
		onSignatureChange={handleSignatureChange}
	/>

	<!-- Error message -->
	{#if error}
		<p class="text-sm text-red-500">{error}</p>
	{/if}

	<!-- Hidden input for form submission -->
	<input type="hidden" {name} value={value ?? ''} />
</div>
