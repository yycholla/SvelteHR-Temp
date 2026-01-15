# Spreadsheet Table Component

A powerful, reusable spreadsheet-like table component with column visibility controls and inline editing capabilities.

## Features

- ✅ **Column Visibility Controls** - Show/hide columns with a dropdown menu
- ✅ **Inline Editing** - Double-click cells to edit values in place
- ✅ **Batch Save** - Save all edits at once with a save button
- ✅ **Bulk Operations** - Select multiple rows and perform batch actions
- ✅ **Type Safe** - Full TypeScript support with generics
- ✅ **Customizable** - Custom cell renderers via snippets
- ✅ **Responsive** - Sticky headers and overflow handling
- ✅ **Accessible** - Keyboard navigation support

## Basic Usage

```svelte
<script lang="ts">
	import { SpreadsheetTable } from '$lib/components/ui/spreadsheet';
	import type { SpreadsheetConfig, ColumnDefinition } from '$lib/components/ui/spreadsheet';

	interface User {
		id: string;
		email: string;
		displayName: string;
		role: string;
	}

	const users: User[] = [
		{ id: '1', email: 'john@example.com', displayName: 'John Doe', role: 'admin' },
		{ id: '2', email: 'jane@example.com', displayName: 'Jane Smith', role: 'user' }
	];

	const columns: ColumnDefinition<User>[] = [
		{
			id: 'email',
			label: 'Email',
			type: 'text',
			visible: true,
			editable: true,
			getValue: (user) => user.email,
			getEditValue: (user) => user.email,
			field: 'email'
		},
		{
			id: 'displayName',
			label: 'Display Name',
			type: 'text',
			visible: true,
			editable: true,
			getValue: (user) => user.displayName,
			getEditValue: (user) => user.displayName,
			field: 'displayName'
		},
		{
			id: 'role',
			label: 'Role',
			type: 'badge',
			visible: true,
			editable: false,
			getValue: (user) => user.role
		}
	];

	const config: SpreadsheetConfig<User> = {
		columns,
		getRowId: (user) => user.id,
		editMode: 'inline',
		showColumnControls: true,
		showSaveButton: true,
		onSave: async (edits) => {
			console.log('Saving edits:', edits);
			// Make API calls to save changes
		}
	};
</script>

<SpreadsheetTable {config} data={users} />
```

## Column Definition

Each column is defined with the following properties:

```typescript
interface ColumnDefinition<T> {
	/** Unique identifier */
	id: string;

	/** Display label */
	label: string;

	/** Column type: 'text' | 'number' | 'date' | 'select' | 'badge' | 'custom' */
	type: ColumnType;

	/** Width class (e.g., 'w-1/3', 'w-24') */
	width?: string;

	/** Visible by default? */
	visible?: boolean;

	/** Can be hidden by user? */
	hideable?: boolean;

	/** Can be edited inline? */
	editable?: boolean;

	/** Extract value from row */
	getValue: (row: T) => unknown;

	/** Get editable value (for editable columns) */
	getEditValue?: (row: T) => string | number | boolean;

	/** Field name to update (for editable columns) */
	field?: string;

	/** Custom render function */
	render?: (value: unknown, row: T) => string;

	/** Options for select type */
	options?: Array<{ value: string | number; label: string }>;

	/** Alignment: 'left' | 'center' | 'right' */
	align?: 'left' | 'center' | 'right';

	/** Truncate long text? */
	truncate?: boolean;

	/** Max width for truncation */
	maxWidth?: string;
}
```

## Custom Cell Rendering

For columns with complex rendering needs (like action buttons), use the `customCell` snippet:

```svelte
<SpreadsheetTable {config} data={users}>
	{#snippet customCell({ column, row, value })}
		{#if column.id === 'actions'}
			<div class="flex gap-2">
				<button onclick={() => editRow(row)}>Edit</button>
				<button onclick={() => deleteRow(row)}>Delete</button>
			</div>
		{/if}
	{/snippet}
</SpreadsheetTable>
```

## Column Types

### Text

Basic text display and editing:

```typescript
{
	id: 'name',
	type: 'text',
	editable: true,
	getValue: (row) => row.name,
	getEditValue: (row) => row.name,
	field: 'name'
}
```

### Number

Numeric values with number input:

```typescript
{
	id: 'age',
	type: 'number',
	editable: true,
	getValue: (row) => row.age,
	getEditValue: (row) => row.age,
	field: 'age'
}
```

### Date

Date values with date input:

```typescript
{
	id: 'createdAt',
	type: 'date',
	editable: true,
	getValue: (row) => new Date(row.createdAt).toLocaleDateString(),
	getEditValue: (row) => row.createdAt,
	field: 'createdAt'
}
```

### Select

Dropdown selection:

```typescript
{
	id: 'status',
	type: 'select',
	editable: true,
	getValue: (row) => row.status,
	getEditValue: (row) => row.status,
	field: 'status',
	options: [
		{ value: 'active', label: 'Active' },
		{ value: 'inactive', label: 'Inactive' }
	]
}
```

### Badge

Read-only badge display:

```typescript
{
	id: 'role',
	type: 'badge',
	getValue: (row) => row.role
}
```

### Custom

For complex rendering with custom snippets:

```typescript
{
	id: 'actions',
	type: 'custom',
	getValue: () => ''
}
```

## Editing Features

### Inline Editing

- Double-click any editable cell to start editing
- Press `Enter` to save
- Press `Escape` to cancel
- Edited cells are highlighted in yellow

### Batch Save

- All edits are tracked in pending state
- Click "Save Changes" to commit all edits at once
- The `onSave` callback receives an array of all edits

