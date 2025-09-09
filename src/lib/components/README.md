# Modular Streaming Components

This document provides an overview of the modular streaming component system we've built to improve reusability and maintainability across the HR application.

## Architecture Overview

### 🎯 **Goals**

- **Reusability**: Components that can be used across different pages and contexts
- **Consistency**: Unified design language and behavior patterns
- **Maintainability**: Centralized logic for common patterns like data transformations
- **Performance**: Efficient data handling with proper loading and error states
- **Accessibility**: Built-in keyboard navigation and screen reader support

### 📁 **File Structure**

```
src/lib/
├── components/
│   ├── common/                    # Reusable components
│   │   ├── StatCard.svelte        # Statistics cards with trends
│   │   ├── StreamingCard.svelte   # Generic card container for streaming data
│   │   ├── EmployeeList.svelte    # Employee lists with avatars and status
│   │   ├── ActivityFeed.svelte    # Activity timeline feed
│   │   ├── TaskList.svelte        # Task lists with priorities and due dates
│   │   └── DepartmentChart.svelte # Department distribution charts
│   ├── streaming/
│   │   └── GenericStreamingPage.svelte # Generic streaming page wrapper
│   └── hr/
│       └── StreamingHRDashboard.svelte # Example usage of modular system
└── utils/
    └── dataTransformers.ts        # Data transformation utilities
```

## Core Components

### 1. 📊 **StatCard** (`/common/StatCard.svelte`)

A reusable statistics card component with support for trends, icons, and navigation.

**Features:**

- **Trend indicators** with color coding (positive/negative/warning/neutral)
- **Click navigation** with proper accessibility
- **Loading states** with skeleton animations
- **Icon support** for visual branding
- **Tag system** for categorization

**Usage:**

```svelte
<StatCard
	title="Total Employees"
	value={245}
	icon={Users}
	trend={{ value: '+12 this month', type: 'positive' }}
	tag="#hr"
	href="/hr/employees"
	loading={false}
/>
```

### 2. 🎴 **StreamingCard** (`/common/StreamingCard.svelte`)

A flexible card container for streaming data with built-in loading and empty states.

**Features:**

- **Slot-based content** for maximum flexibility
- **Loading states** with animated skeletons
- **Empty states** with customizable messages
- **Header with icon and tags** for consistent branding
- **Click navigation** support

**Usage:**

```svelte
<StreamingCard
	title="Recent Activities"
	description="Latest system updates"
	icon={Clock}
	tag="#hr"
	href="/hr/activities"
	loading={!dataLoaded}
	empty={activities.length === 0}
	emptyMessage="No recent activities"
>
	{#snippet children()}
		<ActivityFeed {activities} showCount={5} />
	{/snippet}
</StreamingCard>
```

### 3. 👥 **EmployeeList** (`/common/EmployeeList.svelte`)

Displays employee information with avatars, status badges, and department info.

**Features:**

- **Avatar generation** from initials
- **Status badges** with semantic colors
- **Department display** (optional)
- **Count limiting** with "more" indicators
- **Responsive design** for mobile devices

**Usage:**

```svelte
<EmployeeList
	employees={onboardingEmployees}
	showCount={3}
	showStatus={true}
	showDepartment={true}
/>
```

### 4. 📈 **ActivityFeed** (`/common/ActivityFeed.svelte`)

Timeline-style display for system activities and events.

**Features:**

- **Colored indicators** based on activity type
- **Timestamp formatting** with relative dates
- **Type-based styling** (employee/task/compliance/system)
- **Truncation support** with remaining count

**Usage:**

```svelte
<ActivityFeed activities={recentActivities} showCount={5} />
```

### 5. ✅ **TaskList** (`/common/TaskList.svelte`)

Task display with priority badges, due dates, and overdue indicators.

**Features:**

- **Priority badges** with color coding
- **Overdue highlighting** with visual warnings
- **Type categorization** (onboarding/compliance/general)
- **Flexible display options** for different contexts

**Usage:**

```svelte
<TaskList
	tasks={priorityTasks}
	showCount={3}
	showPriority={true}
	showType={false}
	showDueDate={true}
/>
```

### 6. 🏢 **DepartmentChart** (`/common/DepartmentChart.svelte`)

Visual representation of department distribution with progress bars.

**Features:**

- **Progress bars** with departmental colors
- **Percentage calculations** and display
- **Employee counts** with proper pluralization
- **Animated progress** bars on load

**Usage:**

```svelte
<DepartmentChart
	departments={departmentData}
	showPercentage={true}
	showProgress={true}
	showCount={true}
/>
```

## Data Transformation Utilities

### 🔄 **dataTransformers.ts** (`/utils/dataTransformers.ts`)

Centralized data transformation and validation utilities.

**Key Functions:**

#### Safe Array Operations

```typescript
// Safely convert any data to array
safeArray<T>(data: unknown): T[]

// Safely filter with type checking
safeFilter<T>(data: unknown, predicate: (item: T) => boolean): T[]

// Safely map with type checking
safeMap<T, R>(data: unknown, mapper: (item: T) => R): R[]
```

