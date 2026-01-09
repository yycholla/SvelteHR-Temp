<script lang="ts" generics="T">
	import { Download, FileSpreadsheet, FileText } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { exportToCSV, exportToExcel } from '$lib/utils/export';
	import type { ColumnDefinition } from './types';

	interface Props {
		/** Data to export */
		data: T[];

		/** Column definitions */
		columns: ColumnDefinition<T>[];

		/** Base filename (timestamp will be appended) */
		filename?: string;

		/** Available export formats */
		formats?: Array<'csv' | 'excel'>;

		/** Include hidden columns in export? */
		includeHiddenColumns?: boolean;
	}

	const {
		data,
		columns,
		filename = 'export',
		formats = ['csv', 'excel'],
		includeHiddenColumns = false
	}: Props = $props();

	let exporting = $state(false);
	let errorMessage = $state<string | null>(null);

	async function handleExport(format: 'csv' | 'excel') {
		if (exporting) return;

		exporting = true;
		errorMessage = null;

		try {
			if (format === 'csv') {
				exportToCSV(data, columns, filename, includeHiddenColumns);
			} else if (format === 'excel') {
				await exportToExcel(data, columns, filename, includeHiddenColumns);
			}
		} catch (error) {
			console.error('Export failed:', error);
			errorMessage = error instanceof Error ? error.message : 'Export failed';
		} finally {
			exporting = false;
		}
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" size="sm" disabled={exporting || data.length === 0} class="gap-1.5 h-7 text-xs">
				<Download class="h-3.5 w-3.5" />
				Export
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Label>Export Data</DropdownMenu.Label>
		<DropdownMenu.Separator />

		{#if data.length === 0}
			<DropdownMenu.Item disabled>
				<span class="text-muted-foreground text-xs">No data to export</span>
			</DropdownMenu.Item>
		{:else}
			{#if formats.includes('csv')}
				<DropdownMenu.Item onclick={() => handleExport('csv')}>
					<FileText class="mr-2 h-4 w-4" />
					<span>Export as CSV</span>
				</DropdownMenu.Item>
			{/if}

			{#if formats.includes('excel')}
				<DropdownMenu.Item onclick={() => handleExport('excel')}>
					<FileSpreadsheet class="mr-2 h-4 w-4" />
					<span>Export as Excel</span>
				</DropdownMenu.Item>
			{/if}

			<DropdownMenu.Separator />

			<div class="px-2 py-1.5 text-xs text-muted-foreground">
				{#if includeHiddenColumns}
					<p>Includes all columns (even hidden)</p>
				{:else}
					<p>Includes only visible columns</p>
				{/if}
				<p class="mt-0.5">{data.length} row{data.length === 1 ? '' : 's'} will be exported</p>
			</div>
		{/if}

		{#if errorMessage}
			<DropdownMenu.Separator />
			<div class="px-2 py-1.5 text-xs text-destructive">
				{errorMessage}
			</div>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
