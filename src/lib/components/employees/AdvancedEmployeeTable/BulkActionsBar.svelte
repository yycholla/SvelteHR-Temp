<script lang="ts">
	import { X, Edit, Download, Trash2, Archive, Send, CheckSquare } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	let {
		selectedCount = 0,
		onAction,
		onClear
	}: {
		selectedCount: number;
		onAction: (action: string) => void;
		onClear: () => void;
	} = $props();

	const bulkActions = [
		{
			id: 'update-status',
			label: 'Update Status',
			icon: CheckSquare,
			variant: 'default' as const,
			description: 'Change employment status'
		},
		{
			id: 'edit-bulk',
			label: 'Bulk Edit',
			icon: Edit,
			variant: 'outline' as const,
			description: 'Edit multiple employees'
		},
		{
			id: 'send-message',
			label: 'Send Message',
			icon: Send,
			variant: 'outline' as const,
			description: 'Send message to selected'
		},
		{
			id: 'export',
			label: 'Export',
			icon: Download,
			variant: 'outline' as const,
			description: 'Export selected employees'
		},
		{
			id: 'archive',
			label: 'Archive',
			icon: Archive,
			variant: 'outline' as const,
			description: 'Archive employees'
		}
	];
</script>

<!-- Floating Bulk Actions Bar -->
<div
	class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in duration-300 slide-in-from-bottom-4"
>
	<div class="rounded-2xl border border-border/40 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
		<div class="flex items-center space-x-4">
			<!-- Selection Info -->
			<div class="flex items-center space-x-2">
				<Badge variant="secondary" class="rounded-lg font-medium">
					{selectedCount} selected
				</Badge>
				<Button
					variant="outline"
					size="sm"
					onclick={onClear}
					class="rounded-xl"
					title="Clear all selected items"
				>
					<X class="mr-2 h-5 w-5" />
					Clear Selection
				</Button>
			</div>

			<Separator orientation="vertical" class="h-8" />

			<!-- Bulk Actions -->
			<div class="flex items-center space-x-2">
				{#each bulkActions as action (action.id)}
					{@const IconComponent = action.icon}
					<Button
						variant={action.variant}
						size="sm"
						onclick={() => onAction(action.id)}
						class="rounded-xl"
						title={action.description}
					>
						<IconComponent class="mr-2 h-5 w-5" />
						{action.label}
					</Button>
				{/each}
			</div>

			<Separator orientation="vertical" class="h-8" />

			<!-- Dangerous Actions -->
			<Button
				variant="destructive"
				size="sm"
				onclick={() => onAction('delete')}
				class="rounded-xl"
				title="Delete selected employees"
			>
				<Trash2 class="mr-2 h-5 w-5" />
				Delete
			</Button>
		</div>
	</div>
</div>