#### Data Transformers

```typescript
// Transform employee data to statistics
transformEmployeeStats(employees: unknown): EmployeeStats

// Transform task data to statistics
transformTaskStats(tasks: unknown): TaskStats

// Transform employee data to department breakdown
transformDepartmentData(employees: unknown): DepartmentData[]

// Transform events to activity feed format
transformActivityData(events: unknown, limit?: number): ActivityItem[]

// Transform tasks to display format
transformTaskData(tasks: unknown, limit?: number): TaskItem[]
```

#### Utility Functions

```typescript
// Format dates consistently
formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string

// Check if data is valid and has content
hasData(data: unknown): boolean

// Calculate trends between two values
calculateTrend(current: number, previous: number): TrendData
```

## Usage Example: Refactored HR Dashboard

The `StreamingHRDashboard` component demonstrates how to use the modular system:

```svelte
<script lang="ts">
	// Import modular components
	import StatCard from '$lib/components/common/StatCard.svelte';
	import StreamingCard from '$lib/components/common/StreamingCard.svelte';
	import EmployeeList from '$lib/components/common/EmployeeList.svelte';

	// Import data transformers
	import {
		transformEmployeeStats,
		transformTaskStats,
		hasData
	} from '$lib/utils/dataTransformers.js';

	// Transform data using utilities
	let employeeStats = $derived(transformEmployeeStats(employees));
	let taskStats = $derived(transformTaskStats(tasks));
	let dataLoaded = $derived(hasData(data['employees']));
</script>

<!-- Use modular components -->
<StatCard
	title="Total Employees"
	value={employeeStats.totalEmployees}
	icon={Users}
	tag="#hr"
	href="/hr/employees"
	loading={!dataLoaded}
/>

<StreamingCard
	title="Onboarding Pipeline"
	description="New hire progress tracking"
	icon={Target}
	tag="#hr"
	loading={!dataLoaded}
	empty={employeeStats.onboardingEmployees === 0}
>
	{#snippet children()}
		<EmployeeList employees={onboardingEmployees} showCount={3} showDepartment={true} />
	{/snippet}
</StreamingCard>
```

## Benefits of the Modular System

### 🔧 **For Developers**

1. **Reduced Code Duplication**: Common patterns are centralized in reusable components
2. **Consistent APIs**: All components follow similar prop patterns and conventions
3. **Type Safety**: Full TypeScript support with proper interfaces
4. **Easy Testing**: Components can be tested independently
5. **Better Maintainability**: Changes to common patterns update across the app

### 🎨 **For Design**

1. **Design System Consistency**: Components enforce consistent visual language
2. **Responsive by Default**: All components include mobile-first responsive design
3. **Accessibility Built-in**: Proper ARIA labels, keyboard navigation, and screen reader support
4. **Loading States**: Consistent skeleton loading animations
5. **Empty States**: Standardized empty state messaging and icons

### ⚡ **For Performance**

1. **Efficient Data Handling**: Transformers prevent repeated array operations
2. **Safe Operations**: Null checking prevents runtime errors
3. **Optimized Rendering**: Components only re-render when necessary
4. **Bundle Optimization**: Tree shaking eliminates unused code

## Migration Guide

### Converting Existing Components

1. **Identify Patterns**: Look for repeated code patterns across components
2. **Extract Common Logic**: Move data transformations to `/utils/dataTransformers.ts`
3. **Replace with Modular Components**: Swap custom implementations for modular components
4. **Update Props**: Adjust to use standardized prop interfaces
5. **Test Thoroughly**: Ensure functionality matches original implementation

### Best Practices

1. **Use Data Transformers**: Always use utilities for data processing to ensure consistency
2. **Handle Loading States**: Pass proper loading flags to components
3. **Provide Empty States**: Include meaningful empty state messages
4. **Add Navigation**: Use href props for clickable components where appropriate
5. **Include Tags**: Use the tag system for categorization and filtering
6. **Test Responsiveness**: Verify components work well on all screen sizes

## Future Enhancements

### Planned Features

1. **More Data Visualizations**: Charts, graphs, and advanced analytics components
2. **Enhanced Animations**: More sophisticated loading and transition animations
3. **Theming System**: Support for different color themes and branding
4. **Advanced Filtering**: Built-in filtering and sorting capabilities
5. **Real-time Updates**: WebSocket integration for live data updates

### Contribution Guidelines

1. **Follow TypeScript**: Use proper interfaces and type definitions
2. **Include Props Documentation**: Document all props with examples
3. **Add Responsive Design**: Ensure components work on all screen sizes
4. **Test Accessibility**: Verify keyboard navigation and screen reader compatibility
5. **Update Documentation**: Keep this README updated with changes

---

This modular system provides a solid foundation for building consistent, maintainable, and performant streaming applications. The components are designed to be flexible enough for various use cases while maintaining consistency across the application.
