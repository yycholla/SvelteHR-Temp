<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Save, ArrowLeft, Trash2, FileText, Link } from '@lucide/svelte';

	interface Props {
		block: any;
		onUpdate: (data: any) => void;
		onSave: () => void;
		onBack: () => void;
		onDelete: () => void;
		isSaving?: boolean;
	}

	let { block, onUpdate, onSave, onBack, onDelete, isSaving = false }: Props = $props();

	// Local state for immediate feedback
	let title = $state(block.title);
	let isRequired = $state(block.isRequired);
	let textContent = $state(block.textContent || '');
	let documentUrl = $state(block.documentUrl || '');

	$effect(() => {
		title = block.title;
		isRequired = block.isRequired;
		textContent = block.textContent || '';
		documentUrl = block.documentUrl || '';
	});

	function triggerUpdate() {
		onUpdate({
			...block,
			title,
			isRequired,
			textContent,
			documentUrl
		});
	}
</script>

<div class="flex flex-col h-full bg-muted/5 border-l">
	<!-- Header -->
	<div class="p-4 border-b flex items-center gap-3 bg-background shrink-0">
		<Button
			variant="ghost"
			size="icon"
			class="h-8 w-8 -ml-2"
			onclick={onBack}
			title="Back to Structure"
		>
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<span class="font-semibold text-sm">Edit Properties</span>
	</div>

	<!-- Properties Form -->
	<div class="flex-1 overflow-y-auto p-4 space-y-6">
		<!-- Common Properties -->
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="block-title">Block Title</Label>
				<Input
					id="block-title"
					value={title}
					oninput={(e) => {
						title = e.currentTarget.value;
						triggerUpdate();
					}}
					placeholder="e.g. Introduction"
				/>
			</div>

			<div class="flex items-center justify-between border rounded-lg p-3 bg-background">
				<div class="space-y-0.5">
					<Label class="text-base">Required</Label>
					<p class="text-xs text-muted-foreground">User must complete this</p>
				</div>
				<Switch
					checked={isRequired}
					onCheckedChange={(v) => {
						isRequired = v;
						triggerUpdate();
					}}
				/>
			</div>
		</div>

		<div class="h-px bg-border"></div>

		<!-- Type Specific Properties -->
		{#if block.type === 'TEXT'}
			<div class="space-y-2">
				<Label for="text-content">Content</Label>
				<Textarea
					id="text-content"
					value={textContent}
					oninput={(e) => {
						textContent = e.currentTarget.value;
						triggerUpdate();
					}}
					rows={15}
					class="font-mono text-sm"
					placeholder="Enter markdown or text content..."
				/>
				<p class="text-xs text-muted-foreground">Supports Markdown formatting.</p>
			</div>
		{:else if block.type === 'DOCUMENT'}
			<div class="space-y-2">
				<Label for="doc-url">Document URL</Label>
				<div class="relative">
					<Link class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						id="doc-url"
						value={documentUrl}
						oninput={(e) => {
							documentUrl = e.currentTarget.value;
							triggerUpdate();
						}}
						class="pl-9"
						placeholder="https://..."
					/>
				</div>
				<p class="text-xs text-muted-foreground">Direct link to PDF or file.</p>
			</div>
		{:else if block.type === 'FORM'}
			<div
				class="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20 text-sm text-blue-800 dark:text-blue-300"
			>
				Form builder is active in the main view.
			</div>
		{/if}
	</div>

	<!-- Footer Actions -->
	<div class="p-4 border-t bg-background shrink-0 space-y-2">
		<Button onclick={onSave} disabled={isSaving} class="w-full">
			{#if isSaving}
				Saving...
			{:else}
				<Save class="mr-2 h-4 w-4" /> Save Changes
			{/if}
		</Button>

		<Button
			variant="ghost"
			onclick={onDelete}
			class="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
		>
			<Trash2 class="mr-2 h-4 w-4" /> Delete Block
		</Button>
	</div>
</div>
