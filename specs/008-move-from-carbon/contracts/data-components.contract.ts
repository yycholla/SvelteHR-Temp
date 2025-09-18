/**
 * UI Component Contracts: Data Display Components
 *
 * Contract specifications for shadcn-svelte data presentation components
 * These contracts define the expected API and behavior for components
 * that display and interact with HR data (employees, departments, etc.)
 */

import type { Snippet } from 'svelte';
import type { ComponentType } from 'svelte';

// ============================================================================
// DATA TABLE CONTRACTS
// ============================================================================

/**
 * Data Table Component Contract
 * Replaces Carbon DataTable with TanStack Table-based implementation
 */
export interface DataTableContract<T = any> {
  /** Table data array */
  data: T[];

  /** Column definitions */
  columns: ColumnDef<T>[];

  /** Table caption for accessibility */
  caption?: string;

  /** Enable sorting functionality */
  enableSorting?: boolean;

  /** Enable filtering functionality */
  enableFiltering?: boolean;

  /** Enable pagination */
  enablePagination?: boolean;

  /** Enable row selection */
  enableSelection?: boolean;

  /** Page size options */
  pageSizeOptions?: number[];

  /** Default page size */
  defaultPageSize?: number;

  /** Loading state */
  loading?: boolean;

  /** Empty state content */
  emptyState?: Snippet;

  /** Table toolbar content */
  toolbar?: Snippet;

  /** Custom CSS classes */
  className?: string;

  /** Selection change callback */
  onSelectionChange?: (selectedRows: T[]) => void;

  /** Row click callback */
  onRowClick?: (row: T) => void;
}

/**
 * Column Definition Contract
 * Defines structure for table columns
 */
export interface ColumnDef<T = any> {
  /** Column identifier */
  id: string;

  /** Data accessor key */
  accessorKey?: keyof T;

  /** Column header text */
  header: string | ComponentType;

  /** Column header tooltip */
  headerTooltip?: string;

  /** Cell renderer */
  cell?: (props: CellContext<T>) => Snippet;

  /** Column width */
  width?: number | string;

  /** Minimum column width */
  minWidth?: number;

  /** Maximum column width */
  maxWidth?: number;

  /** Enable sorting for this column */
  enableSorting?: boolean;

  /** Enable filtering for this column */
  enableFiltering?: boolean;

  /** Column can be hidden */
  enableHiding?: boolean;

  /** Column is pinned */
  pinned?: 'left' | 'right';

  /** Column alignment */
  align?: 'left' | 'center' | 'right';

  /** Column data type for filtering */
  dataType?: 'text' | 'number' | 'date' | 'boolean' | 'select';

  /** Filter options for select type */
  filterOptions?: { label: string; value: any }[];

  /** Custom sort function */
  sortingFn?: (a: any, b: any) => number;

  /** Custom filter function */
  filterFn?: (row: T, columnId: string, filterValue: any) => boolean;
}

/**
 * Cell Context Contract
 * Context provided to cell renderers
 */
export interface CellContext<T = any> {
  /** Row data */
  row: T;

  /** Column definition */
  column: ColumnDef<T>;

  /** Cell value */
  value: any;

  /** Row index */
  rowIndex: number;

  /** Column index */
  columnIndex: number;

  /** Table instance */
  table: TableInstance<T>;
}

/**
 * Table Instance Contract
 * Table state and methods
 */
export interface TableInstance<T = any> {
  /** Get all rows */
  getRows(): T[];

  /** Get filtered rows */
  getFilteredRows(): T[];

  /** Get selected rows */
  getSelectedRows(): T[];

  /** Get current page rows */
  getPageRows(): T[];

  /** Current page index */
  getPageIndex(): number;

  /** Total page count */
  getPageCount(): number;

  /** Can go to previous page */
  getCanPreviousPage(): boolean;

  /** Can go to next page */
  getCanNextPage(): boolean;

  /** Go to specific page */
  setPageIndex(pageIndex: number): void;

  /** Change page size */
  setPageSize(pageSize: number): void;

  /** Current sorting state */
  getSortingState(): SortingState;

  /** Update sorting */
  setSorting(sorting: SortingState): void;

  /** Current filtering state */
  getFilteringState(): FilteringState;

  /** Update filtering */
  setFiltering(filtering: FilteringState): void;

  /** Current selection state */
  getSelectionState(): SelectionState;

  /** Update selection */
  setSelection(selection: SelectionState): void;
}

// ============================================================================
// CARD COMPONENTS CONTRACTS
// ============================================================================

/**
 * Card Component Contract
 * Replaces Carbon Tile components with modern card design
 */
export interface CardContract {
  /** Card content */
  children: Snippet;

  /** Card variant */
  variant?: 'default' | 'outline' | 'filled' | 'ghost';

  /** Card size */
  size?: 'sm' | 'md' | 'lg';

  /** Card is clickable */
  clickable?: boolean;

  /** Card is hoverable */
  hoverable?: boolean;

  /** Card padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /** Card border radius */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';

  /** Card shadow */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';

  /** Custom CSS classes */
  className?: string;

  /** Click handler */
  onClick?: () => void;

  /** Accessibility label */
  ariaLabel?: string;
}

/**
 * Card Header Contract
 * Header section of card components
 */
export interface CardHeaderContract {
  /** Header content */
  children: Snippet;

  /** Header title */
  title?: string;

  /** Header description */
  description?: string;

  /** Header actions */
  actions?: Snippet;

  /** Header variant */
  variant?: 'default' | 'compact';

  /** Custom CSS classes */
  className?: string;
}

/**
 * Card Content Contract
 * Main content area of card components
 */
