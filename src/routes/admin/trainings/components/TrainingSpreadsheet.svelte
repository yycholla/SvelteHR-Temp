<script lang="ts">
	import { Edit, Trash2, GraduationCap, Users, Calendar } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { SpreadsheetTable } from '$lib/components/ui/spreadsheet';
	import type {
		SpreadsheetConfig,
		ColumnDefinition,
		RowEdit
	} from '$lib/components/ui/spreadsheet';

	interface Training {
		id: string;
		title: string;
		description?: string;
		isActive: boolean;
		startDate?: string;
		endDate?: string;
		assignmentCount: number;
		assignments?: Array<{ user?: { displayName: string; email: string } }>;
		createdAt?: string;
	}

	interface Props {
		trainings: Training[];
		loading: boolean;
		onDelete?: (trainingId: string) => void;
		onSaveEdits?: (edits: RowEdit<Training>[]) => Promise<void>;
	}

	const { trainings, loading, onDelete, onSaveEdits }: Props = $props();

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Define columns for the training table
	const columns: ColumnDefinition<Training>[] = [
		{
			id: 'title',
			label: 'Title',
			type: 'text',
			width: 'w-1/3',
			visible: true,
			hideable: false,
			editable: true,
			getValue: (training) => training.title,
			getEditValue: (training) => training.title,
			field: 'title'
		},
		{
			id: 'description',
			label: 'Description',
			type: 'text',
			visible: false, // Hidden by default
			hideable: true,
			editable: true,
			truncate: true,
			maxWidth: '300px',
			getValue: (training) => training.description || '—',
			getEditValue: (training) => training.description || '',
			field: 'description'
		},
		{
			id: 'status',
			label: 'Status',
			type: 'custom',
			width: 'w-24',
			visible: true,
			hideable: true,
			editable: false,
			getValue: (training) => (training.isActive ? 'Active' : 'Inactive')
		},
		{
			id: 'assignmentCount',
			label: 'Assigned',
			type: 'custom',
			visible: true,
			hideable: true,
			editable: false,
			getValue: (training) => training.assignmentCount || 0
		},
		{
			id: 'startDate',
			label: 'Start Date',
			type: 'date',
			visible: true,
			hideable: true,
			editable: true,
			getValue: (training) => formatDate(training.startDate),
			getEditValue: (training) => training.startDate || '',
			field: 'startDate'
		},
		{
			id: 'endDate',
			label: 'End Date',
			type: 'date',
			visible: true,
			hideable: true,
			editable: true,
			getValue: (training) => formatDate(training.endDate),
			getEditValue: (training) => training.endDate || '',
			field: 'endDate'
		},
		{
			id: 'createdAt',
			label: 'Created',
			type: 'date',
			visible: false, // Hidden by default
			hideable: true,
			editable: false,
			getValue: (training) => formatDate(training.createdAt)
		},
		{
			id: 'actions',
			label: 'Actions',
			type: 'custom',
			width: 'w-20',
			align: 'right',
			visible: true,
			hideable: false,
			editable: false,
			getValue: () => ''
		}
	];

	const config: SpreadsheetConfig<Training> = {
		columns,
		getRowId: (training) => training.id,
		editMode: 'inline',
		showColumnControls: true,
		showSaveButton: true,
		loading,
		emptyMessage: 'No trainings found',
		onSave: async (edits) => {
			if (onSaveEdits) {
				await onSaveEdits(edits);
			}
		}
	};
</script>

<SpreadsheetTable {config} data={trainings}>
	<!-- prettier-ignore -->
	{#snippet customCell({
		column,
		row
	}: {
		column: ColumnDefinition<Training>;
		row: Training;
		value: unknown;
	})}
		{#if column.id === 'status'}
			{#if row.isActive}
				<Badge
					variant="default"
					class="bg-green-500/10 text-green-700 border-green-200 text-[10px] h-5"
				>
					Active
				</Badge>
			{:else}
				<Badge variant="secondary" class="text-[10px] h-5">Inactive</Badge>
			{/if}
		{:else if column.id === 'assignmentCount'}
			<div class="flex items-center gap-2">
				<Badge variant="outline" class="gap-1 h-5 text-[10px] font-normal">
					<Users class="h-3 w-3" />
					{row.assignmentCount || 0}
				</Badge>
				{#if row.assignments && row.assignments.length > 0}
					<span class="text-xs text-muted-foreground truncate max-w-[200px]">
						{row.assignments
							.map(
								(a: { user?: { displayName: string; email: string } }) =>
									a.user?.displayName || a.user?.email
							)
							.slice(0, 2)
							.join(', ')}
						{#if row.assignmentCount > 2}
							<span class="font-medium">+{row.assignmentCount - 2}</span>
						{/if}
					</span>
				{/if}
			</div>
		{:else if column.id === 'actions'}
			<div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<button
					onclick={() => goto(`/admin/trainings/${row.id}`)}
					disabled={loading}
					class="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground"
					title="Edit"
				>
					<Edit class="h-3.5 w-3.5" />
				</button>
				<button
					onclick={() => goto(`/admin/trainings/${row.id}/content`)}
					disabled={loading}
					class="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground"
					title="Manage Content"
				>
					<GraduationCap class="h-3.5 w-3.5" />
				</button>
				{#if onDelete}
					<button
						onclick={() => onDelete(row.id)}
						disabled={loading}
						class="p-1 rounded hover:bg-background border border-transparent hover:border-destructive/30 text-muted-foreground hover:text-destructive"
						title="Delete"
					>
						<Trash2 class="h-3.5 w-3.5" />
					</button>
				{/if}
			</div>
		{/if}
	{/snippet}
</SpreadsheetTable>
