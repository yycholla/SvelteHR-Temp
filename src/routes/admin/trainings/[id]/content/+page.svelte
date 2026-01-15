<script lang="ts">
	import { enhance } from '$app/forms';
	import { logger } from '$lib/utils/logger';
	import { flip } from 'svelte/animate';
	import { type DndEvent, dndzone } from 'svelte-dnd-action';
	import {
		ArrowLeft,
		Edit2,
		FileText,
		GripVertical,
		Image as ImageIcon,
		Link,
		Plus,
		Save,
		Trash2,
		Type,
		Video,
		X
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';

	const { data, form } = $props();

	// State
	let items = $state(data.contents.sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder));
	let activeTab = $state('TEXT');
	let editingId = $state<string | null>(null);

	// Form state
	let title = $state('');
	let contentData = $state('');
	let type = $state('TEXT');

	// Derived
	const isEditing = $derived(!!editingId);

	$effect(() => {
		items = data.contents.sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder);
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
		logger.info(`Reordering: ${updates}`);
	}

	function selectType(newType: string) {
		if (isEditing) return;
		activeTab = newType;
		type = newType;
		title = '';
		contentData = '';
	}

	function editItem(item: any) {
		editingId = item.id;
		title = item.title;
		contentData = item.data;
		type = item.type;
		activeTab = item.type;
	}

	function cancelEdit() {
		editingId = null;
		title = '';
		contentData = '';
		type = activeTab;
	}

	function getIcon(contentType: string) {
		switch (contentType) {
			case 'TEXT':
				return Type;
			case 'VIDEO':
				return Video;
			case 'IMAGE':
				return ImageIcon;
			case 'DOCUMENT':
				return FileText;
			case 'URL':
				return Link;
			default:
				return FileText;
		}
	}
</script>

