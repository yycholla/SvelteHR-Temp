<script lang="ts">
	import { Edit, Trash2 } from '@lucide/svelte';
	import { SpreadsheetTable } from '$lib/components/ui/spreadsheet';
	import type {
		SpreadsheetConfig,
		ColumnDefinition,
		RowEdit
	} from '$lib/components/ui/spreadsheet';

	interface User {
		id: string;
		email: string;
		displayName: string | null;
		firstName?: string;
		lastName?: string;
		role: string;
		roles?: Array<{ id: string; name: string }>;
		department: { id: string; name: string } | null;
		manager?: { id: string; displayName: string; email: string } | null;
		jobTitle?: string | null;
		phone?: string | null;
		mobilePhone?: string | null;
		birthDate?: string | null;
		hireDate?: string | null;
		isActive: boolean;
		createdAt?: string;
		updatedAt?: string;
		lastLoginAt?: string;
	}

	// Helper to extract first/last name from displayName
	// Note: Backend doesn't have separate firstName/lastName fields yet
	function getFirstName(user: User): string {
		if (!user.displayName) return '';
		const parts = user.displayName.split(' ');
		return parts[0] || '';
	}

	function getLastName(user: User): string {
		if (!user.displayName) return '';
		const parts = user.displayName.split(' ');
		return parts.slice(1).join(' ') || '';
	}

	interface Props {
		filteredUsers: User[];
		allUsers?: User[]; // For manager dropdown
		loading: boolean;
		roles: Array<{ id: string; name: string }>;
		departments: Array<{ id: string; name: string }>;
		onToggleStatus: (user: User) => void;
		onEditUser: (user: User) => void;
		onDeleteUser: (userId: string) => void;
		onSaveEdits?: (edits: RowEdit<User>[]) => Promise<void>;
		onSelectionChange?: (selectedIds: Set<string>) => void;
	}

	const {
		filteredUsers,
		allUsers,
		loading,
		roles,
		departments,
		onToggleStatus,
		onEditUser,
		onDeleteUser,
		onSaveEdits,
		onSelectionChange
	}: Props = $props();

	// Define columns for the user table
	const columns: ColumnDefinition<User>[] = [
		{
			id: 'firstName',
			label: 'First Name',
			type: 'text',
			visible: true,
			hideable: true,
			editable: true,
			sortable: true,
			filterable: true,
			getValue: getFirstName,
			getEditValue: getFirstName,
			getSortValue: (user) => getFirstName(user).toLowerCase(),
			field: 'firstName',
			filterConfig: {
				type: 'text',
				placeholder: 'Filter by first name...'
			}
		},
		{
			id: 'lastName',
			label: 'Last Name',
			type: 'text',
			visible: true,
			hideable: true,
			editable: true,
			sortable: true,
			filterable: true,
			getValue: getLastName,
			getEditValue: getLastName,
			getSortValue: (user) => getLastName(user).toLowerCase(),
			field: 'lastName',
			filterConfig: {
				type: 'text',
				placeholder: 'Filter by last name...'
			}
		},
		{
			id: 'displayName',
			label: 'Display Name',
			type: 'text',
			visible: true,
			hideable: true,
			editable: true,
			sortable: true,
			filterable: true,
			truncate: true,
			maxWidth: '200px',
			getValue: (user) => user.displayName || '—',
			getEditValue: (user) => user.displayName || '',
			getSortValue: (user) => (user.displayName || '').toLowerCase(),
			field: 'displayName',
			filterConfig: {
				type: 'text',
				placeholder: 'Filter by name...'
			}
		},
		{
			id: 'email',
			label: 'Email',
			type: 'text',
			width: 'w-1/5',
			visible: true,
			hideable: false, // Always show email
			editable: true,
			sortable: true,
			filterable: true,
			truncate: true,
			maxWidth: '250px',
			getValue: (user) => user.email,
			getEditValue: (user) => user.email,
			getSortValue: (user) => user.email.toLowerCase(),
			field: 'email',
			filterConfig: {
				type: 'text',
				placeholder: 'Filter by email...'
			}
		},
		{
			id: 'role',
			label: 'Role',
			type: 'select',
			visible: true,
			hideable: true,
			editable: true,
			sortable: true,
			filterable: true,
			getValue: (user) => {
				const roleName = user.roles?.[0]?.name || user.role || 'Employee';
				return roleName;
			},
			getEditValue: (user) => user.roles?.[0]?.name || user.role || 'Employee',
			getSortValue: (user) => user.roles?.[0]?.name || user.role || 'Employee',
			field: 'role',
			options: roles.map((r) => ({ value: r.name, label: r.name })),
			filterConfig: {
				type: 'select',
				options: roles.map((r) => ({ value: r.name, label: r.name }))
			}
		},
		{
			id: 'department',
			label: 'Department',
			type: 'select',
			visible: true,
			hideable: true,
			editable: true,
			sortable: true,
			filterable: true,
			getValue: (user) => user.department?.name || '—',
			getEditValue: (user) => user.department?.id || '',
			getSortValue: (user) => (user.department?.name || '').toLowerCase(),
			field: 'departmentId',
			options: [
				{ value: '', label: '—' },
				...departments.map((d) => ({ value: d.id, label: d.name }))
			],
			filterConfig: {
				type: 'select',
				options: [
					{ value: '', label: 'All' },
					...departments.map((d) => ({ value: d.name, label: d.name }))
				]
			}
		},
		{
			id: 'manager',
			label: 'Manager',
			type: 'select',
			visible: true,
			hideable: true,
			editable: true,
			sortable: true,
			filterable: true,
			getValue: (user) => user.manager?.displayName || '—',
			getEditValue: (user) => user.manager?.id || '',
			getSortValue: (user) => (user.manager?.displayName || '').toLowerCase(),
			field: 'managerId',
			options: [
				{ value: '', label: '—' },
				...(allUsers || filteredUsers).map((u) => ({
					value: u.id,
					label: u.displayName || u.email
				}))
			],
			filterConfig: {
				type: 'select',
				options: [
					{ value: '', label: 'All' },
					...(allUsers || filteredUsers)
						.map((u) => ({
							value: u.manager?.displayName || '',
							label: u.manager?.displayName || ''
						}))
						.filter((o) => o.value)
				]
			}
		},
		{
			id: 'jobTitle',
			label: 'Job Title',
			type: 'text',
			visible: false, // Hidden by default
			hideable: true,
			editable: true,
			sortable: true,
			filterable: true,
			getValue: (user) => user.jobTitle || '—',
			getEditValue: (user) => user.jobTitle || '',
			getSortValue: (user) => (user.jobTitle || '').toLowerCase(),
			field: 'jobTitle',
			filterConfig: {
				type: 'text',
				placeholder: 'Filter by job title...'
			}
		},
		{
			id: 'phone',
			label: 'Phone',
			type: 'text',
			visible: false, // Hidden by default
			hideable: true,
			editable: true,
			sortable: true,
			filterable: true,
			getValue: (user) => user.phone || '—',
			getEditValue: (user) => user.phone || '',
			getSortValue: (user) => user.phone || '',
			field: 'phone',
			filterConfig: {
				type: 'text',
				placeholder: 'Filter by phone...'
			}
		},
		{
			id: 'mobilePhone',
			label: 'Mobile',
			type: 'text',
			visible: false, // Hidden by default
			hideable: true,
			editable: true,
			sortable: true,
			filterable: true,
			getValue: (user) => user.mobilePhone || '—',
			getEditValue: (user) => user.mobilePhone || '',
			getSortValue: (user) => user.mobilePhone || '',
			field: 'mobilePhone',
			filterConfig: {
				type: 'text',
				placeholder: 'Filter by mobile...'
			}
		},
		{
			id: 'birthDate',
			label: 'Birth Date',
			type: 'date',
			visible: false, // Hidden by default
			hideable: true,
			editable: true,
			sortable: true,
			filterable: false,
			getValue: (user) => {
				if (!user.birthDate) return '—';
				return new Date(user.birthDate).toLocaleDateString();
			},
			getEditValue: (user) => user.birthDate || '',
			getSortValue: (user) => (user.birthDate ? new Date(user.birthDate).getTime() : 0),
			field: 'birthDate'
		},
		{
			id: 'hireDate',
			label: 'Hire Date',
			type: 'date',
			visible: false, // Hidden by default
			hideable: true,
			editable: true,
			sortable: true,
			filterable: false,
			getValue: (user) => {
				if (!user.hireDate) return '—';
				return new Date(user.hireDate).toLocaleDateString();
			},
			getEditValue: (user) => user.hireDate || '',
			getSortValue: (user) => (user.hireDate ? new Date(user.hireDate).getTime() : 0),
			field: 'hireDate'
		},
		{
			id: 'status',
			label: 'Status',
			type: 'select',
			width: 'w-28',
			visible: true,
			hideable: true,
			editable: true,
			sortable: true,
			filterable: true,
			getValue: (user) => {
				// Map isActive to status display
				if (user.isActive === true) return 'Active';
				if (user.isActive === false) return 'Inactive';
				return 'Terminated';
			},
			getEditValue: (user) => {
				// Return lowercase for backend
				if (user.isActive === true) return 'active';
				if (user.isActive === false) return 'inactive';
				return 'terminated';
			},
			getSortValue: (user) => (user.isActive ? 'Active' : 'Inactive'),
			field: 'status',
			options: [
				{ value: 'active', label: 'Active' },
				{ value: 'inactive', label: 'Inactive' },
				{ value: 'terminated', label: 'Terminated' }
			],
			filterConfig: {
				type: 'select',
				options: [
					{ value: 'Active', label: 'Active' },
					{ value: 'Inactive', label: 'Inactive' },
					{ value: 'Terminated', label: 'Terminated' }
				]
			}
		},
		{
			id: 'createdAt',
			label: 'Created',
			type: 'date',
			visible: false, // Hidden by default
			hideable: true,
			editable: false,
			sortable: true,
			filterable: false,
			getValue: (user) => {
				if (!user.createdAt) return '—';
				return new Date(user.createdAt).toLocaleDateString();
			},
			getSortValue: (user) => (user.createdAt ? new Date(user.createdAt).getTime() : 0)
		},
		{
			id: 'updatedAt',
			label: 'Updated',
			type: 'date',
			visible: false, // Hidden by default
			hideable: true,
			editable: false,
			sortable: true,
			filterable: false,
			getValue: (user) => {
				if (!user.updatedAt) return '—';
				return new Date(user.updatedAt).toLocaleDateString();
			},
			getSortValue: (user) => (user.updatedAt ? new Date(user.updatedAt).getTime() : 0)
		},
		{
			id: 'lastLoginAt',
			label: 'Last Login',
			type: 'date',
			visible: false, // Hidden by default
			hideable: true,
			editable: false,
			sortable: true,
			filterable: false,
			getValue: (user) => {
				if (!user.lastLoginAt) return '—';
				return new Date(user.lastLoginAt).toLocaleDateString();
			},
			getSortValue: (user) => (user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : 0)
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
			sortable: false,
			filterable: false,
			getValue: () => ''
		}
	];

	// Spreadsheet configuration
	const config: SpreadsheetConfig<User> = {
		columns,
		getRowId: (user) => user.id,
		editMode: 'inline',
		enableSorting: true,
		enableFiltering: true,
		showColumnControls: true,
		showSaveButton: true,
		loading,
		emptyMessage: 'No users found',
		onSave: async (edits) => {
			if (onSaveEdits) {
				await onSaveEdits(edits);
			}
		},
		enableRowSelection: true,
		selectionMode: 'multiple',
		onSelectionChange,
		exportConfig: {
			enabled: true,
			formats: ['csv', 'excel'],
			filename: 'users',
			includeHiddenColumns: false
		},
		bulkActions: [
			{
				id: 'bulk-delete',
				label: 'Delete Selected',
				variant: 'destructive',
				requiresConfirmation: true,
				confirmationMessage: (count) =>
					`Are you sure you want to delete ${count} user${count === 1 ? '' : 's'}? This action cannot be undone.`,
				handler: async (selectedUsers, selectedIds) => {
					// Call onDeleteUser for each selected user
					for (const userId of selectedIds) {
						await onDeleteUser(userId);
					}
				}
			},
			{
				id: 'bulk-activate',
				label: 'Activate Selected',
				variant: 'default',
				requiresConfirmation: false,
				handler: async (selectedUsers) => {
					// Call onToggleStatus for each selected user that is currently inactive
					for (const user of selectedUsers) {
						if (!user.isActive) {
							await onToggleStatus(user);
						}
					}
				}
			},
			{
				id: 'bulk-deactivate',
				label: 'Deactivate Selected',
				variant: 'outline',
				requiresConfirmation: false,
				handler: async (selectedUsers) => {
					// Call onToggleStatus for each selected user that is currently active
					for (const user of selectedUsers) {
						if (user.isActive) {
							await onToggleStatus(user);
						}
					}
				}
			}
		]
	};
</script>

<SpreadsheetTable {config} data={filteredUsers}>
	<!-- prettier-ignore -->
	{#snippet customCell({ column, row }: { column: ColumnDefinition<User>; row: User; value: unknown })}
		{#if column.id === 'actions'}
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
