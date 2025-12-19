<script lang="ts">
	import { Columns3, Check } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { ColumnDefinition, ColumnVisibility } from './types';

	interface Props<T = unknown> {
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

		{#each hideableColumns as column (column.id)}
			<DropdownMenu.CheckboxItem
				checked={columnVisibility[column.id] !== false}
				onCheckedChange={() => onToggle(column.id)}
			>
				{column.label}
			</DropdownMenu.CheckboxItem>
		{/each}

		{#if hideableColumns.length > 0}
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={onShowAll}>Show All</DropdownMenu.Item>
			<DropdownMenu.Item onclick={onHideAll}>Hide All</DropdownMenu.Item>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
