/**
 * Spreadsheet Table Types
 *
 * Provides type-safe configuration for spreadsheet-like tables with
 * column visibility controls and inline editing capabilities.
 */

export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'badge' | 'custom';

export type EditMode = 'none' | 'inline' | 'modal';

export interface ColumnDefinition<T = unknown> {
	/** Unique identifier for the column */
	id: string;

	/** Display label for column header */
	label: string;

	/** Column type determines rendering and editing behavior */
	type: ColumnType;

	/** Width class (e.g., 'w-1/3', 'w-24', 'w-48') */
	width?: string;

	/** Whether column is visible by default */
	visible?: boolean;

	/** Whether column can be hidden by user */
	hideable?: boolean;

	/** Whether column is editable */
	editable?: boolean;

	/** Extract value from row data */
	getValue: (row: T) => unknown;

	/** For editable columns: get editable value */
	getEditValue?: (row: T) => string | number | boolean;

	/** For editable columns: field name to update */
	field?: string;

	/** Custom render function for cell content */
	render?: (value: unknown, row: T) => string;

	/** For select type: available options */
	options?: Array<{ value: string | number; label: string }>;

	/** Additional CSS classes for the cell */
	cellClass?: string;

	/** Additional CSS classes for the header */
	headerClass?: string;

	/** Alignment */
	align?: 'left' | 'center' | 'right';

	/** Whether to truncate long text */
	truncate?: boolean;

	/** Max width for truncation */
	maxWidth?: string;
}

export interface RowEdit<T = unknown> {
	rowId: string;
	field: string;
	value: unknown;
	originalRow: T;
}

export interface SpreadsheetConfig<T = unknown> {
	/** Column definitions */
	columns: ColumnDefinition<T>[];

	/** Function to extract unique ID from row */
	getRowId: (row: T) => string;

	/** Edit mode for the table */
	editMode?: EditMode;

	/** Whether to show column visibility controls */
	showColumnControls?: boolean;

	/** Whether to show save button when edits exist */
	showSaveButton?: boolean;

	/** Callback when data is edited */
	onEdit?: (edits: RowEdit<T>[]) => void | Promise<void>;

	/** Callback when save is clicked */
	onSave?: (edits: RowEdit<T>[]) => void | Promise<void>;

	/** Whether table is in loading state */
	loading?: boolean;

	/** Empty state message */
	emptyMessage?: string;
}

export interface ColumnVisibility {
	[columnId: string]: boolean;
}
