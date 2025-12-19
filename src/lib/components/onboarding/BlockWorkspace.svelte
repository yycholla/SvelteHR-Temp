<script lang="ts">
	import { FileText, ExternalLink } from '@lucide/svelte';
	import FormBlockEditor from './FormBlockEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	
	interface Props {
		block: any;
		formTemplates: any[];
		onUpdate: (data: any) => void;
	}

	let { block, formTemplates, onUpdate }: Props = $props();

	// Form specific state
	let formTemplateId = $state(block.formTemplateId || '');
	let inlineFormElements = $state(block.inlineFormElements || []);
	let formMode = $state<'template' | 'custom'>(
		block.formTemplateId ? 'template' : (block.inlineFormElements?.length > 0 ? 'custom' : 'template')
	);

	$effect(() => {
		formTemplateId = block.formTemplateId || '';
		inlineFormElements = block.inlineFormElements || [];
		formMode = block.formTemplateId ? 'template' : (block.inlineFormElements?.length > 0 ? 'custom' : 'template');
	});

	function handleFormSave(data: any) {
		onUpdate({
			...block,
			formTemplateId: data.mode === 'template' ? data.formTemplateId : '',
			inlineFormElements: data.mode === 'custom' ? data.inlineFormElements : []
		});
	}
</script>

<div class="h-full w-full bg-background flex flex-col overflow-hidden">
	{#if block.type === 'FORM'}
		<!-- Form Builder Canvas (Interactive) -->
		<div class="flex-1 relative flex flex-col">
			<div class="flex-1 relative">
				<FormBlockEditor 
					{formTemplates}
					initialMode={formMode}
					initialTemplateId={formTemplateId}
					initialInlineElements={inlineFormElements}
					onSave={handleFormSave}
					onModeChange={(m) => formMode = m}
				/>
			</div>
		</div>

	{:else}
		<!-- Live Preview Container (Flush) -->
		<div class="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
			<!-- Content Preview -->
			<div class="flex-1 overflow-y-auto p-8">
				<div class="max-w-3xl mx-auto w-full">
					<h1 class="text-3xl font-bold tracking-tight mb-6">{block.title}</h1>
					
					{#if block.type === 'TEXT'}
						<div class="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
							{block.textContent || 'Start typing in the sidebar to add content...'}
						</div>
					{:else if block.type === 'DOCUMENT'}
						<div class="flex flex-col items-center justify-center border-2 border-dashed rounded-none p-12 bg-muted/5 text-center">
							<div class="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
								<FileText class="w-8 h-8 text-primary" />
							</div>
							{#if block.documentUrl}
								<h3 class="font-medium text-lg mb-2">Document Attached</h3>
								<p class="text-sm text-muted-foreground max-w-xs mb-6 break-all">{block.documentUrl}</p>
								<Button variant="outline" href={block.documentUrl} target="_blank">
									<ExternalLink class="w-4 h-4 mr-2" /> View Document
								</Button>
							{:else}
								<h3 class="font-medium text-lg mb-1">No Document</h3>
								<p class="text-sm text-muted-foreground">Add a document URL in the properties panel.</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
