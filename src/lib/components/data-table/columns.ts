import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent, renderSnippet } from '$lib/components/ui/data-table/index.js';
import { createRawSnippet } from 'svelte';
import type { Schema } from './schemas.js';

import DragHandleCell from './cells/DragHandleCell.svelte';
import DataTableCheckbox from './data-table-checkbox.svelte';
import DataTableCellViewer from './data-table-cell-viewer.svelte';
import TypeCell from './cells/TypeCell.svelte';
import StatusCell from './cells/StatusCell.svelte';
import TargetCell from './cells/TargetCell.svelte';
import LimitCell from './cells/LimitCell.svelte';
import DataTableReviewer from './data-table-reviewer.svelte';
import ActionsCell from './cells/ActionsCell.svelte';

export const columns: ColumnDef<Schema>[] = [
	{
		id: 'drag',
		header: () => null,
		cell: ({ row }) => renderComponent(DragHandleCell, { id: row.original.id })
	},
	{
		id: 'select',
		header: ({ table }) =>
			renderComponent(DataTableCheckbox, {
				checked: table.getIsAllPageRowsSelected(),
				indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
				onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
				'aria-label': 'Select all'
			}),
		cell: ({ row }) =>
			renderComponent(DataTableCheckbox, {
				checked: row.getIsSelected(),
				onCheckedChange: (value) => row.toggleSelected(!!value),
				'aria-label': 'Select row'
			}),
		enableSorting: false,
		enableHiding: false
	},
	{
		accessorKey: 'header',
		header: 'Header',
		cell: ({ row }) => renderComponent(DataTableCellViewer, { item: row.original }),
		enableHiding: false
	},
	{
		accessorKey: 'type',
		header: 'Section Type',
		cell: ({ row }) => renderComponent(TypeCell, { row })
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => renderComponent(StatusCell, { row })
	},
	{
		accessorKey: 'target',
		header: () =>
			renderSnippet(
				createRawSnippet(() => ({
					render: () => '<div class="w-full text-right">Target</div>'
				}))
			),
		cell: ({ row }) => renderComponent(TargetCell, { row })
	},
	{
		accessorKey: 'limit',
		header: () =>
			renderSnippet(
				createRawSnippet(() => ({
					render: () => '<div class="w-full text-right">Limit</div>'
				}))
			),
		cell: ({ row }) => renderComponent(LimitCell, { row })
	},
	{
		accessorKey: 'reviewer',
		header: 'Reviewer',
		cell: ({ row }) => renderComponent(DataTableReviewer, { row })
	},
	{
		id: 'actions',
		cell: () => renderComponent(ActionsCell)
	}
];
