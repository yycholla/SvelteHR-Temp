<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Save } from '@lucide/svelte';
	import type { OnboardingFormBlock, OnboardingFormBlockType } from '$lib/graphql/form-operations';
	import { blockTypes } from './utils';

	interface Props {
		open: boolean;
		editingBlock: OnboardingFormBlock | null;
		onSave: (data: any) => void;
		onCancel: () => void;
	}

	let { open = $bindable(), editingBlock, onSave, onCancel }: Props = $props();

	// Local state
	let blockType = $state<OnboardingFormBlockType>('TEXT');
	let blockTitle = $state('');
	let blockTextContent = $state('');
	let blockDocumentUrl = $state('');
	let blockFormTemplateId = $state('');
	let blockCheckboxItemsString = $state('');

	// Reset/Populate state when dialog opens or editingBlock changes
	$effect(() => {
		if (open) {
			if (editingBlock) {
				blockType = editingBlock.type;
				blockTitle = editingBlock.title || '';
				blockTextContent = editingBlock.textContent || '';
				blockDocumentUrl = editingBlock.documentUrl || '';
				blockFormTemplateId = editingBlock.formTemplateId || '';
				blockCheckboxItemsString = (editingBlock.checkboxItems || []).join('\n');
			} else {
				// Reset for new block
				// Only reset if we are opening, not if we are already open (to preserve input if re-rendered)
				// But since we use bind:open, this effect runs on open change.
				// However, if editingBlock changes while open (unlikely), we should update.
				// We can just rely on the parent to reset or set editingBlock correctly before opening.
				// But to be safe, if editingBlock is null, we set defaults.
                // Wait, if I type in new block, then close and reopen, it should be empty? Yes.
			}
		}
	});
    
    // We need to initialize state when open changes to true
    $effect(() => {
        if (open) {
             if (editingBlock) {
				blockType = editingBlock.type;
				blockTitle = editingBlock.title || '';
				blockTextContent = editingBlock.textContent || '';
				blockDocumentUrl = editingBlock.documentUrl || '';
				blockFormTemplateId = editingBlock.formTemplateId || '';
				blockCheckboxItemsString = (editingBlock.checkboxItems || []).join('\n');
            } else {
                blockType = 'TEXT';
                blockTitle = '';
                blockTextContent = '';
                blockDocumentUrl = '';
                blockFormTemplateId = '';
                blockCheckboxItemsString = '';
            }
        }
    });

	function handleSave() {
		const data = {
			type: blockType,
			title: blockTitle,
			textContent: blockTextContent,
			documentUrl: blockDocumentUrl,
			formTemplateId: blockFormTemplateId,
			checkboxItemsString: blockCheckboxItemsString
		};
		onSave(data);
	}
</script>

<Dialog bind:open>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle>{editingBlock ? 'Edit Block' : 'Add New Block'}</DialogTitle>
			<DialogDescription>
				{editingBlock ? 'Update the block details below' : 'Configure the new block'}
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			{#if !editingBlock}
				<div>
					<Label for="block-type">Block Type</Label>
					<Select type="single" bind:value={blockType}>
						<SelectTrigger id="block-type">
							<SelectValue placeholder="Select block type" />
						</SelectTrigger>
						<SelectContent>
							{#each blockTypes as type}
								<SelectItem value={type.value}>{type.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			{/if}

			<div>
				<Label for="block-title">Title (Optional)</Label>
				<Input id="block-title" bind:value={blockTitle} placeholder="Enter block title" />
			</div>

			{#if blockType === 'TEXT'}
				<div>
					<Label for="block-text">Text Content</Label>
					<Textarea
						id="block-text"
						bind:value={blockTextContent}
						placeholder="Enter text content"
						rows={6}
					/>
				</div>
			{:else if blockType === 'DOCUMENT'}
				<div>
					<Label for="block-document">Document URL</Label>
					<Input
						id="block-document"
						bind:value={blockDocumentUrl}
						placeholder="https://example.com/document.pdf"
					/>
				</div>
			{:else if blockType === 'FORM_FIELDS'}
				<div>
					<Label for="block-template">Form Template ID</Label>
					<Input
						id="block-template"
						bind:value={blockFormTemplateId}
						placeholder="Enter form template ID"
					/>
					<p class="text-xs text-gray-500 mt-1">Select a pre-configured form template</p>
				</div>
			{:else if blockType === 'CHECKBOX'}
				<div>
					<Label>Checkbox Items</Label>
					<p class="text-xs text-gray-500 mb-2">Add items that employees need to check off</p>
					<Textarea
						bind:value={blockCheckboxItemsString}
						placeholder="Enter items (one per line)"
						rows={4}
					/>
				</div>
			{/if}
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={onCancel}>Cancel</Button>
			<Button onclick={handleSave}>
				<Save class="w-4 h-4 mr-2" />
				{editingBlock ? 'Update' : 'Create'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
