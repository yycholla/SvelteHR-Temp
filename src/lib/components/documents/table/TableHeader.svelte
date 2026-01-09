<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import HtmlCheckbox from '$lib/components/ui/checkbox/html-checkbox.svelte';
	import { ChevronDown, ChevronUp, ChevronsUpDown } from '@lucide/svelte';

	interface Props {
		table: any;
		dense?: boolean;
	}

	let { table, dense = false }: Props = $props();
</script>

<Table.Header class={dense ? 'sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b' : ''}>
	{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
		<Table.Row class={dense ? 'hover:bg-transparent border-none' : ''}>
			{#each headerGroup.headers as header (header.id)}
				<Table.Head
					class={(header.column.getCanSort() ? 'cursor-pointer select-none' : '') +
						(header.column.id === 'select' ? ' pr-2 pl-6' : header.column.id === 'filename' ? ' pl-2' : '') +
						(dense ? ' py-2 text-xs uppercase tracking-wider font-semibold border-r last:border-r-0' : '')}
					style={header.column.columnDef.size
						? `width: ${header.column.columnDef.size}px; min-width: ${header.column.columnDef.size}px;`
						: ''}
					onclick={header.column.getCanSort() ? () => header.column.toggleSorting() : undefined}
				>
					{#if !header.isPlaceholder}
						<div class="flex items-center gap-2">
							{#if header.column.id === 'select'}
								{@const allSelected = table?.getIsAllPageRowsSelected() ?? false}
								{@const someSelected = table?.getIsSomePageRowsSelected() && !allSelected}
								<div class="flex items-center justify-center">
									<HtmlCheckbox
										checked={allSelected}
										indeterminate={someSelected}
										onCheckedChange={(value) => {
											table?.toggleAllPageRowsSelected(!!value);
										}}
										aria-label="Select all rows"
									/>
								</div>
							{:else if header.column.id === 'actions'}
								<div class="w-full text-right">Actions</div>
							{:else}
								<span>{header.column.columnDef.header}</span>
							{/if}
							{#if header.column.getCanSort()}
								{#if header.column.getIsSorted() === 'asc'}
									<ChevronUp class="h-4 w-4" />
								{:else if header.column.getIsSorted() === 'desc'}
									<ChevronDown class="h-4 w-4" />
								{:else}
									<ChevronsUpDown class="h-4 w-4 opacity-50" />
								{/if}
							{/if}
						</div>
					{/if}
				</Table.Head>
			{/each}
		</Table.Row>
	{/each}
</Table.Header>
