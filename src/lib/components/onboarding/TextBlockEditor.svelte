<script lang="ts">
	/**
	 * Text Block Editor Dialog
	 * Dialog for adding or editing text blocks (instructions, context, contract language)
	 */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { FileText, Info, AlertTriangle, FileSignature } from '@lucide/svelte';
	import type { TextBlockDefinition, TextBlockStyle } from '$lib/graphql/form-operations';

	interface Props {
		open: boolean;
		textBlock?: TextBlockDefinition | null;
		onSave: (textBlock: TextBlockDefinition) => void;
		onCancel: () => void;
	}

	let { open = $bindable(false), textBlock = null, onSave, onCancel }: Props = $props();

	// Style options with descriptions
	const styleOptions: {
		value: TextBlockStyle;
		label: string;
		description: string;
		icon: typeof Info;
	}[] = [
		{
			value: 'plain',
			label: 'Plain',
			description: 'Regular text without special formatting',
			icon: FileText
		},
		{
			value: 'info',
			label: 'Information',
			description: 'Highlighted info box for helpful guidance',
			icon: Info
		},
		{
			value: 'warning',
			label: 'Warning',
			description: 'Warning box for important notices',
			icon: AlertTriangle
		},
		{
			value: 'contract',
			label: 'Contract/Legal',
			description: 'Formatted for contract language or legal text',
			icon: FileSignature
		}
	];

	// Form state
	let content = $state('');
	let style = $state<TextBlockStyle>('plain');

	// Error state
	let formErrors = $state<Record<string, string>>({});

	// Initialize form when textBlock changes
	$effect(() => {
		if (textBlock) {
			content = textBlock.content;
			style = textBlock.style || 'plain';
		} else {
			resetForm();
		}
	});

	function validateForm(): boolean {
		const errors: Record<string, string> = {};

		if (!content.trim()) {
			errors.content = 'Text content is required';
		} else if (content.trim().length < 3) {
			errors.content = 'Text content must be at least 3 characters';
		}

		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	function handleSave() {
		if (!validateForm()) {
			return;
		}

		const block: TextBlockDefinition = {
			elementType: 'TEXT_BLOCK',
			content: content.trim(),
			style
		};

		onSave(block);
		resetForm();
		open = false;
	}

	function handleCancel() {
		resetForm();
		onCancel();
		open = false;
	}

	function resetForm() {
		content = '';
		style = 'plain';
		formErrors = {};
	}

	const selectedStyleOption = $derived(styleOptions.find((s) => s.value === style));
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-primary/10 p-2">
					{#if selectedStyleOption}
						{@const Icon = selectedStyleOption.icon}
						<Icon class="h-5 w-5 text-primary" />
					{:else}
						<FileText class="h-5 w-5 text-primary" />
					{/if}
				</div>
				<div>
					<Dialog.Title>{textBlock ? 'Edit' : 'Add'} Text Block</Dialog.Title>
					<Dialog.Description>
						Add instructions, context, or contract language between form fields
					</Dialog.Description>
				</div>
			</div>
		</Dialog.Header>

		<div class="space-y-6">
			<!-- Style Selection -->
			<div class="space-y-2">
				<Label for="blockStyle">Style</Label>
				<select
					id="blockStyle"
					bind:value={style}
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#each styleOptions as styleOption}
						<option value={styleOption.value}>
							{styleOption.label} - {styleOption.description}
						</option>
					{/each}
				</select>
				<p class="text-sm text-muted-foreground">Choose how this text block should be displayed</p>
			</div>

			<!-- Content -->
			<div class="space-y-2">
				<Label for="blockContent">
					Content <span class="text-destructive">*</span>
				</Label>
				<Textarea
					id="blockContent"
					bind:value={content}
					placeholder="Enter instructions, context, or contract language here..."
					rows={8}
					class={formErrors.content ? 'border-destructive' : ''}
				/>
				{#if formErrors.content}
					<p class="text-sm text-destructive">{formErrors.content}</p>
				{:else}
					<p class="text-sm text-muted-foreground">
						This text will appear between form fields. You can use it to provide guidance, legal
						disclaimers, or contextual information.
					</p>
				{/if}
			</div>

			<!-- Preview -->
			{#if content.trim()}
				<div class="space-y-2">
					<Label>Preview</Label>
					<div
						class="rounded-lg p-4 {style === 'info'
							? 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800'
							: style === 'warning'
								? 'bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800'
								: style === 'contract'
									? 'bg-slate-50 border-2 border-slate-300 dark:bg-slate-900 dark:border-slate-700'
									: 'bg-muted border border-border'}"
					>
						<p class="text-sm whitespace-pre-wrap {style === 'contract' ? 'font-serif' : ''}">
							{content}
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Form Actions -->
		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={handleCancel}>Cancel</Button>
			<Button type="button" onclick={handleSave}>
				{textBlock ? 'Update' : 'Add'} Text Block
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