### Edit Structure

```typescript
interface RowEdit<T> {
	rowId: string; // Unique row identifier
	field: string; // Field name being edited
	value: unknown; // New value
	originalRow: T; // Original row data
}
```

## Bulk Operations

### Row Selection

Enable row selection to allow users to select multiple rows and perform batch operations:

```typescript
const config: SpreadsheetConfig<User> = {
	// ... other config
	enableRowSelection: true,
	selectionMode: 'multiple', // or 'single'
	onSelectionChange: (selectedIds) => {
		console.log('Selected:', selectedIds);
	}
};
```

When enabled:

- A checkbox column appears as the first column
- Click checkboxes to select/deselect rows
- Click the header checkbox to select/deselect all visible rows
- Selected rows are highlighted with a blue background

### Bulk Actions

Define bulk actions that appear when rows are selected:

```typescript
const config: SpreadsheetConfig<User> = {
	// ... other config
	enableRowSelection: true,
	bulkActions: [
		{
			id: 'bulk-delete',
			label: 'Delete Selected',
			variant: 'destructive',
			requiresConfirmation: true,
			confirmationMessage: (count) => `Delete ${count} user(s)?`,
			handler: async (selectedRows, selectedIds) => {
				// Perform bulk delete operation
				for (const userId of selectedIds) {
					await deleteUser(userId);
				}
			}
		},
		{
			id: 'bulk-activate',
			label: 'Activate Selected',
			variant: 'default',
			handler: async (selectedRows) => {
				// Activate all selected users
				for (const user of selectedRows) {
					await activateUser(user.id);
				}
			}
		}
	]
};
```

### Bulk Action Configuration

```typescript
interface BulkAction<T> {
	/** Unique identifier */
	id: string;

	/** Button label */
	label: string;

	/** Button variant: 'default' | 'destructive' | 'outline' */
	variant?: 'default' | 'destructive' | 'outline';

	/** Require confirmation dialog? */
	requiresConfirmation?: boolean;

	/** Confirmation message (can be function) */
	confirmationMessage?: string | ((count: number) => string);

	/** Handler function */
	handler: (selectedRows: T[], selectedIds: Set<string>) => Promise<void> | void;
}
```

### Bulk Actions Toolbar

When rows are selected, a toolbar appears showing:

- Count of selected items
- Bulk action buttons
- "Deselect All" button

The toolbar automatically:

- Shows confirmation dialogs for destructive actions
- Handles async operations
- Displays error states
- Deselects rows after successful operations

### Selection Modes

- **`multiple`** (default): Select any number of rows
- **`single`**: Only one row can be selected at a time

### Selection State

Access selection state programmatically:

```typescript
const config: SpreadsheetConfig<User> = {
	// ... other config
	onSelectionChange: (selectedIds) => {
		console.log('Selected IDs:', Array.from(selectedIds));
		// Update external state if needed
	}
};
```

## Column Visibility

### Show/Hide Columns

Users can show or hide columns using the "Columns" dropdown:

- Shows count of visible/total columns
- Quick "Show All" / "Hide All" buttons
- Individual column toggles

### Column Configuration

```typescript
{
	id: 'optional-field',
	label: 'Optional Field',
	visible: false,     // Hidden by default
	hideable: true,     // Can be shown by user
	// ...
}

{
	id: 'required-field',
	label: 'Required Field',
	visible: true,      // Shown by default
	hideable: false,    // Cannot be hidden
	// ...
}
```

## Configuration Options

```typescript
interface SpreadsheetConfig<T> {
	/** Column definitions */
	columns: ColumnDefinition<T>[];

	/** Extract unique ID from row */
	getRowId: (row: T) => string;

	/** Edit mode: 'none' | 'inline' | 'modal' */
	editMode?: EditMode;

	/** Show column visibility controls? */
	showColumnControls?: boolean;

	/** Show save button when edits exist? */
	showSaveButton?: boolean;

	/** Callback when data is edited */
	onEdit?: (edits: RowEdit<T>[]) => void | Promise<void>;

	/** Callback when save is clicked */
	onSave?: (edits: RowEdit<T>[]) => void | Promise<void>;

	/** Enable row selection with checkboxes */
	enableRowSelection?: boolean;

	/** Bulk actions available when rows are selected */
	bulkActions?: BulkAction<T>[];

	/** Selection mode: 'single' | 'multiple' */
	selectionMode?: 'single' | 'multiple';

	/** Callback when selection changes */
	onSelectionChange?: (selectedIds: Set<string>) => void;

	/** Loading state */
	loading?: boolean;

	/** Empty state message */
	emptyMessage?: string;
}
```

## Complete Examples

See these files for complete working examples:

- `src/routes/admin/users/components/UserSpreadsheet.svelte` - User management with inline editing and save functionality
- `src/routes/admin/trainings/components/TrainingSpreadsheet.svelte` - Training modules with custom cells

## Styling

The component uses Tailwind CSS and follows the existing design system:

- Sticky headers with backdrop blur
- Bordered cells (spreadsheet-like)
- Hover effects on rows and cells
- Yellow highlight for edited cells
- Group-based action button visibility

## Tips

1. **Always show critical columns**: Set `hideable: false` for columns users always need (like name, email, actions)
2. **Hide optional columns by default**: Set `visible: false` for columns that are nice-to-have but not essential
3. **Use truncation for long text**: Enable `truncate: true` and set `maxWidth` to prevent layout issues
4. **Keep field names consistent**: The `field` property should match your backend field names for easy saving
5. **Use custom cells sparingly**: Only use custom rendering when absolutely necessary
