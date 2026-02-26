<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';

	import ModuleStructure from '$lib/components/onboarding/ModuleStructure.svelte';
	import BlockWorkspace from '$lib/components/onboarding/BlockWorkspace.svelte';
	import BlockProperties from './components/BlockProperties.svelte';

	type BlockType = 'TEXT' | 'DOCUMENT' | 'FORM' | 'FILE_UPLOAD' | 'SIGNATURE';

	interface OnboardingContentBlock {
		id: string;
		title: string;
		type: BlockType;
		sequenceOrder: number;
		isRequired: boolean;
		textContent?: string | null;
		documentUrl?: string | null;
		formTemplateId?: string | null;
		inlineFormElements?: unknown[] | null;
	}

	interface FormTemplate {
		id: string;
		name: string;
	}

	interface OnboardingModule {
		id: string;
		title: string;
	}

	interface OnboardingContentPageData {
		contents: OnboardingContentBlock[];
		module?: OnboardingModule | null;
		formTemplates: FormTemplate[];
	}

	const { data }: { data: OnboardingContentPageData } = $props();

	// State
	let items = $state<OnboardingContentBlock[]>(
		data?.contents ? [...data.contents].sort((a, b) => a.sequenceOrder - b.sequenceOrder) : []
	);

	let selectedId = $state<string | null>(null);
	let sidebarMode = $state<'structure' | 'properties'>('structure');
	let isSaving = $state(false);

	// Derived
	const selectedBlock = $derived(items.find((i) => i.id === selectedId));

	onMount(() => {
		if (items.length > 0 && !selectedId) {
			selectedId = items[0].id;
		}
	});

	// Keep items in sync with server data
	$effect(() => {
		if (data?.contents) {
			const newItems = [...data.contents].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
			if (newItems.length !== items.length) {
				items = newItems;
				if (!selectedId && items.length > 0) selectedId = items[0].id;
			}
		}
	});

	// Actions
	async function handleAdd(type: string) {
		const formData = new FormData();
		formData.append('title', 'New ' + type.charAt(0) + type.slice(1).toLowerCase() + ' Step');
		formData.append('contentType', type);
		formData.append('sequenceOrder', items.length.toString());
		formData.append('isRequired', 'false');

		isSaving = true;
		await fetch('?/create', { method: 'POST', body: formData });
		await invalidateAll();
		isSaving = false;
	}

	async function handleDelete(id: string = selectedId!) {
		if (!id) return;
		if (!confirm('Delete this block?')) return;

		const formData = new FormData();
		formData.append('id', id);
		await fetch('?/delete', { method: 'POST', body: formData });
		await invalidateAll();

		if (selectedId === id) {
			selectedId = items.length > 0 ? items[0].id : null;
			sidebarMode = 'structure';
		}
	}

	async function handleReorder(newItems: OnboardingContentBlock[]) {
		items = newItems;
	}

	function handleUpdateBlock(updatedBlock: OnboardingContentBlock) {
		const index = items.findIndex((i) => i.id === updatedBlock.id);
		if (index !== -1) {
			const newItems = [...items];
			newItems[index] = updatedBlock;
			items = newItems;
		}
	}

	async function handleSaveBlock() {
		if (!selectedBlock) return;
		isSaving = true;

		const formData = new FormData();
		formData.append('id', selectedBlock.id);
		formData.append('title', selectedBlock.title);
		formData.append('isRequired', String(selectedBlock.isRequired));

		if (selectedBlock.formTemplateId)
			formData.append('formTemplateId', selectedBlock.formTemplateId);
		else formData.append('formTemplateId', '');

		if (selectedBlock.inlineFormElements)
			formData.append('inlineFormElements', JSON.stringify(selectedBlock.inlineFormElements));
		if (selectedBlock.textContent) {
			/* handled implicitly by update action if present */
		}

		const response = await fetch('?/update', { method: 'POST', body: formData });
		if (response.ok) await invalidateAll();
		else alert('Failed to save');

		isSaving = false;
	}

	function handleSelect(item: OnboardingContentBlock) {
		selectedId = item.id;
		sidebarMode = 'properties'; // Drill down on select
	}

	function handleBackToStructure() {
		sidebarMode = 'structure';
	}
</script>

<div class="h-screen flex flex-col bg-background overflow-hidden">
	<Tooltip.Provider>
		<!-- Top App Bar -->
		<header
			class="h-14 border-b flex items-center px-4 bg-background shrink-0 z-20 justify-between"
		>
			<div class="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8 -ml-2"
					href={`/admin/onboarding/${data?.module?.id || ''}`}
				>
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<div>
					<h1 class="text-sm font-semibold flex items-center gap-2">
						{data?.module?.title || 'Loading...'}
						<span class="text-muted-foreground font-normal">/ Content Builder</span>
					</h1>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" href={`/admin/onboarding/${data?.module?.id || ''}`}>
					Exit Builder
				</Button>
			</div>
		</header>

		<!-- Main Content Area -->
		<div class="flex-1 flex overflow-hidden">
			<!-- Workspace (Editor) - Main/Left -->
			<div class="flex-1 overflow-hidden relative">
				{#if selectedBlock}
					<BlockWorkspace
						block={selectedBlock}
						formTemplates={data?.formTemplates || []}
						onUpdate={handleUpdateBlock}
					/>
				{:else}
					<div
						class="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/10"
					>
						<p>Select a step from the sidebar to edit content.</p>
					</div>
				{/if}
			</div>

			<!-- Sidebar (Structure / Properties) - Right -->
			<div class="w-80 border-l bg-background flex flex-col shrink-0 transition-all duration-300">
				{#if sidebarMode === 'structure'}
					<ModuleStructure
						{items}
						{selectedId}
						onSelect={handleSelect}
						onReorder={handleReorder}
						onAdd={handleAdd}
						onDelete={handleDelete}
					/>
				{:else if selectedBlock}
					<BlockProperties
						block={selectedBlock}
						onUpdate={handleUpdateBlock}
						onSave={handleSaveBlock}
						onBack={handleBackToStructure}
						onDelete={() => handleDelete(selectedBlock.id)}
						{isSaving}
					/>
				{/if}
			</div>
		</div>
	</Tooltip.Provider>
</div>
