<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		GripVertical,
		Type,
		FileText,
		ClipboardCheck,
		Upload,
		PenTool,
		Plus,
		MoreVertical,
		Trash2
	} from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	interface Props {
		items: any[];
		selectedId: string | null;
		onSelect: (item: any) => void;
		onReorder: (items: any[]) => void;
		onAdd: (type: string) => void;
		onDelete: (id: string) => void;
	}

	let { items, selectedId, onSelect, onReorder, onAdd, onDelete }: Props = $props();

	function handleDndConsider(e: CustomEvent<any>) {
		items = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<any>) {
		items = e.detail.items;
		onReorder(items);
	}

	function getIcon(type: string) {
		switch (type) {
			case 'TEXT': return Type;
			case 'DOCUMENT': return FileText;
			case 'FORM': return ClipboardCheck;
			case 'FILE_UPLOAD': return Upload;
			case 'SIGNATURE': return PenTool;
			default: return FileText;
		}
	}
</script>

<div class="flex flex-col h-full bg-muted/10 border-l w-80">
	<div class="p-4 border-b bg-background/50 backdrop-blur flex justify-between items-center">
		<span class="font-semibold text-sm">Structure</span>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class={buttonVariants({ size: "sm", variant: "default" })} style="height: 2rem; gap: 0.25rem;">
				<Plus class="h-3.5 w-3.5" /> Add Step
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-48">
				<DropdownMenu.Label>Choose Block Type</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={() => onAdd('TEXT')}>
					<Type class="mr-2 h-4 w-4" /> Text Content
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => onAdd('FORM')}>
					<ClipboardCheck class="mr-2 h-4 w-4" /> Custom Form
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => onAdd('DOCUMENT')}>
					<FileText class="mr-2 h-4 w-4" /> Document Read
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => onAdd('FILE_UPLOAD')}>
					<Upload class="mr-2 h-4 w-4" /> File Upload
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => onAdd('SIGNATURE')}>
					<PenTool class="mr-2 h-4 w-4" /> Signature
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<div class="flex-1 overflow-y-auto p-3 space-y-2"
		use:dndzone={{ items, flipDurationMs: 300, dropTargetStyle: { outline: 'none' } }}
		onconsider={handleDndConsider}
		onfinalize={handleDndFinalize}
	>
		{#each items as item (item.id)}
			{@const Icon = getIcon(item.type)}
			<div animate:flip={{ duration: 300 }} class="relative group">
				<button
					class="w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm
					{selectedId === item.id 
						? 'bg-background border-primary shadow-sm ring-1 ring-primary/20' 
						: 'bg-card border-border hover:border-primary/50'}"
					onclick={() => onSelect(item)}
				>
					<div
						role="button"
						tabindex="0"
						class="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/50 hover:text-foreground transition-colors"
						onclick={(e) => e.stopPropagation()}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								e.stopPropagation();
							}
						}}
					>
						<GripVertical class="h-4 w-4" />
					</div>

					<div class="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 text-muted-foreground border">
						<Icon class="h-4 w-4" />
					</div>

					<div class="flex-1 min-w-0">
						<div class="font-medium text-sm truncate leading-tight">
							{item.title || 'Untitled Step'}
						</div>
						<div class="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
							{item.type.replace('_', ' ')}
						</div>
					</div>

					{#if item.isRequired}
						<div class="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" title="Required"></div>
					{/if}
				</button>
				
				<div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class={buttonVariants({ variant: "ghost", size: "icon" })} style="height: 1.75rem; width: 1.75rem;">
							<MoreVertical class="h-3.5 w-3.5" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item class="text-destructive focus:text-destructive" onclick={() => onDelete(item.id)}>
								<Trash2 class="mr-2 h-4 w-4" /> Delete
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</div>
		{/each}
		
		{#if items.length === 0}
			<div class="text-center py-12 px-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
				<p>No steps yet.</p>
				<p class="mt-1">Click "Add Step" to begin.</p>
			</div>
		{/if}
	</div>
</div>