export interface CardContentContract {
  /** Content */
  children: Snippet;

  /** Content padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /** Custom CSS classes */
  className?: string;
}

/**
 * Card Footer Contract
 * Footer section of card components
 */
export interface CardFooterContract {
  /** Footer content */
  children: Snippet;

  /** Footer alignment */
  align?: 'left' | 'center' | 'right' | 'between';

  /** Footer variant */
  variant?: 'default' | 'compact';

  /** Custom CSS classes */
  className?: string;
}

// ============================================================================
// METRIC/STAT COMPONENTS CONTRACTS
// ============================================================================

/**
 * Metric Card Contract
 * Statistical display component for dashboard metrics
 */
export interface MetricCardContract {
  /** Metric title */
  title: string;

  /** Metric value */
  value: string | number;

  /** Previous value for comparison */
  previousValue?: string | number;

  /** Change indicator */
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };

  /** Metric icon */
  icon?: ComponentType;

  /** Metric trend data */
  trend?: number[];

  /** Value prefix (e.g., $, %) */
  prefix?: string;

  /** Value suffix (e.g., %, users) */
  suffix?: string;

  /** Loading state */
  loading?: boolean;

  /** Metric variant */
  variant?: 'default' | 'success' | 'warning' | 'error';

  /** Card size */
  size?: 'sm' | 'md' | 'lg';

  /** Custom CSS classes */
  className?: string;

  /** Click handler */
  onClick?: () => void;
}

/**
 * Progress Indicator Contract
 * Progress bars and completion indicators
 */
export interface ProgressContract {
  /** Current progress value */
  value: number;

  /** Maximum value */
  max?: number;

  /** Progress label */
  label?: string;

  /** Show percentage */
  showPercentage?: boolean;

  /** Progress variant */
  variant?: 'default' | 'success' | 'warning' | 'error';

  /** Progress size */
  size?: 'sm' | 'md' | 'lg';

  /** Animated progress */
  animated?: boolean;

  /** Striped pattern */
  striped?: boolean;

  /** Custom CSS classes */
  className?: string;
}

// ============================================================================
// LIST COMPONENTS CONTRACTS
// ============================================================================

/**
 * List Component Contract
 * Structured lists for displaying data
 */
export interface ListContract<T = any> {
  /** List items */
  items: T[];

  /** Item renderer */
  renderItem: (item: T, index: number) => Snippet;

  /** List variant */
  variant?: 'default' | 'divided' | 'bordered';

  /** List size */
  size?: 'sm' | 'md' | 'lg';

  /** Empty state content */
  emptyState?: Snippet;

  /** Loading state */
  loading?: boolean;

  /** Virtual scrolling for large lists */
  virtual?: boolean;

  /** Item height for virtual scrolling */
  itemHeight?: number;

  /** Custom CSS classes */
  className?: string;

  /** Item click handler */
  onItemClick?: (item: T, index: number) => void;
}

/**
 * List Item Contract
 * Individual items in structured lists
 */
export interface ListItemContract {
  /** Item content */
  children: Snippet;

  /** Item is clickable */
  clickable?: boolean;

  /** Item is selected */
  selected?: boolean;

  /** Item is disabled */
  disabled?: boolean;

  /** Leading content (icon, avatar) */
  leading?: Snippet;

  /** Trailing content (actions, badge) */
  trailing?: Snippet;

  /** Item variant */
  variant?: 'default' | 'compact';

  /** Custom CSS classes */
  className?: string;

  /** Click handler */
  onClick?: () => void;
}

// ============================================================================
// DATA STATE CONTRACTS
// ============================================================================

/**
 * Sorting State Contract
 * Table sorting configuration
 */
export interface SortingState {
  /** Column ID being sorted */
  columnId: string;

  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Filtering State Contract
 * Table filtering configuration
 */
export interface FilteringState {
  /** Global search filter */
  globalFilter?: string;

  /** Column-specific filters */
  columnFilters: {
    columnId: string;
    value: any;
  }[];
}

/**
 * Selection State Contract
 * Table row selection state
 */
export interface SelectionState {
  /** Selected row IDs */
  selectedRowIds: Set<string>;

  /** All rows selected */
  allSelected: boolean;

  /** Some rows selected */
  someSelected: boolean;
}

/**
 * Pagination State Contract
 * Table pagination configuration
 */
export interface PaginationState {
  /** Current page index (0-based) */
  pageIndex: number;

  /** Number of items per page */
  pageSize: number;

  /** Total number of items */
  totalCount: number;

  /** Total number of pages */
  pageCount: number;
}

// ============================================================================
// ACCESSIBILITY CONTRACTS
// ============================================================================

/**
 * Data Component Accessibility Contract
 * WCAG compliance for data display components
 */
export interface DataAccessibilityContract {
  /** Table accessibility */
  table: {
    /** Table caption required */
    caption: string;

    /** Column headers properly associated */
    columnHeaders: boolean;

    /** Row headers for data tables */
    rowHeaders?: boolean;

    /** Sort controls accessible */
    sortControls: boolean;

    /** Filter controls accessible */
    filterControls: boolean;

    /** Pagination accessible */
    paginationControls: boolean;
  };

  /** Card accessibility */
  card: {
    /** Proper heading hierarchy */
    headingHierarchy: boolean;

    /** Focus management for clickable cards */
    focusManagement: boolean;

    /** Semantic markup */
    semanticMarkup: boolean;
  };

  /** List accessibility */
  list: {
    /** Proper list markup */
    listMarkup: boolean;

    /** Item roles and states */
    itemStates: boolean;

    /** Keyboard navigation */
    keyboardNavigation: boolean;
  };
}