<div class="flex flex-col h-full bg-background overflow-hidden">
	<!-- Sticky Header -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4">
			<Button
				variant="ghost"
				size="icon"
				href={`/admin/trainings/${data.training.id}`}
				title="Back"
			>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-sm font-semibold tracking-tight">Content Builder</h1>
				<div class="text-[10px] text-muted-foreground">{data.training.title}</div>
			</div>
		</div>
		<Button variant="outline" size="sm" href={`/admin/trainings/${data.training.id}`} class="h-8"
			>Done</Button
		>
	</header>

	<!-- Content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Left Panel: List -->
		<div class="w-80 border-r bg-muted/5 flex flex-col overflow-hidden">
			<div
				class="p-3 border-b bg-muted/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center"
			>
				<span>Structure</span>
				<Badge variant="outline" class="text-[9px] h-4 px-1">{items.length}</Badge>
			</div>

			<div
				class="flex-1 overflow-y-auto p-2 space-y-2"
				use:dndzone={{ items, flipDurationMs: 300 }}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
			>
				{#each items as item (item.id)}
					{@const Icon = getIcon(item.type)}
					<div
						class="group relative border rounded-md bg-background hover:border-primary/50 transition-colors p-2 flex items-center gap-3 {editingId ===
						item.id
							? 'ring-1 ring-primary border-primary'
							: ''}"
						animate:flip={{ duration: 300 }}
					>
						<GripVertical class="h-4 w-4 text-muted-foreground cursor-move" />

						<div
							class="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0 text-muted-foreground border"
						>
							<Icon class="h-3 w-3" />
						</div>

						<div class="flex-1 min-w-0">
							<div class="font-medium truncate text-xs">{item.title}</div>
							<div class="text-[10px] text-muted-foreground truncate lowercase">{item.type}</div>
						</div>

						<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<Button variant="ghost" size="icon" class="h-6 w-6" onclick={() => editItem(item)}>
								<Edit2 class="h-3 w-3" />
							</Button>
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={item.id} />
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6 text-destructive hover:bg-destructive/10"
									type="submit"
								>
									<Trash2 class="h-3 w-3" />
								</Button>
							</form>
						</div>
					</div>
				{/each}

				{#if items.length === 0}
					<div
						class="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg"
					>
						No content yet.
					</div>
				{/if}
			</div>
		</div>

		<!-- Right Panel: Editor -->
		<div class="flex-1 overflow-y-auto bg-background p-0">
			<div class="max-w-3xl mx-auto min-h-full border-x bg-background flex flex-col">
				<!-- Editor Header -->
				<div class="p-6 border-b bg-background sticky top-0 z-10">
					<h2 class="text-lg font-semibold">{isEditing ? 'Edit Content' : 'Add New Content'}</h2>
					{#if !isEditing}
						<div class="flex gap-2 mt-4 overflow-x-auto pb-1">
							<Button
								variant={activeTab === 'TEXT' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('TEXT')}
								class="h-7 text-xs"
							>
								<Type class="h-3 w-3 mr-1" /> Text
							</Button>
							<Button
								variant={activeTab === 'VIDEO' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('VIDEO')}
								class="h-7 text-xs"
							>
								<Video class="h-3 w-3 mr-1" /> Video
							</Button>
							<Button
								variant={activeTab === 'IMAGE' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('IMAGE')}
								class="h-7 text-xs"
							>
								<ImageIcon class="h-3 w-3 mr-1" /> Image
							</Button>
							<Button
								variant={activeTab === 'DOCUMENT' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('DOCUMENT')}
								class="h-7 text-xs"
							>
								<FileText class="h-3 w-3 mr-1" /> Doc
							</Button>
							<Button
								variant={activeTab === 'URL' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('URL')}
								class="h-7 text-xs"
							>
								<Link class="h-3 w-3 mr-1" /> Link
							</Button>
						</div>
					{/if}
				</div>

				<!-- Editor Form -->
				<div class="p-8 flex-1">
					{#if form?.error}
						<Alert.Root variant="destructive" class="mb-6">
							<Alert.Title>Error</Alert.Title>
							<Alert.Description>{form.error}</Alert.Description>
						</Alert.Root>
					{/if}

					<form
						method="POST"
						action={isEditing ? '?/update' : '?/create'}
						use:enhance={() => {
							return async ({ update, result }) => {
								await update();
								if (result.type === 'success') {
									title = '';
									contentData = '';
									editingId = null;
								}
							};
						}}
						id="contentForm"
						class="space-y-6"
					>
						{#if isEditing}
							<input type="hidden" name="id" value={editingId} />
						{/if}
						<input type="hidden" name="type" value={type} />
						<input type="hidden" name="sequenceOrder" value={items.length} />

						<div class="space-y-2">
							<Label for="title">Title</Label>
							<Input
								id="title"
								name="title"
								bind:value={title}
								placeholder="Section title..."
								required
							/>
						</div>

						<div class="space-y-2">
							<Label for="data">
								{#if type === 'TEXT'}
									Content
								{:else if type === 'VIDEO'}
									Video URL
								{:else if type === 'URL'}
									Link URL
								{:else}
									File URL
								{/if}
							</Label>

							{#if type === 'TEXT'}
								<Textarea
									id="data"
									name="data"
									bind:value={contentData}
									rows={12}
									placeholder="Type content..."
									required
									class="font-mono text-sm"
								/>
							{:else}
								<Input
									id="data"
									name="data"
									bind:value={contentData}
									placeholder="https://..."
									required
								/>
								{#if type === 'VIDEO' && contentData}
									<div
										class="aspect-video w-full bg-muted/50 rounded-lg mt-2 flex items-center justify-center border text-xs text-muted-foreground"
									>
										Video Preview
									</div>
								{:else if type === 'IMAGE' && contentData}
									<div class="w-full bg-muted/50 rounded-lg mt-2 border p-2">
										<img
											src={contentData}
											alt="Preview"
											class="max-h-[200px] mx-auto object-contain"
										/>
									</div>
								{/if}
							{/if}
						</div>
					</form>
				</div>

				<!-- Footer -->
				<div class="p-4 border-t bg-muted/5 flex justify-between sticky bottom-0">
					{#if isEditing}
						<Button variant="ghost" onclick={cancelEdit} size="sm">Cancel</Button>
					{:else}
						<div></div>
					{/if}
					<Button type="submit" form="contentForm" size="sm">
						{#if isEditing}
							<Save class="mr-2 h-3.5 w-3.5" /> Update
						{:else}
							<Plus class="mr-2 h-3.5 w-3.5" /> Add
						{/if}
					</Button>
				</div>
			</div>
		</div>
	</div>
</div>
