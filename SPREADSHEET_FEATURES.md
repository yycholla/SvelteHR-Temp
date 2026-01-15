# Enhanced Spreadsheet Features for Admin Tables

## Overview

I've added powerful spreadsheet-like features to your admin tables:

1. ✅ **Column Visibility Controls** - Show/hide columns based on your needs
2. ✅ **Inline Editing** - Edit cells directly in the table (double-click to edit)
3. ✅ **Batch Save** - Make multiple edits and save them all at once
4. ✅ **Type-Safe** - Full TypeScript support with generics
5. ✅ **Reusable** - Works with any data structure

## What Was Created

### Core Components

Located in `src/lib/components/ui/spreadsheet/`:

- **`SpreadsheetTable.svelte`** - Main table component with all features
- **`ColumnVisibilityControl.svelte`** - Dropdown for showing/hiding columns
- **`types.ts`** - TypeScript definitions
- **`README.md`** - Comprehensive documentation

### Example Implementations

1. **User Management** (`src/routes/admin/users/components/UserSpreadsheet.svelte`)
   - Editable email and display name
   - Show/hide columns: Created date, Last login
   - Custom status and actions columns

2. **Training Modules** (`src/routes/admin/trainings/components/TrainingSpreadsheet.svelte`)
   - Editable title, description, dates
   - Show/hide columns: Description, Created date
   - Custom assignment display and actions

3. **Enhanced User Page** (`src/routes/admin/users/+page-enhanced.svelte`)
   - Full integration example with save functionality
   - Shows how to handle batch updates

## Quick Start

### 1. Define Your Columns

```typescript
const columns: ColumnDefinition<YourType>[] = [
	{
		id: 'name',
		label: 'Name',
		type: 'text',
		visible: true, // Show by default
		hideable: false, // Cannot be hidden
		editable: true, // Allow inline editing
		getValue: (row) => row.name,
		getEditValue: (row) => row.name,
		field: 'name' // Backend field name
	},
	{
		id: 'optional',
		label: 'Optional Info',
		type: 'text',
		visible: false, // Hidden by default
		hideable: true, // Can be shown by user
		editable: false,
		getValue: (row) => row.optional
	}
];
```

### 2. Create Configuration

```typescript
const config: SpreadsheetConfig<YourType> = {
	columns,
	getRowId: (row) => row.id,
	editMode: 'inline',
	showColumnControls: true,
	showSaveButton: true,
	onSave: async (edits) => {
		// Handle saving edits to backend
		for (const edit of edits) {
			await updateRecord(edit.rowId, {
				[edit.field]: edit.value
			});
		}
	}
};
```

### 3. Use the Component

```svelte
<SpreadsheetTable {config} data={yourData}>
	{#snippet customCell({ column, row, value })}
		{#if column.id === 'actions'}
			<!-- Custom action buttons -->
			<button onclick={() => edit(row)}>Edit</button>
			<button onclick={() => delete row.id}>Delete</button>
		{/if}
	{/snippet}
</SpreadsheetTable>
```

## Column Types

- **`text`** - Editable text input
- **`number`** - Editable number input
- **`date`** - Editable date input
- **`select`** - Dropdown with predefined options
- **`badge`** - Read-only badge display
- **`custom`** - Custom rendering with snippets

## Usage in Your Admin Pages

### Option 1: Use Directly (Recommended for new tables)

Replace your existing table component with `SpreadsheetTable`:

```svelte
<!-- Before -->
<UserTable {filteredUsers} ... />

<!-- After -->
<UserSpreadsheet {filteredUsers} ... />
```

### Option 2: Gradual Migration

To test before fully committing:

1. Create a component like `UserSpreadsheet.svelte`
2. Import it conditionally in your page
3. Toggle between old and new with a flag
4. Once satisfied, replace the old table completely

## Features in Action

### Column Visibility

Click the "Columns" button in the table header to:

- Toggle individual columns on/off
- See count of visible columns (e.g., "5/7")
- Use "Show All" or "Hide All" quick actions

### Inline Editing

1. Double-click any editable cell
2. Edit the value
3. Press `Enter` to confirm or `Escape` to cancel
4. Edited cells turn yellow to show pending changes
5. Click "Save Changes" to commit all edits at once

### Batch Saving

- Make multiple edits across different rows
- See count of unsaved changes in header
- Click "Save Changes" to commit all at once
- All edits sent to backend in a single batch

## Next Steps

1. **Review the Examples**
   - Check `UserSpreadsheet.svelte` for a complete implementation
   - See `TrainingSpreadsheet.svelte` for another pattern

2. **Apply to Other Tables**
   - Use `UserSpreadsheet.svelte` as a template
   - Copy the pattern to onboarding, trainings, etc.
   - See `TrainingSpreadsheet.svelte` for another example

3. **Customize Columns**
   - Add more hideable columns (like audit timestamps)
   - Make more fields editable as needed
   - Add select dropdowns for status changes

4. **Backend Integration**
   - Update the `onSave` callback with your actual mutations
   - Add error handling and toast notifications
   - Implement optimistic updates if desired

## Files Reference

### Core Components

- `src/lib/components/ui/spreadsheet/SpreadsheetTable.svelte`
- `src/lib/components/ui/spreadsheet/ColumnVisibilityControl.svelte`
- `src/lib/components/ui/spreadsheet/types.ts`
- `src/lib/components/ui/spreadsheet/index.ts`

### Examples

- `src/routes/admin/users/components/UserSpreadsheet.svelte`
- `src/routes/admin/users/+page-enhanced.svelte`
- `src/routes/admin/trainings/components/TrainingSpreadsheet.svelte`

### Documentation

- `src/lib/components/ui/spreadsheet/README.md` - Full documentation
- This file - Quick reference guide

## Tips

1. **Start with column visibility** - It's the easiest feature to add
2. **Make common fields editable** - Like names, titles, descriptions
3. **Keep critical columns always visible** - Email, name, actions
4. **Use custom cells for complex UI** - Status toggles, action menus
5. **Test thoroughly** - Inline editing changes your data!

## Questions?

Check the detailed documentation in:
`src/lib/components/ui/spreadsheet/README.md`
