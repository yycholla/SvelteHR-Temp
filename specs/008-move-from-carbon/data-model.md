# Data Model: shadcn-svelte UI Migration

**Feature**: Migration from Carbon Design to shadcn-svelte UI System
**Date**: 2025-09-18

## UI Component Entities

### Layout Structure
**Entity**: `UILayout`
**Purpose**: Main application layout with sidebar and header
**Fields**:
- `sidebarOpen: boolean` - Sidebar visibility state
- `sidebarWidth: 'sm' | 'md' | 'lg'` - Sidebar width variant
- `headerHeight: number` - Header height in pixels
- `theme: 'light' | 'dark' | 'system'` - Color theme preference

**State Transitions**:
- Closed → Open (user clicks sidebar trigger)
- Open → Closed (user clicks trigger or outside area)
- Light → Dark → System (theme cycling)

**Validation Rules**:
- Sidebar width must be valid variant
- Header height minimum 48px for accessibility
- Theme preference persisted in localStorage

### Navigation Components
**Entity**: `NavigationItem`
**Purpose**: Individual menu items in sidebar navigation
**Fields**:
- `id: string` - Unique identifier
- `label: string` - Display text
- `href: string` - Route path
- `icon: ComponentType` - Lucide icon component
- `active: boolean` - Current page indicator
- `children: NavigationItem[]` - Nested menu items
- `permission: string` - Required role for visibility

**Relationships**:
- Parent-child hierarchy for nested menus
- Role-based filtering based on user permissions

**Validation Rules**:
- ID must be unique across navigation tree
- href must be valid SvelteKit route
- Permission must match existing role system

### Data Display Components
**Entity**: `DataTableConfig`
**Purpose**: Configuration for employee and department data tables
**Fields**:
- `columns: ColumnDef[]` - Table column definitions
- `data: T[]` - Generic data array
- `sorting: SortingState` - Current sort configuration
- `filtering: FilteringState` - Active filters
- `pagination: PaginationState` - Page size and current page
- `selection: RowSelectionState` - Selected rows

**Validation Rules**:
- Column accessorKey must exist in data objects
- Page size must be positive integer
- Sort direction must be 'asc' | 'desc' | null

### Interactive Elements
**Entity**: `ComponentVariants`
**Purpose**: Standardized component styling variants
**Fields**:
- `variant: 'default' | 'outline' | 'ghost' | 'destructive'` - Style variant
- `size: 'sm' | 'md' | 'lg'` - Size variant
- `disabled: boolean` - Interaction state
- `loading: boolean` - Async operation state

**State Transitions**:
- Idle → Loading (async operation starts)
- Loading → Idle (operation completes)
- Enabled → Disabled (validation failure)

### Form Components
**Entity**: `FormField`
**Purpose**: Individual form input with validation
**Fields**:
- `name: string` - Field identifier
- `label: string` - Display label
- `type: 'text' | 'email' | 'select' | 'checkbox' | 'textarea'` - Input type
- `value: any` - Current value
- `error: string | null` - Validation error message
- `required: boolean` - Validation requirement
- `placeholder: string` - Input placeholder text

**Validation Rules**:
- Required fields must have non-empty values
- Email fields must match email pattern
- Error messages must be user-friendly

## UI State Management

### Theme Configuration
**Entity**: `ThemeConfig`
**Purpose**: CSS variable definitions for light/dark themes
**Fields**:
- `primary: HSLColor` - Primary brand color
- `secondary: HSLColor` - Secondary accent color
- `background: HSLColor` - Main background color
- `foreground: HSLColor` - Text color
- `border: HSLColor` - Border and divider color
- `muted: HSLColor` - Subdued background areas

**Relationships**:
- Each color has corresponding foreground variant
- Theme variants (light/dark) share same structure

### Component State
**Entity**: `ComponentState`
**Purpose**: Runtime state for interactive components
**Fields**:
- `isOpen: boolean` - Modal/popover visibility
- `isLoading: boolean` - Async operation state
- `isDisabled: boolean` - Interaction availability
- `isDirty: boolean` - Form modification state
- `isValid: boolean` - Validation status

**State Transitions**:
- Form: Pristine → Dirty → Valid/Invalid → Submitted
- Modal: Closed → Opening → Open → Closing → Closed
- Loading: Idle → Loading → Success/Error → Idle

## Integration Points

### Existing Data Models (Preserved)
**Employee Entity**: Existing PostgreSQL schema maintained
**Department Entity**: Current structure preserved
**User Roles**: Existing RBAC system unchanged
**Authentication**: JWT token system continues

### API Contracts (Unchanged)
**PostGraphile Endpoint**: `/api/graphql` continues serving data
**Authentication Flow**: Cookie-based JWT authentication preserved
**Query Structure**: Existing GraphQL queries compatible

### Component Props Interface
**Entity**: `ComponentProps`
**Purpose**: TypeScript interfaces for component props
**Fields**:
- `className?: string` - Additional CSS classes
- `children?: Snippet` - Svelte 5 child content
- `variant?: VariantType` - Component style variant
- `size?: SizeType` - Component size variant
- `disabled?: boolean` - Interaction state
- `...restProps` - Additional HTML attributes

## Migration State Tracking

### Component Migration Status
**Entity**: `MigrationProgress`
**Purpose**: Track component replacement progress
**Fields**:
- `componentName: string` - Component being migrated
- `status: 'pending' | 'in-progress' | 'completed' | 'tested'` - Migration state
- `carbonComponent: string` - Original Carbon component name
- `shadcnComponent: string` - Target shadcn component name
- `dependencies: string[]` - Required dependencies
- `testsPassing: boolean` - Test suite status

**Validation Rules**:
- Status transitions must follow: pending → in-progress → completed → tested
- Dependencies must be installed before component migration
- Tests must pass before marking completed

This data model maintains all existing HR functionality while defining the new UI component structure and migration approach for the shadcn-svelte implementation.