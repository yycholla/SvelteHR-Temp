<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import HtmlCheckbox from '$lib/components/ui/checkbox/html-checkbox.svelte';
	import { Download, Eye, FileText, Lock } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import type { Document } from './types';
	import { getFileIcon, getSensitivityClass, formatDate, formatFileSize } from './utils';

	interface Props {
		table: any;
		columns: any[];
		canPreview: (doc: Document) => boolean;
		canDownload: (doc: Document) => boolean;
		onPreview: (documentId: string) => void;
		onDownload: (documentId: string) => void;
		dense?: boolean;
	}

	let { table, columns, canPreview, canDownload, onPreview, onDownload, dense = false }: Props = $props();

	// Handle row click
	function handleRowClick(documentId: string) {
		goto(`/dashboard/documents/${documentId}`);
	}
</script>

<Table.Body>
	{#if table.getRowModel().rows?.length}
		{#each table.getRowModel().rows as row (row.id)}
			<Table.Row
				class="cursor-pointer hover:bg-muted/50 transition-colors {dense ? 'group' : ''}"
				onclick={() => handleRowClick(row.original.id)}
			>
				{#each row.getVisibleCells() as cell (cell.id)}
					<Table.Cell
						class={(cell.column.id === 'select' ? 'pr-2 pl-6' : cell.column.id === 'filename' ? 'pl-2' : '') +
							(dense ? ' py-1.5 px-3 border-r last:border-r-0 text-xs' : '')}
						style={cell.column.columnDef.size
							? `width: ${cell.column.columnDef.size}px; min-width: ${cell.column.columnDef.size}px;`
							: ''}
					>
						{#if cell.column.id === 'select'}
							{@const isRowSelected = row?.getIsSelected() ?? false}
							<HtmlCheckbox
								checked={isRowSelected}
								disabled={!row?.getCanSelect()}
								onCheckedChange={(value) => {
									row?.toggleSelected(!!value);
								}}
								onclick={(e: MouseEvent) => e.stopPropagation()}
							/>
						{:else if cell.column.id === 'filename'}
							<div class="flex items-center gap-2">
								<span class="text-2xl">{getFileIcon(row.original.file_type)}</span>
								<div class="font-medium">{row.original.filename}</div>
								{#if row.original.is_encrypted}
									<Lock class="h-3 w-3 text-muted-foreground" />
								{/if}
							</div>
						{:else if cell.column.id === 'category'}
							<Badge variant="outline">{row.original.category}</Badge>
						{:else if cell.column.id === 'sensitivity_level'}
							{#if row.original.sensitivity_level}
								<Badge variant={getSensitivityClass(row.original.sensitivity_level)}>
									{row.original.sensitivity_level}
								</Badge>
							{:else}
								<span class="text-sm text-muted-foreground">Not set</span>
							{/if}
						{:else if cell.column.id === 'assigned_users'}
							{#if row.original.assigned_users && row.original.assigned_users.length > 0}
								<div class="flex flex-wrap gap-1">
									{#each row.original.assigned_users.slice(0, 2) as assignee}
										<Badge variant="secondary" class="text-xs">
											{assignee.displayName}
										</Badge>
									{/each}
									{#if row.original.assigned_users.length > 2}
										<Badge variant="secondary" class="text-xs">
											+{row.original.assigned_users.length - 2} more
										</Badge>
									{/if}
								</div>
							{:else}
								<span class="text-sm text-muted-foreground">Unassigned</span>
							{/if}
						{:else if cell.column.id === 'uploaded_at'}
							<span class="text-sm text-muted-foreground">
								{formatDate(row.original.uploaded_at)}
							</span>
						{:else if cell.column.id === 'expiration_date'}
							{#if row.original.expiration_date}
								<span class="text-sm text-muted-foreground">
									{formatDate(row.original.expiration_date)}
								</span>
							{:else}
								<span class="text-sm text-muted-foreground">—</span>
							{/if}
						{:else if cell.column.id === 'file_size_bytes'}
							<span class="text-sm text-muted-foreground">
								{formatFileSize(row.original.file_size_bytes)}
							</span>
						{:else if cell.column.id === 'version_number'}
							{#if row.original.version_number}
								<Badge variant="outline" class="text-xs">
									v{row.original.version_number}
								</Badge>
							{:else}
								<span class="text-sm text-muted-foreground">—</span>
							{/if}
						{:else if cell.column.id === 'actions'}
							<div class={dense ? "flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" : "flex justify-end gap-1"}>
								{#if canPreview(row.original)}
									<Tooltip.Root>
										<Tooltip.Trigger>
											<Button
												variant="ghost"
												size="sm"
												onclick={(e) => {
													e.stopPropagation();
													onPreview(row.original.id);
												}}
											>
												<Eye class="h-4 w-4" />
											</Button>
										</Tooltip.Trigger>
										<Tooltip.Content>Preview Document</Tooltip.Content>
									</Tooltip.Root>
								{/if}
								{#if canDownload(row.original)}
									<Tooltip.Root>
										<Tooltip.Trigger>
											<Button
												variant="ghost"
												size="sm"
												onclick={(e) => {
													e.stopPropagation();
													onDownload(row.original.id);
												}}
											>
												<Download class="h-4 w-4" />
											</Button>
										</Tooltip.Trigger>
										<Tooltip.Content>Download Document</Tooltip.Content>
									</Tooltip.Root>
								{/if}
							</div>
						{/if}
					</Table.Cell>
				{/each}
			</Table.Row>
		{/each}
	{:else}
		<Table.Row>
			<Table.Cell colspan={columns.length} class="h-24 text-center">
				<div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
					<FileText class="h-8 w-8" />
					<p>No documents found</p>
				</div>
			</Table.Cell>
		</Table.Row>
	{/if}
</Table.Body>
