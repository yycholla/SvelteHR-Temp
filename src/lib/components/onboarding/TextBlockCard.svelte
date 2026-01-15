<script lang="ts">
	/**
	 * Text Block Card
	 * Displays a text block in the builder list with drag handle and actions
	 */
	import { Button } from '$lib/components/ui/button';
	import {
		GripVertical,
		FileText,
		Info,
		AlertTriangle,
		FileSignature,
		Pencil,
		Trash2
	} from '@lucide/svelte';
	import type { TextBlockDefinition } from '$lib/graphql/form-operations';

	interface Props {
		textBlock: TextBlockDefinition;
		index: number;
		onEdit: (textBlock: TextBlockDefinition, index: number) => void;
		onDelete: (index: number) => void;
	}

	let { textBlock, index, onEdit, onDelete }: Props = $props();

	// Icon mapping for text block styles
	const styleIcons = {
		plain: FileText,
		info: Info,
		warning: AlertTriangle,
		contract: FileSignature
	};

	// Style names
	const styleNames = {
		plain: 'Plain Text',
		info: 'Information',
		warning: 'Warning',
		contract: 'Contract/Legal'
	};

	const Icon = $derived(styleIcons[textBlock.style || 'plain']);
	const styleName = $derived(styleNames[textBlock.style || 'plain']);

	// Truncate content for display
	const truncatedContent = $derived(
		textBlock.content.length > 100 ? textBlock.content.substring(0, 100) + '...' : textBlock.content
	);
</script>

<div
	class="group relative flex items-center gap-3 rounded-lg border p-4 {textBlock.style === 'info'
		? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
		: textBlock.style === 'warning'
			? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
			: textBlock.style === 'contract'
				? 'bg-slate-50/50 border-slate-300 dark:bg-slate-900/50 dark:border-slate-700'
				: 'bg-card'} hover:shadow-sm transition-all"
>
	<!-- Drag Handle -->
	<button
		type="button"
		class="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
	>
		<GripVertical class="h-5 w-5" />
	</button>

	<!-- Icon -->
	<div
		class="rounded-md p-2 {textBlock.style === 'info'
			? 'bg-blue-100 dark:bg-blue-900'
			: textBlock.style === 'warning'
				? 'bg-amber-100 dark:bg-amber-900'
				: textBlock.style === 'contract'
					? 'bg-slate-200 dark:bg-slate-800'
					: 'bg-primary/10'}"
	>
		<Icon
			class="h-4 w-4 {textBlock.style === 'info'
				? 'text-blue-600 dark:text-blue-400'
				: textBlock.style === 'warning'
					? 'text-amber-600 dark:text-amber-400'
					: textBlock.style === 'contract'
						? 'text-slate-600 dark:text-slate-400'
						: 'text-primary'}"
		/>
	</div>

	<!-- Content -->
	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2 mb-1">
			<h4 class="font-medium text-sm">Text Block</h4>
			<span class="text-xs text-muted-foreground">({styleName})</span>
		</div>
		<p class="text-sm text-muted-foreground line-clamp-2">{truncatedContent}</p>
	</div>

	<!-- Actions (visible on hover) -->
	<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
		<Button
			type="button"
			variant="ghost"
			size="sm"
			onclick={() => onEdit(textBlock, index)}
			class="h-8 w-8 p-0"
		>
			<Pencil class="h-4 w-4" />
			<span class="sr-only">Edit text block</span>
		</Button>
		<Button
			type="button"
			variant="ghost"
			size="sm"
			onclick={() => onDelete(index)}
			class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
		>
			<Trash2 class="h-4 w-4" />
			<span class="sr-only">Delete text block</span>
		</Button>
	</div>
</div>
