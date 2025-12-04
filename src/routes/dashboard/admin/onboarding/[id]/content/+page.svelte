<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import {
		Plus,
		Type,
		FileText,
		Upload,
		PenTool,
		GripVertical,
		Trash2,
		Edit2,
		Save,
		X,
		ArrowLeft,
		ClipboardCheck
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';

	let { data, form } = $props();

	// State - with defensive checks for undefined data
	let items = $state(
		data?.contents
			? [...data.contents].sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder)
			: []
	);
	let activeTab = $state('TEXT');
	let editingId = $state<string | null>(null);

	// Form state
	let title = $state('');
	let contentType = $state('TEXT');
	let isRequired = $state(false);
	let formTemplateId = $state('');

	// Derived
	let isEditing = $derived(!!editingId);

	onMount(() => {
		console.log('[ONBOARDING CONTENT EDITOR] Component mounted', {
			moduleId: data?.module?.id,
			url: window.location.href,
			pathname: window.location.pathname,
			timestamp: new Date().toISOString(),
			hasData: !!data,
			hasModule: !!data?.module,
			hasContents: !!data?.contents,
			contentsLength: data?.contents?.length || 0
		});
	});

	onDestroy(() => {
		if (browser) {
			console.log('[ONBOARDING CONTENT EDITOR] Component destroying', {
				url: window.location.href,
				timestamp: new Date().toISOString()
			});
		}
	});

	// Keep items in sync with server data
	$effect(() => {
		if (data?.contents) {
			items = [...data.contents].sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder);
		}
	});

	function handleDndConsider(e: CustomEvent<DndEvent>) {
		items = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<DndEvent>) {
		items = e.detail.items;
		updateSequence();
	}

	async function updateSequence() {
		const updates = items.map((item: any, index: number) => ({
			id: item.id,
			sequenceOrder: index
		}));
		console.log('Reordering:', updates);
	}

	function selectType(newType: string) {
		if (isEditing) return;
		activeTab = newType;
		contentType = newType;
		title = '';
		formTemplateId = '';
	}

	function editItem(item: any) {
		editingId = item.id;
		title = item.title;
		contentType = item.type;
		activeTab = item.type;
		isRequired = item.isRequired;
		formTemplateId = item.formTemplateId || '';
	}

	function cancelEdit() {
		editingId = null;
		title = '';
		contentType = activeTab;
		isRequired = false;
		formTemplateId = '';
	}

	function getIcon(type: string) {
		switch (type) {
			case 'TEXT':
				return Type;
			case 'DOCUMENT':
				return FileText;
			case 'FORM':
				return ClipboardCheck;
			case 'FILE_UPLOAD':
				return Upload;
			case 'SIGNATURE':
				return PenTool;
			default:
				return FileText;
		}
	}

	function getTypeName(type: string) {
		switch (type) {
			case 'TEXT':
				return 'Text';
			case 'DOCUMENT':
				return 'Document';
			case 'FORM':
				return 'Form';
			case 'FILE_UPLOAD':
				return 'File Upload';
			case 'SIGNATURE':
				return 'Signature';
			default:
				return type;
		}
	}
</script>

