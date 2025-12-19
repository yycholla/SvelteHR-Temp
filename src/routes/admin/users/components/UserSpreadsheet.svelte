<script lang="ts">
	import { Edit, Trash2, UserCheck, UserX } from '@lucide/svelte';
	import { SpreadsheetTable } from '$lib/components/ui/spreadsheet';
	import type { SpreadsheetConfig, ColumnDefinition, RowEdit } from '$lib/components/ui/spreadsheet';

	interface User {
		id: string;
		email: string;
		displayName: string | null;
		role: string;
		department: { id: string; name: string } | null;
		isActive: boolean;
		createdAt?: string;
		lastLoginAt?: string;
	}

	interface Props {
		filteredUsers: User[];
		loading: boolean;
		onToggleStatus: (user: User) => void;
		onEditUser: (user: User) => void;
		onDeleteUser: (userId: string) => void;
		onSaveEdits?: (edits: RowEdit<User>[]) => Promise<void>;
	}

	const { filteredUsers, loading, onToggleStatus, onEditUser, onDeleteUser, onSaveEdits }: Props =
		$props();

	// Define columns for the user table
	const columns: ColumnDefinition<User>[] = [
		{
			id: 'email',
			label: 'Email',
			type: 'text',
			width: 'w-1/4',
			visible: true,
			hideable: false, // Always show email
			editable: true,
			truncate: true,
			maxWidth: '250px',
			getValue: (user) => user.email,
			getEditValue: (user) => user.email,
			field: 'email'
		},
		{
			id: 'displayName',
			label: 'Display Name',
			type: 'text',
			width: 'w-1/5',
			visible: true,
			hideable: true,
			editable: true,
			truncate: true,
			maxWidth: '200px',
			getValue: (user) => user.displayName || '—',
			getEditValue: (user) => user.displayName || '',
			field: 'displayName'
		},
		{
			id: 'role',
			label: 'Role',
			type: 'badge',
			visible: true,
			hideable: true,
			editable: false,
			getValue: (user) => user.role || 'employee'
		},
		{
			id: 'department',
			label: 'Department',
			type: 'text',
			visible: true,
			hideable: true,
			editable: false,
			getValue: (user) => user.department?.name || '—'
		},
		{
			id: 'status',
			label: 'Status',
			type: 'custom',
			width: 'w-32',
			visible: true,
			hideable: true,
			editable: false,
			getValue: (user) => (user.isActive ? 'Active' : 'Inactive')
		},
		{
			id: 'createdAt',
			label: 'Created',
			type: 'date',
			visible: false, // Hidden by default, but can be shown
			hideable: true,
			editable: false,
			getValue: (user) => {
				if (!user.createdAt) return '—';
				return new Date(user.createdAt).toLocaleDateString();
			}
		},
		{
			id: 'lastLoginAt',
			label: 'Last Login',
			type: 'date',
			visible: false, // Hidden by default
			hideable: true,
			editable: false,
			getValue: (user) => {
				if (!user.lastLoginAt) return '—';
				return new Date(user.lastLoginAt).toLocaleDateString();
			}
		},
		{
			id: 'actions',
			label: 'Actions',
			type: 'custom',
			width: 'w-20',
			align: 'right',
			visible: true,
			hideable: false, // Always show actions
			editable: false,
			getValue: () => ''
		}
	];

	// Spreadsheet configuration
	const config: SpreadsheetConfig<User> = {
		columns,
		getRowId: (user) => user.id,
		editMode: 'inline',
		showColumnControls: true,
		showSaveButton: true,
		loading,
		emptyMessage: 'No users found matching your filters',
		onSave: async (edits) => {
			if (onSaveEdits) {
				await onSaveEdits(edits);
			}
		}
	};
</script>

<SpreadsheetTable {config} data={filteredUsers}>
	{#snippet customCell({ column, row })}
		{#if column.id === 'status'}
			<button
				onclick={() => onToggleStatus(row)}
				disabled={loading}
				class="flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm text-xs font-medium transition-colors hover:bg-muted"
				class:text-green-600={row.isActive}
				class:text-muted-foreground={!row.isActive}
			>
				{#if row.isActive}
					<UserCheck class="h-3.5 w-3.5" />
					<span>Active</span>
				{:else}
					<UserX class="h-3.5 w-3.5" />
					<span>Inactive</span>
				{/if}
			</button>
		{:else if column.id === 'actions'}
			<div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<button
					onclick={() => onEditUser(row)}
					disabled={loading}
					class="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground"
					title="Edit"
				>
					<Edit class="h-3.5 w-3.5" />
				</button>
				<button
					onclick={() => onDeleteUser(row.id)}
					disabled={loading}
					class="p-1 rounded hover:bg-background border border-transparent hover:border-destructive/30 text-muted-foreground hover:text-destructive"
					title="Delete"
				>
					<Trash2 class="h-3.5 w-3.5" />
				</button>
			</div>
		{/if}
	{/snippet}
</SpreadsheetTable>
