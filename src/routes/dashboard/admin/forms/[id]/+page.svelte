<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
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
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		CheckSquare,
		ChevronDown,
		ChevronUp,
		Edit,
		Eye,
		FileIcon,
		FileText,
		FormInput,
		GripVertical,
		PenTool,
		Plus,
		Save,
		Trash2,
		Upload
	} from '@lucide/svelte';
	import type {
		OnboardingForm,
		OnboardingFormBlock,
		OnboardingFormBlockType
	} from '$lib/graphql/form-operations';
	import { toast } from 'svelte-sonner';

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

	// Block editor state
	let blockType = $state<OnboardingFormBlockType>('TEXT');
	let blockTitle = $state('');
	let blockTextContent = $state('');
	let blockDocumentUrl = $state('');
	let blockFormTemplateId = $state('');
	let blockCheckboxItems = $state<string[]>([]);

	// Block type configuration
	const blockTypes = [
		{ value: 'TEXT', label: 'Text Content', icon: FileText },
		{ value: 'FORM_FIELDS', label: 'Form Fields', icon: FormInput },
		{ value: 'DOCUMENT', label: 'Document', icon: FileIcon },
		{ value: 'FILE_UPLOAD', label: 'File Upload', icon: Upload },
		{ value: 'SIGNATURE', label: 'Signature', icon: PenTool },
		{ value: 'CHECKBOX', label: 'Checkbox List', icon: CheckSquare }
	];

	// Get icon for block type
	function getBlockIcon(type: OnboardingFormBlockType) {
		const blockType = blockTypes.find((bt) => bt.value === type);
		return blockType ? blockType.icon : FileText;
	}

	// Open block dialog for creating/editing
	function openBlockDialog(block?: OnboardingFormBlock) {
		editingBlock = block || null;
		if (block) {
			blockType = block.type;
			blockTitle = block.title || '';
			blockTextContent = block.textContent || '';
			blockDocumentUrl = block.documentUrl || '';
			blockFormTemplateId = block.formTemplateId || '';
			blockCheckboxItems = block.checkboxItems || [];
		} else {
			blockType = 'TEXT';
			blockTitle = '';
			blockTextContent = '';
			blockDocumentUrl = '';
			blockFormTemplateId = '';
			blockCheckboxItems = [];
		}
		showBlockDialog = true;
	}

	// Close block dialog and reset state
	function closeBlockDialog() {
		showBlockDialog = false;
		editingBlock = null;
		blockType = 'TEXT';
		blockTitle = '';
		blockTextContent = '';
		blockDocumentUrl = '';
		blockFormTemplateId = '';
		blockCheckboxItems = [];
	}

	// Save block (create or update)
	async function saveBlock() {
		const formData = new FormData();
		const isEditing = !!editingBlock;

		if (isEditing) {
			formData.append('id', editingBlock!.id);
		} else {
			formData.append('onboardingFormId', form.id);
			formData.append('type', blockType);
			formData.append('sequenceOrder', blocks.length.toString());
		}

		formData.append('title', blockTitle);

		// Add type-specific data
		if (blockType === 'TEXT' && blockTextContent) {
			formData.append('textContent', blockTextContent);
		} else if (blockType === 'DOCUMENT' && blockDocumentUrl) {
			formData.append('documentUrl', blockDocumentUrl);
		} else if (blockType === 'FORM_FIELDS' && blockFormTemplateId) {
			formData.append('formTemplateId', blockFormTemplateId);
		} else if (blockType === 'CHECKBOX' && blockCheckboxItems.length > 0) {
			formData.append('checkboxItems', JSON.stringify(blockCheckboxItems));
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
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
				{previewMode ? 'Form Preview' : 'Form Builder'}
			</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
				{previewMode ? 'Preview how employees will see this form' : 'Build and manage form blocks'}
			</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={() => (previewMode = !previewMode)}>
				<Eye class="w-4 h-4 mr-2" />
				{previewMode ? 'Exit Preview' : 'Preview'}
			</Button>
		</div>
	</div>

	{#if !previewMode}
		<!-- Form Metadata Editor -->
		<Card class="mb-6 p-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold">Form Settings</h2>
				{#if editingForm}
					<div class="flex gap-2">
						<Button variant="outline" size="sm" onclick={() => (editingForm = false)}>
							Cancel
						</Button>
						<Button size="sm" onclick={saveFormMetadata}>
							<Save class="w-4 h-4 mr-2" />
							Save
						</Button>
					</div>
				{:else}
					<Button variant="outline" size="sm" onclick={() => (editingForm = true)}>
						<Edit class="w-4 h-4 mr-2" />
						Edit
					</Button>
				{/if}
			</div>

			{#if editingForm}
				<div class="space-y-4">
					<div>
						<Label for="form-title">Title</Label>
						<Input id="form-title" bind:value={formTitle} placeholder="Enter form title" />
					</div>
					<div>
						<Label for="form-description">Description</Label>
						<Textarea
							id="form-description"
							bind:value={formDescription}
							placeholder="Enter form description"
							rows={3}
						/>
					</div>
					<div class="flex items-center space-x-2">
						<Checkbox id="form-required" bind:checked={formIsRequired} />
						<Label for="form-required">Required form (employees must complete this)</Label>
					</div>
				</div>
			{:else}
				<div class="space-y-2">
					<div>
						<span class="text-sm text-gray-500">Title:</span>
						<p class="text-base font-medium">{form.title}</p>
					</div>
					{#if form.description}
						<div>
							<span class="text-sm text-gray-500">Description:</span>
							<p class="text-base">{form.description}</p>
						</div>
					{/if}
					<div>
						<span class="text-sm text-gray-500">Required:</span>
						<p class="text-base">{form.isRequired ? 'Yes' : 'No'}</p>
					</div>
				</div>
			{/if}
		</Card>

		<!-- Blocks List -->
		<Card class="p-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold">Form Blocks</h2>
				<Button onclick={() => openBlockDialog()}>
					<Plus class="w-4 h-4 mr-2" />
					Add Block
				</Button>
			</div>

			{#if blocks.length === 0}
				<div class="text-center py-12 text-gray-500">
					<FileText class="w-16 h-16 mx-auto mb-4 text-gray-400" />
					<p class="text-lg mb-2">No blocks yet</p>
					<p class="text-sm">Add your first block to start building the form</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each blocks as block, index}
						{@const BlockIcon = getBlockIcon(block.type)}
						<div
							class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
						>
							<!-- Drag handle -->
							<div class="text-gray-400">
								<GripVertical class="w-5 h-5" />
							</div>

							<!-- Block icon and info -->
							<div class="flex-1 flex items-center gap-3">
								<div class="p-2 bg-white dark:bg-gray-700 rounded">
									<BlockIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
								</div>
								<div>
									<h3 class="font-medium text-sm">
										{block.title || `${block.type} Block`}
									</h3>
									<p class="text-xs text-gray-500">
										{blockTypes.find((bt) => bt.value === block.type)?.label || block.type}
									</p>
								</div>
							</div>

							<!-- Actions -->
							<div class="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => moveBlock(index, 'up')}
									disabled={index === 0}
								>
									<ChevronUp class="w-4 h-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => moveBlock(index, 'down')}
									disabled={index === blocks.length - 1}
								>
									<ChevronDown class="w-4 h-4" />
								</Button>
								<Button variant="ghost" size="sm" onclick={() => openBlockDialog(block)}>
									<Edit class="w-4 h-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => confirmDeleteBlock(block.id)}
									class="text-red-600 hover:text-red-700"
								>
									<Trash2 class="w-4 h-4" />
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	{:else}
		<!-- Preview Mode -->
		<Card class="p-8">
			<div class="max-w-3xl mx-auto">
				<h2 class="text-2xl font-bold mb-2">{form.title}</h2>
				{#if form.description}
					<p class="text-gray-600 dark:text-gray-400 mb-6">{form.description}</p>
				{/if}

				<div class="space-y-6">
					{#each blocks as block}
						{@const BlockIcon = getBlockIcon(block.type)}
						<div class="border-l-4 border-blue-500 pl-4">
							<div class="flex items-center gap-2 mb-2">
								<BlockIcon class="w-5 h-5 text-blue-500" />
								{#if block.title}
									<h3 class="font-semibold">{block.title}</h3>
								{/if}
							</div>

							{#if block.type === 'TEXT' && block.textContent}
								<div class="prose dark:prose-invert">
									{block.textContent}
								</div>
							{:else if block.type === 'DOCUMENT' && block.documentUrl}
								<a
									href={block.documentUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-blue-600 hover:underline"
								>
									View Document
								</a>
							{:else if block.type === 'FORM_FIELDS'}
								<p class="text-sm text-gray-500">Form fields will be rendered here</p>
							{:else if block.type === 'FILE_UPLOAD'}
								<p class="text-sm text-gray-500">File upload widget will be rendered here</p>
							{:else if block.type === 'SIGNATURE'}
								<p class="text-sm text-gray-500">Signature pad will be rendered here</p>
							{:else if block.type === 'CHECKBOX' && block.checkboxItems}
								<div class="space-y-2">
									{#each block.checkboxItems as item}
										<div class="flex items-center gap-2">
											<Checkbox disabled />
											<label class="text-sm">{item}</label>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</Card>
	{/if}
</div>

<!-- Block Dialog -->
<Dialog bind:open={showBlockDialog}>
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
					<!-- Simplified for now - would need proper array management -->
					<Textarea
						bind:value={blockCheckboxItems}
						placeholder="Enter items (one per line)"
						rows={4}
					/>
				</div>
			{/if}
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={closeBlockDialog}>Cancel</Button>
			<Button onclick={saveBlock}>
				<Save class="w-4 h-4 mr-2" />
				{editingBlock ? 'Update' : 'Create'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

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
