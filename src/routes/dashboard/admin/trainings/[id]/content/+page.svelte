<script lang="ts">
	import { enhance } from '$app/forms';
	import { flip } from 'svelte/animate';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
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
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';

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

	// Keep items in sync with server data - watch data.contents directly for reactivity
	$effect(() => {
		items = data.contents.sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder);
	});

	function handleDndConsider(e: CustomEvent<DndEvent>) {
		items = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<DndEvent>) {
		items = e.detail.items;
		// TODO: Trigger server update for sequenceOrder
		updateSequence();
	}

	async function updateSequence() {
		// Optimistic update - real implementation would POST to an API
		const updates = items.map((item: any, index: number) => ({
			id: item.id,
			sequenceOrder: index
		}));

		// await fetch('/api/trainings/content/reorder', { ... })
		console.log('Reordering:', updates);
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
		type = item.type; // e.g. 'TEXT', 'VIDEO'
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

<div class="container mx-auto py-8 max-w-7xl px-4">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href={`/dashboard/admin/trainings/${data.training.id}`}>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Content Builder</h1>
				<p class="text-muted-foreground text-sm">Manage content for "{data.training.title}"</p>
			</div>
		</div>
		<Button variant="outline" href={`/dashboard/admin/trainings/${data.training.id}`}>Done</Button>
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
				Course Structure
				<Badge variant="secondary">{items.length} Items</Badge>
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
									<div class="font-medium truncate text-sm">{item.title}</div>
									<div class="text-xs text-muted-foreground truncate lowercase">{item.type}</div>
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
						No content yet. <br /> Add items from the right panel.
					</div>
				{/if}
			</div>
		</div>

		<!-- Right Panel: Editor -->
		<div class="lg:col-span-2 flex flex-col gap-4">
			<div class="font-semibold text-lg">
				{isEditing ? 'Edit Content' : 'Add New Content'}
			</div>

			<Card.Root class="flex-1 overflow-hidden flex flex-col">
				<Card.Header class="border-b pb-0">
					{#if !isEditing}
						<div class="flex gap-2 mb-4 overflow-x-auto pb-2">
							<Button
								variant={activeTab === 'TEXT' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('TEXT')}
								class="gap-2"
							>
								<Type class="h-4 w-4" /> Text
							</Button>
							<Button
								variant={activeTab === 'VIDEO' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('VIDEO')}
								class="gap-2"
							>
								<Video class="h-4 w-4" /> Video
							</Button>
							<Button
								variant={activeTab === 'IMAGE' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('IMAGE')}
								class="gap-2"
							>
								<ImageIcon class="h-4 w-4" /> Image
							</Button>
							<Button
								variant={activeTab === 'DOCUMENT' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('DOCUMENT')}
								class="gap-2"
							>
								<FileText class="h-4 w-4" /> Doc
							</Button>
							<Button
								variant={activeTab === 'URL' ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectType('URL')}
								class="gap-2"
							>
								<Link class="h-4 w-4" /> Link
							</Button>
						</div>
					{/if}
				</Card.Header>

				<Card.Content class="p-6 flex-1 overflow-y-auto">
					<form
						method="POST"
						action={isEditing ? '?/update' : '?/create'}
						use:enhance={() => {
							return async ({ update, result }) => {
								await update();
								if (result.type === 'success') {
									// Reset form state after successful submission
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
								placeholder="e.g. Introduction to Safety"
								required
							/>
						</div>

						<div class="space-y-2">
							<Label for="data">
								{#if type === 'TEXT'}
									Content
								{:else if type === 'VIDEO'}
									Video URL (YouTube/Vimeo)
								{:else if type === 'URL'}
									External Link URL
								{:else}
									File URL
								{/if}
							</Label>

							{#if type === 'TEXT'}
								<Textarea
									id="data"
									name="data"
									bind:value={contentData}
									rows={10}
									placeholder="Enter your content here..."
									required
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
										class="aspect-video w-full bg-black/5 rounded-lg mt-2 flex items-center justify-center border"
									>
										<p class="text-muted-foreground text-xs">Video Preview Placeholder</p>
									</div>
								{:else if type === 'IMAGE' && contentData}
									<div class="w-full bg-black/5 rounded-lg mt-2 border p-2">
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
				</Card.Content>

				<Card.Footer class="border-t p-4 bg-muted/10 flex justify-between">
					{#if isEditing}
						<Button variant="ghost" onclick={cancelEdit}>
							<X class="mr-2 h-4 w-4" /> Cancel
						</Button>
					{:else}
						<div></div>
						<!-- Spacer -->
					{/if}

					<Button type="submit" form="contentForm">
						{#if isEditing}
							<Save class="mr-2 h-4 w-4" /> Update Content
						{:else}
							<Plus class="mr-2 h-4 w-4" /> Add Content
						{/if}
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	</div>
</div>
