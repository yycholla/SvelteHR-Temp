<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle
	} from '$lib/components/ui/alert-dialog';
	import type { OnboardingForm, OnboardingFormBlock } from '$lib/graphql/form-operations';
	import { toast } from 'svelte-sonner';
	
	// Import decomposed components
	import FormBuilderHeader from '$lib/components/forms/builder/FormBuilderHeader.svelte';
	import FormMetadataEditor from '$lib/components/forms/builder/FormMetadataEditor.svelte';
	import BlockList from '$lib/components/forms/builder/BlockList.svelte';
	import FormPreview from '$lib/components/forms/builder/FormPreview.svelte';
	import BlockDialog from '$lib/components/forms/builder/BlockDialog.svelte';

	const { data } = $props();

	// State
	const form = $state<OnboardingForm>(data.form);
	let blocks = $state<OnboardingFormBlock[]>(
		[...(data.form.blocks || [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
	);
	let editingForm = $state(false);
	let previewMode = $state(false);
	let showBlockDialog = $state(false);
	let showDeleteDialog = $state(false);
	let editingBlock = $state<OnboardingFormBlock | null>(null);
	let deletingBlockId = $state<string | null>(null);

	// Form metadata state
	let formTitle = $state(form.title);
	let formDescription = $state(form.description || '');
	let formIsRequired = $state(form.isRequired);

	// Open block dialog for creating/editing
	function openBlockDialog(block?: OnboardingFormBlock) {
		editingBlock = block || null;
		showBlockDialog = true;
	}

	// Close block dialog and reset state
	function closeBlockDialog() {
		showBlockDialog = false;
		editingBlock = null;
	}

	// Save block (create or update)
	async function saveBlock(blockData: any) {
		const formData = new FormData();
		const isEditing = !!editingBlock;

		if (isEditing) {
			formData.append('id', editingBlock!.id);
		} else {
			formData.append('onboardingFormId', form.id);
			formData.append('type', blockData.type);
			formData.append('sequenceOrder', blocks.length.toString());
		}

		formData.append('title', blockData.title);

		// Add type-specific data
		if (blockData.type === 'TEXT' && blockData.textContent) {
			formData.append('textContent', blockData.textContent);
		} else if (blockData.type === 'DOCUMENT' && blockData.documentUrl) {
			formData.append('documentUrl', blockData.documentUrl);
		} else if (blockData.type === 'FORM_FIELDS' && blockData.formTemplateId) {
			formData.append('formTemplateId', blockData.formTemplateId);
		} else if (blockData.type === 'CHECKBOX') {
			// Parse checkbox items from string
			const items = blockData.checkboxItemsString
				.split('\n')
				.map((item: string) => item.trim())
				.filter((item: string) => item.length > 0);

			if (items.length > 0) {
				formData.append('checkboxItems', JSON.stringify(items));
			}
		}

		const response = await fetch('', {
			method: 'POST',
			body: formData,
			headers: {
				'x-sveltekit-action': isEditing ? 'updateBlock' : 'createBlock'
			}
		});

		if (response.ok) {
			toast.success(isEditing ? 'Block updated successfully' : 'Block created successfully');
			await invalidateAll();
			closeBlockDialog();
		} else {
			toast.error(isEditing ? 'Failed to update block' : 'Failed to create block');
		}
	}

	// Delete block
	function confirmDeleteBlock(blockId: string) {
		deletingBlockId = blockId;
		showDeleteDialog = true;
	}

	async function deleteBlock() {
		if (!deletingBlockId) return;

		const formData = new FormData();
		formData.append('id', deletingBlockId);

		const response = await fetch('', {
			method: 'POST',
			body: formData,
			headers: {
				'x-sveltekit-action': 'deleteBlock'
			}
		});

		if (response.ok) {
			toast.success('Block deleted successfully');
			await invalidateAll();
			showDeleteDialog = false;
			deletingBlockId = null;
		} else {
			toast.error('Failed to delete block');
		}
	}

	// Move block up/down
	async function moveBlock(index: number, direction: 'up' | 'down') {
		if (
			(direction === 'up' && index === 0) ||
			(direction === 'down' && index === blocks.length - 1)
		) {
			return;
		}

		const newBlocks = [...blocks];
		const swapIndex = direction === 'up' ? index - 1 : index + 1;
		[newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];

		const blockIds = newBlocks.map((b) => b.id);
		const formData = new FormData();
		formData.append('onboardingFormId', form.id);
		formData.append('blockIds', JSON.stringify(blockIds));

		const response = await fetch('', {
			method: 'POST',
			body: formData,
			headers: {
				'x-sveltekit-action': 'reorderBlocks'
			}
		});

		if (response.ok) {
			blocks = newBlocks;
			toast.success('Blocks reordered successfully');
			await invalidateAll();
		} else {
			toast.error('Failed to reorder blocks');
		}
	}

	// Save form metadata
	async function saveFormMetadata() {
		const formData = new FormData();
		formData.append('id', form.id);
		formData.append('title', formTitle);
		formData.append('description', formDescription);
		formData.append('isRequired', formIsRequired.toString());

		const response = await fetch('', {
			method: 'POST',
			body: formData,
			headers: {
				'x-sveltekit-action': 'updateForm'
			}
		});

		if (response.ok) {
			toast.success('Form updated successfully');
			editingForm = false;
			await invalidateAll();
		} else {
			toast.error('Failed to update form');
		}
	}
</script>

<div class="container mx-auto p-6 max-w-6xl">
	<FormBuilderHeader
		{previewMode}
		onTogglePreview={() => (previewMode = !previewMode)}
	/>

	{#if !previewMode}
		<FormMetadataEditor
			{form}
			bind:editingForm
			bind:formTitle
			bind:formDescription
			bind:formIsRequired
			onSave={saveFormMetadata}
		/>

		<BlockList
			{blocks}
			onAddBlock={() => openBlockDialog()}
			onEditBlock={openBlockDialog}
			onDeleteBlock={confirmDeleteBlock}
			onMoveBlock={moveBlock}
		/>
	{:else}
		<FormPreview
			{form}
			{blocks}
		/>
	{/if}
</div>

<!-- Block Dialog -->
<BlockDialog
	bind:open={showBlockDialog}
	{editingBlock}
	onSave={saveBlock}
	onCancel={closeBlockDialog}
/>

<!-- Delete Confirmation Dialog -->
<AlertDialog bind:open={showDeleteDialog}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete Block</AlertDialogTitle>
			<AlertDialogDescription>
				Are you sure you want to delete this block? This action cannot be undone.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel onclick={() => (showDeleteDialog = false)}>Cancel</AlertDialogCancel>
			<AlertDialogAction onclick={deleteBlock} class="bg-red-600 hover:bg-red-700">
				Delete
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>