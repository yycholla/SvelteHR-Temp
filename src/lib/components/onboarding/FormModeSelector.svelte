<script lang="ts">
	/**
	 * Form Mode Selector
	 * Radio group for selecting between template and custom form modes
	 */
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { FileText, Hammer } from '@lucide/svelte';

	interface Props {
		mode: 'template' | 'custom';
		onModeChange: (mode: 'template' | 'custom') => void;
		disabled?: boolean;
	}

	let { mode = $bindable('template'), onModeChange, disabled = false }: Props = $props();

	function handleModeChange(newMode: 'template' | 'custom') {
		if (!disabled) {
			onModeChange(newMode);
		}
	}
</script>

<div class="space-y-3">
	<div>
		<h3 class="text-sm font-medium mb-1">Form Type</h3>
		<p class="text-sm text-muted-foreground">Choose how to create this form block</p>
	</div>

	<RadioGroup bind:value={mode} class="space-y-3" {disabled}>
		<div
			role="button"
			tabindex="0"
			class="flex items-start space-x-3 rounded-lg border p-4 {mode === 'template'
				? 'border-primary bg-primary/5'
				: ''} hover:border-primary/50 transition-colors cursor-pointer"
			onclick={() => handleModeChange('template')}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleModeChange('template');
				}
			}}
		>
			<RadioGroupItem value="template" id="mode-template" {disabled} />
			<div class="flex-1">
				<div class="flex items-center gap-2 mb-1">
					<FileText class="h-4 w-4 text-primary" />
					<Label for="mode-template" class="cursor-pointer font-medium">Use Template</Label>
				</div>
				<p class="text-sm text-muted-foreground">
					Select from pre-built form templates with predefined fields and validation.
				</p>
			</div>
		</div>

		<div
			role="button"
			tabindex="0"
			class="flex items-start space-x-3 rounded-lg border p-4 {mode === 'custom'
				? 'border-primary bg-primary/5'
				: ''} hover:border-primary/50 transition-colors cursor-pointer"
			onclick={() => handleModeChange('custom')}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleModeChange('custom');
				}
			}}
		>
			<RadioGroupItem value="custom" id="mode-custom" {disabled} />
			<div class="flex-1">
				<div class="flex items-center gap-2 mb-1">
					<Hammer class="h-4 w-4 text-primary" />
					<Label for="mode-custom" class="cursor-pointer font-medium">Build Custom Form</Label>
				</div>
				<p class="text-sm text-muted-foreground">
					Create a custom form by adding and configuring fields individually. You can optionally
					save it as a template later.
				</p>
			</div>
		</div>
	</RadioGroup>
</div>