<div class="container mx-auto py-8 max-w-7xl px-4">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button
				variant="outline"
				size="icon"
				href={`/dashboard/admin/onboarding/${data?.module?.id || ''}`}
			>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Content Builder</h1>
				<p class="text-muted-foreground text-sm">
					Manage content for "{data?.module?.title || 'Loading...'}"
				</p>
			</div>
		</div>
		<Button variant="outline" href={`/dashboard/admin/onboarding/${data?.module?.id || ''}`}
			>Done</Button
		>
	</div>

	{#if form?.error}
		<Alert.Root variant="destructive" class="mb-6">
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
		<!-- Left Panel: Content List -->
		<div class="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
			<div class="font-semibold text-lg flex items-center gap-2">
				Module Structure
				<Badge variant="secondary">{items.length} Blocks</Badge>
			</div>

			<div
				class="flex-1 overflow-y-auto pr-2 space-y-2"
				use:dndzone={{ items, flipDurationMs: 300 }}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
			>
				{#each items as item (item.id)}
					<div class="group relative" animate:flip={{ duration: 300 }}>
						<Card.Root
							class="transition-all hover:shadow-md cursor-move border-l-4 {editingId === item.id
								? 'border-l-primary bg-accent/50'
								: 'border-l-transparent hover:border-l-muted-foreground'}"
						>
							<Card.Content class="p-3 flex items-center gap-3">
								<GripVertical
									class="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100"
								/>

								{@const Icon = getIcon(item.type)}
								<div
									class="h-8 w-8 rounded bg-background border flex items-center justify-center shrink-0 text-muted-foreground"
								>
									<Icon class="h-4 w-4" />
								</div>

								<div class="flex-1 min-w-0">
									<div class="font-medium truncate text-sm flex items-center gap-2">
										{item.title}
										{#if item.isRequired}
											<Badge variant="secondary" class="h-4 text-[10px]">Required</Badge>
										{/if}
									</div>
									<div class="text-xs text-muted-foreground truncate">{getTypeName(item.type)}</div>
								</div>

								<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<Button
										variant="ghost"
										size="icon"
										class="h-7 w-7"
										onclick={() => editItem(item)}
									>
										<Edit2 class="h-3.5 w-3.5" />
									</Button>
									<form
										method="POST"
										action="?/delete"
										use:enhance={() => {
											return async ({ update }) => {
												await update();
											};
										}}
									>
										<input type="hidden" name="id" value={item.id} />
										<Button
											variant="ghost"
											size="icon"
											class="h-7 w-7 text-destructive hover:text-destructive"
											type="submit"
										>
											<Trash2 class="h-3.5 w-3.5" />
										</Button>
									</form>
								</div>
							</Card.Content>
						</Card.Root>
					</div>
				{/each}

				{#if items.length === 0}
					<div
						class="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground text-sm"
					>
						No content yet. <br /> Add blocks from the right panel.
					</div>
				{/if}
			</div>
		</div>

		<!-- Right Panel: Editor -->
		<div class="lg:col-span-2 flex flex-col gap-4">
			<div class="font-semibold text-lg">
				{isEditing ? 'Edit Content Block' : 'Add New Content Block'}
			</div>

			<Card.Root class="flex-1 overflow-hidden flex flex-col">
				<Card.Header class="border-b pb-0">
					{#if !isEditing}
						<div class="flex flex-wrap gap-2 mb-4 pb-2">
							<Button
								variant={activeTab === 'TEXT' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('TEXT')}
								class="gap-2"
							>
								<Type class="h-4 w-4" /> Text
							</Button>
							<Button
								variant={activeTab === 'DOCUMENT' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('DOCUMENT')}
								class="gap-2"
							>
								<FileText class="h-4 w-4" /> Document
							</Button>
							<Button
								variant={activeTab === 'FORM' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('FORM')}
								class="gap-2"
							>
								<ClipboardCheck class="h-4 w-4" /> Form
							</Button>
							<Button
								variant={activeTab === 'FILE_UPLOAD' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('FILE_UPLOAD')}
								class="gap-2"
							>
								<Upload class="h-4 w-4" /> File Upload
							</Button>
							<Button
								variant={activeTab === 'SIGNATURE' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('SIGNATURE')}
								class="gap-2"
							>
								<PenTool class="h-4 w-4" /> Signature
							</Button>
						</div>
					{/if}
				</Card.Header>

				<Card.Content class="p-6 flex-1 overflow-y-auto">
					<form
						method="POST"
						action={isEditing ? '?/update' : '?/create'}
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'success' && result.data) {
									// Reset form
									title = '';
									editingId = null;
									isRequired = false;
									formTemplateId = '';

									// Add new block to items if creating
									if (result.data.block) {
										items = [...items, result.data.block].sort(
											(a: any, b: any) => a.sequenceOrder - b.sequenceOrder
										);
									} else {
										// If updating, reload data
										await invalidateAll();
									}
								}
							};
						}}
						id="contentForm"
						class="space-y-6"
					>
						{#if isEditing}
							<input type="hidden" name="id" value={editingId} />
						{/if}
						<input type="hidden" name="contentType" value={contentType} />
						<input type="hidden" name="sequenceOrder" value={items.length} />
						<input type="hidden" name="isRequired" value={isRequired} />
						<input type="hidden" name="formTemplateId" value={formTemplateId} />

						<div class="space-y-2">
							<Label for="title">Title</Label>
							<Input
								id="title"
								name="title"
								bind:value={title}
								placeholder="e.g. Company Handbook Review"
								required
							/>
						</div>

						<div class="flex items-center space-x-2">
							<Checkbox id="isRequired" bind:checked={isRequired} />
							<Label for="isRequired" class="text-sm font-normal cursor-pointer">
								Mark as required (employees must complete this block)
							</Label>
						</div>

						<Alert.Root>
							<Alert.Title>Content Type: {getTypeName(contentType)}</Alert.Title>
							<Alert.Description class="text-xs">
								{#if contentType === 'TEXT'}
									Display text content or instructions
								{:else if contentType === 'DOCUMENT'}
									Link to a document for employees to read
								{:else if contentType === 'FORM'}
									Collect structured information via a form
								{:else if contentType === 'FILE_UPLOAD'}
									Allow employees to upload required documents
								{:else if contentType === 'SIGNATURE'}
									Require an electronic signature
								{/if}
							</Alert.Description>
						</Alert.Root>

						{#if contentType === 'FORM'}
							<div class="space-y-2">
								<Label for="formTemplate">Form Template</Label>
								<select
									id="formTemplate"
									bind:value={formTemplateId}
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								>
									<option value="">Select a form template...</option>
									{#each data?.formTemplates || [] as template}
										<option value={template.id}>
											{template.name}
											{#if template.version}
												({template.version})
											{/if}
										</option>
									{/each}
								</select>
								{#if !data?.formTemplates || data.formTemplates.length === 0}
									<p class="text-xs text-amber-600">No form templates available</p>
								{:else}
									<p class="text-xs text-muted-foreground">
										Choose a pre-configured form template for employees to fill out
									</p>
								{/if}
							</div>
						{/if}
					</form>
				</Card.Content>

				<Card.Footer class="border-t p-4 bg-muted/10 flex justify-between">
					{#if isEditing}
						<Button variant="ghost" onclick={cancelEdit}>
							<X class="mr-2 h-4 w-4" /> Cancel
						</Button>
					{:else}
						<div></div>
					{/if}

					<Button type="submit" form="contentForm">
						{#if isEditing}
							<Save class="mr-2 h-4 w-4" /> Update Block
						{:else}
							<Plus class="mr-2 h-4 w-4" /> Add Block
						{/if}
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	</div>
</div>
