<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import {
		ChevronDown,
		ChevronUp,
		Edit,
		FileText,
		GripVertical,
		Plus,
		Trash2
	} from '@lucide/svelte';
	import type { OnboardingFormBlock } from '$lib/graphql/form-operations';
	import { blockTypes, getBlockIcon } from './utils';

	interface Props {
		blocks: OnboardingFormBlock[];
		onAddBlock: () => void;
		onEditBlock: (block: OnboardingFormBlock) => void;
		onDeleteBlock: (blockId: string) => void;
		onMoveBlock: (index: number, direction: 'up' | 'down') => void;
	}

	let { blocks, onAddBlock, onEditBlock, onDeleteBlock, onMoveBlock }: Props = $props();
</script>

<Card class="p-6">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-xl font-semibold">Form Blocks</h2>
		<Button onclick={onAddBlock}>
			<Plus class="w-4 h-4 mr-2" />
			Add Block
		</Button>
	</div>

	{#if blocks.length === 0}
		<div class="text-center py-12 text-gray-500">
			<FileText class="w-16 h-16 mx-auto mb-4 text-gray-400" />
			<p class="text-lg mb-2">No blocks yet</p>
			<p class="text-sm">Add your first block to start building the form</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each blocks as block, index}
				{@const BlockIcon = getBlockIcon(block.type)}
				<div
					class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<!-- Drag handle -->
					<div class="text-gray-400">
						<GripVertical class="w-5 h-5" />
					</div>

					<!-- Block icon and info -->
					<div class="flex-1 flex items-center gap-3">
						<div class="p-2 bg-white dark:bg-gray-700 rounded">
							<BlockIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
						</div>
						<div>
							<h3 class="font-medium text-sm">
								{block.title || `${block.type} Block`}
							</h3>
							<p class="text-xs text-gray-500">
								{blockTypes.find((bt) => bt.value === block.type)?.label || block.type}
							</p>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							onclick={() => onMoveBlock(index, 'up')}
							disabled={index === 0}
						>
							<ChevronUp class="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => onMoveBlock(index, 'down')}
							disabled={index === blocks.length - 1}
						>
							<ChevronDown class="w-4 h-4" />
						</Button>
						<Button variant="ghost" size="sm" onclick={() => onEditBlock(block)}>
							<Edit class="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => onDeleteBlock(block.id)}
							class="text-red-600 hover:text-red-700"
						>
							<Trash2 class="w-4 h-4" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Card>
