<script lang="ts" generics="T">
	import { Columns3, Check } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { ColumnDefinition, ColumnVisibility } from './types';

	interface Props {
		columns: ColumnDefinition<T>[];
		columnVisibility: ColumnVisibility;
		onToggle: (columnId: string) => void;
		onShowAll: () => void;
		onHideAll: () => void;
	}

	const { columns, columnVisibility, onToggle, onShowAll, onHideAll }: Props = $props();

	const hideableColumns = $derived(columns.filter((col) => col.hideable !== false));
	const visibleCount = $derived(
		hideableColumns.filter((col) => columnVisibility[col.id] !== false).length
	);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				class="flex items-center gap-1.5 rounded-sm border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
				title="Column Visibility"
			>
				<Columns3 class="h-3.5 w-3.5" />
				<span>Columns</span>
				<span class="text-muted-foreground">({visibleCount}/{hideableColumns.length})</span>
			</button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-56">
		<DropdownMenu.Label>Column Visibility</DropdownMenu.Label>
		<DropdownMenu.Separator />

		<div class="px-1 py-1">
			{#each hideableColumns as column (column.id)}
				<div
					role="menuitemcheckbox"
					aria-checked={columnVisibility[column.id] !== false}
					class="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer transition-colors"
					onclick={(e) => {
						e.stopPropagation();
						onToggle(column.id);
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							e.stopPropagation();
							onToggle(column.id);
						}
					}}
					tabindex="0"
				>
					<input
						type="checkbox"
						checked={columnVisibility[column.id] !== false}
						onchange={() => onToggle(column.id)}
						class="h-4 w-4 rounded border-input pointer-events-none"
						tabindex="-1"
						aria-hidden="true"
					/>
					<span class="text-sm">{column.label}</span>
				</div>
			{/each}
		</div>

		{#if hideableColumns.length > 0}
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={onShowAll}>Show All</DropdownMenu.Item>
			<DropdownMenu.Item onclick={onHideAll}>Hide All</DropdownMenu.Item>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
