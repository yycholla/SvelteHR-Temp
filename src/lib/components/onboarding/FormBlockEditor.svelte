<script lang="ts">
	/**
	 * Form Block Editor
	 * Main orchestrator for creating/editing form blocks with template or custom modes
	 */
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Save, AlertTriangle, LayoutTemplate } from '@lucide/svelte';
	import type { FormElement, FormTemplate } from '$lib/graphql/form-operations';
	import FormDesigner from './FormDesigner.svelte';
	import SaveAsTemplateDialog from './SaveAsTemplateDialog.svelte';

	interface Props {
		formTemplates: FormTemplate[];
		initialMode?: 'template' | 'custom';
		initialTemplateId?: string;
		initialInlineElements?: FormElement[];
		onSave: (data: {
			mode: 'template' | 'custom';
			formTemplateId?: string;
			inlineFormElements?: FormElement[];
		}) => void;
		onModeChange?: (mode: 'template' | 'custom') => void;
	}

	let {
		formTemplates = [],
		initialMode = 'template',
		initialTemplateId = '',
		initialInlineElements = [],
		onSave,
		onModeChange
	}: Props = $props();

	// State
	let formMode = $state<'template' | 'custom'>(initialMode);
	let selectedTemplateId = $state(initialTemplateId);
	let inlineElements = $state<FormElement[]>([...initialInlineElements]);
	let showSaveTemplateDialog = $state(false);

	// Derived state
	const selectedTemplate = $derived(
		formTemplates.find((t) => t.id === selectedTemplateId) || null
	);

	const fieldCount = $derived(
		inlineElements.filter((el) => el.elementType === 'FIELD').length
	);

	const canSaveAsTemplate = $derived(formMode === 'custom' && inlineElements.length > 0);

	function notifySave() {
		if (formMode === 'template') {
			onSave({ mode: 'template', formTemplateId: selectedTemplateId });
		} else {
			onSave({ mode: 'custom', inlineFormElements: inlineElements });
		}
	}

	// Handle mode change
	function handleModeChange(newMode: 'template' | 'custom') {
		formMode = newMode;
		if (newMode === 'template') {
			inlineElements = [];
		} else {
			selectedTemplateId = '';
		}
		if (onModeChange) {
			onModeChange(newMode);
		}
		notifySave();
	}

	function handleElementsChange(elements: FormElement[]) {
		inlineElements = elements;
		notifySave();
	}

	function handleTemplateChange(e: Event) {
		selectedTemplateId = (e.target as HTMLSelectElement).value;
		notifySave();
	}

	function handleSaveAsTemplate(
		name: string,
		description: string | null,
		category: string | null
	) {
		console.log('Save as template:', { name, description, category, elements: inlineElements });
		showSaveTemplateDialog = false;
	}

	function handleCancelSaveTemplate() {
		showSaveTemplateDialog = false;
	}
</script>

<div class="flex flex-col h-full">
	<!-- Toolbar for Mode Selection (Top) -->
	<div class="px-4 py-2 border-b bg-background flex items-center justify-between shrink-0">
		<div class="flex items-center gap-2">
			<Button 
				variant={formMode === 'template' ? 'secondary' : 'ghost'} 
				size="sm"
				class="text-xs h-7"
				onclick={() => handleModeChange('template')}
			>
				<LayoutTemplate class="mr-2 h-3.5 w-3.5" /> Use Template
			</Button>
			<Button 
				variant={formMode === 'custom' ? 'secondary' : 'ghost'} 
				size="sm"
				class="text-xs h-7"
				onclick={() => handleModeChange('custom')}
			>
				<AlertTriangle class="mr-2 h-3.5 w-3.5" /> Custom Builder
			</Button>
		</div>

		{#if canSaveAsTemplate}
			<Button variant="outline" size="sm" class="h-7 text-xs" onclick={() => showSaveTemplateDialog = true}>
				<Save class="mr-2 h-3.5 w-3.5" /> Save as Template
			</Button>
		{/if}
	</div>

	<!-- Content Area -->
	<div class="flex-1 min-h-0 bg-background relative">
		{#if formMode === 'template'}
			<div class="max-w-2xl mx-auto py-12 px-6">
				<div class="space-y-6">
					<div class="space-y-2">
						<Label for="formTemplate">Select Template</Label>
						{#if formTemplates.length === 0}
							<div class="border rounded-md p-8 text-center text-muted-foreground bg-muted/10">
								<p>No form templates available.</p>
								<Button variant="link" class="mt-2" onclick={() => handleModeChange('custom')}>Start from scratch</Button>
							</div>
						{:else}
							<select
								id="formTemplate"
								value={selectedTemplateId}
								onchange={handleTemplateChange}
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<option value="">Choose a form template...</option>
								{#each formTemplates as template}
									<option value={template.id}>
										{template.name}
										{#if template.category} ({template.category}){/if}
									</option>
								{/each}
							</select>
						{/if}
					</div>

					{#if selectedTemplate}
						<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
							<div class="p-6">
								<h4 class="text-sm font-semibold mb-4">Template Preview</h4>
								<div class="space-y-3">
									{#each selectedTemplate.fields as field}
										<div class="flex items-center justify-between text-sm py-2 border-b last:border-0">
											<span class="font-medium">{field.label}</span>
											<span class="text-muted-foreground bg-muted px-2 py-0.5 rounded text-xs">{field.type}</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<FormDesigner
				bind:elements={inlineElements}
				onElementsChange={handleElementsChange}
			/>
		{/if}
	</div>
</div>

<!-- Save as Template Dialog -->
<SaveAsTemplateDialog
	bind:open={showSaveTemplateDialog}
	fieldCount={fieldCount}
	onSave={handleSaveAsTemplate}
	onCancel={handleCancelSaveTemplate}
/>