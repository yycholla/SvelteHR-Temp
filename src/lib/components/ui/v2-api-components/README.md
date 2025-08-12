# SvelteHR v2 API UI Components

This document provides comprehensive specifications and implementation guidelines for the v2 API integration UI components in SvelteHR.

## Overview

The v2 API integration introduces real-time capabilities through WebSocket connections, background job processing, enhanced bulk operations, and live dashboard updates. These new UI components provide a modern, accessible interface for these advanced features.

## Component Architecture

### Design Principles
- **Consistency**: All components follow the established Tailwind variants pattern
- **Accessibility**: WCAG 2.1 AA compliance with proper ARIA attributes
- **Responsiveness**: Mobile-first design with graceful degradation
- **Performance**: Optimized rendering with minimal re-renders
- **Real-time**: WebSocket-powered live updates with fallback states

### Technology Stack
- **Styling**: Tailwind CSS with tailwind-variants for component variants
- **Icons**: Lucide Svelte for consistent iconography
- **Dates**: date-fns for date formatting and manipulation
- **Animation**: CSS transitions with Tailwind's animation utilities

## Component Specifications

### 1. WebSocket Connection Indicator

**Purpose**: Displays real-time WebSocket connection status across the application.

**Features**:
- Connection states: connected, disconnected, connecting, reconnecting
- Auto-hide when connected (configurable)
- Latency display for performance monitoring
- Retry count during reconnection attempts
- Customizable positioning (top/bottom + left/right)

**Usage**:
```svelte
<script>
  import { WebSocketIndicator } from '$lib/components/ui';
  
  let connectionStatus = 'connected';
  let latency = 45;
</script>

<WebSocketIndicator 
  status={connectionStatus}
  {latency}
  position="top-right"
  variant="detailed"
  showWhenConnected={false}
/>
```

**Accessibility**:
- `role="status"` for screen readers
- `aria-live="polite"` for status updates
- `aria-label` describing connection state

### 2. Real-time Notification Center

**Purpose**: WebSocket-powered notification system with toast alerts and history.

**Features**:
- Real-time notifications via WebSocket
- Toast notifications with auto-dismiss
- Notification categorization and filtering
- Mark as read/unread functionality
- Priority levels (info, warning, error, success, urgent)
- Action buttons with external links
- Keyboard navigation support

**Components**:
- `NotificationCenter`: Main panel for notification history
- `ToastNotification`: Individual toast notification popup

**Usage**:
```svelte
<script>
  import { NotificationCenter, ToastNotification } from '$lib/components/ui';
  
  let notifications = [];
  let notificationCenterOpen = false;
</script>

<!-- Notification Center Panel -->
<NotificationCenter 
  {notifications}
  isOpen={notificationCenterOpen}
  onClose={() => notificationCenterOpen = false}
  onMarkRead={markNotificationRead}
  onMarkAllRead={markAllRead}
  onClearAll={clearAllNotifications}
/>

<!-- Toast Notification -->
{#each toastNotifications as notification}
  <ToastNotification 
    {notification}
    onDismiss={dismissToast}
    onAction={handleNotificationAction}
    autoHideDuration={5000}
  />
{/each}
```

**Accessibility**:
- Modal dialog pattern for notification center
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader announcements for new notifications
- Focus management and restoration

### 3. Job Progress Dashboard

**Purpose**: Monitor and manage background job processing with real-time updates.

**Features**:
- Job status tracking (pending, running, completed, failed, cancelled)
- Progress bars with step-by-step updates
- Time remaining estimation
- Job cancellation and retry functionality
- Priority indicators (low, normal, high, urgent)
- Job type categorization with icons
- Compact and detailed view modes

**Components**:
- `JobProgressDashboard`: Full dashboard with multiple jobs
- `JobProgressCard`: Individual job status card

**Usage**:
```svelte
<script>
  import { JobProgressDashboard, JobProgressCard } from '$lib/components/ui';
  
  let backgroundJobs = [];
</script>

<!-- Full Dashboard -->
<JobProgressDashboard 
  jobs={backgroundJobs}
  onCancel={cancelJob}
  onRetry={retryJob}
  onView={viewJobDetails}
  onClearCompleted={clearCompletedJobs}
  showCompleted={true}
  maxItems={10}
/>

<!-- Individual Job Card -->
<JobProgressCard 
  job={specificJob}
  onCancel={cancelJob}
  onRetry={retryJob}
  onView={viewJobDetails}
/>
```

**Accessibility**:
- Progress bars with aria-valuenow, aria-valuemin, aria-valuemax
- Action buttons with descriptive labels
- Status announcements for screen readers

### 4. Enhanced Bulk Operations Interface

**Purpose**: Improved bulk operations with v2 API integration and better UX.

**Features**:
- Multi-select with visual feedback
- Confirmation dialogs for destructive actions
- Progress tracking during bulk operations
- Keyboard shortcuts for common actions
- Context-aware action availability
- Processing state with progress indicators

**Components**:
- `EnhancedBulkActionsBar`: Floating action bar
- `BulkSelectCheckbox`: Enhanced checkbox with indeterminate state
- `BulkOperationsContext`: Svelte context for state management

**Usage**:
```svelte
<script>
  import { 
    EnhancedBulkActionsBar, 
    BulkSelectCheckbox, 
    BulkOperationsContext 
  } from '$lib/components/ui';
  
  let selectedItems = [];
  let bulkActions = [
    {
      id: 'update-status',
      label: 'Update Status',
      icon: CheckSquare,
      variant: 'default',
      requiresConfirmation: true
    }
  ];
</script>

<BulkOperationsContext onSelectionChange={handleSelectionChange}>
  <!-- Table with checkboxes -->
  <BulkSelectCheckbox 
    checked={isSelected(item.id)}
    onCheckedChange={() => toggleSelection(item.id)}
  />
  
  <!-- Bulk Actions Bar -->
  <EnhancedBulkActionsBar 
    selectedCount={selectedItems.length}
    actions={bulkActions}
    onAction={handleBulkAction}
    onClear={clearSelection}
    selectedItems={selectedItems}
  />
</BulkOperationsContext>
```

**Accessibility**:
- Checkbox group semantics
- Clear selection counts and descriptions
- Confirmation dialogs for destructive actions
- Keyboard shortcuts with visual indicators

### 5. Enhanced Dashboard Cards

**Purpose**: Live-updating dashboard components with WebSocket data.

**Features**:
- Real-time metric updates
- Trend indicators and change calculations
- Error states with retry functionality
- Activity feeds with user avatars
- Status overviews with progress indicators
- Loading and skeleton states

**Components**:
- `LiveMetricCard`: Displays key metrics with trends
- `ActivityFeedCard`: Shows recent activity with user info
- `StatusOverviewCard`: System status overview with indicators

**Usage**:
```svelte
<script>
  import { LiveMetricCard, ActivityFeedCard, StatusOverviewCard } from '$lib/components/ui';
</script>

<!-- Live Metric Card -->
<LiveMetricCard 
  title="Active Employees"
  metric={{
    value: 1247,
    previousValue: 1230,
    change: 1.4,
    changeType: 'increase',
    unit: 'employees'
  }}
  icon={Users}
  isLive={true}
  lastUpdated={new Date()}
/>

<!-- Activity Feed -->
<ActivityFeedCard 
  title="Recent Activity"
  activities={recentActivities}
  isLive={true}
  onItemClick={handleActivityClick}
  maxItems={5}
/>

<!-- Status Overview -->
<StatusOverviewCard 
  title="System Health"
  items={systemStatusItems}
  isLive={true}
  onRefresh={refreshSystemStatus}
/>
```

**Accessibility**:
- Status updates announced to screen readers
- Trend indicators with descriptive text
- Interactive elements with proper focus management

## Implementation Guidelines

### Responsive Design

All components are designed mobile-first with the following breakpoints:
- **Mobile**: < 640px (base styles)
- **Tablet**: 640px - 1024px (responsive adjustments)
- **Desktop**: > 1024px (full features)

### Dark Mode Support

All components support both light and dark themes using CSS variables:
- Automatic theme detection via `prefers-color-scheme`
- Manual theme switching via class-based system
- Consistent color tokens across all components

### Performance Considerations

- **Lazy Loading**: Non-critical components can be lazy-loaded
- **Virtual Scrolling**: Large lists use virtual scrolling patterns
- **Debounced Updates**: Real-time updates are debounced to prevent excessive renders
- **Memoization**: Component props are memoized where appropriate

### Error Handling

All components implement comprehensive error handling:
- **Loading States**: Skeleton screens during data fetching
- **Error States**: Clear error messages with retry options
- **Fallback UI**: Graceful degradation when WebSocket unavailable
- **User Feedback**: Toast notifications for operation results

### WebSocket Integration

Components that connect to WebSocket follow these patterns:
- **Connection Management**: Automatic reconnection with exponential backoff
- **State Synchronization**: Client state synced with server updates
- **Offline Support**: Graceful handling of offline states
- **Message Queuing**: Messages queued during disconnection

## Testing Strategy

### Component Testing
- **Unit Tests**: Individual component logic and rendering
- **Integration Tests**: Component interaction with contexts
- **Visual Regression**: Screenshot testing for UI consistency
- **Accessibility Tests**: Automated a11y testing with axe-core

### E2E Testing
- **User Workflows**: Complete user journey testing
- **Real-time Features**: WebSocket connection testing
- **Cross-browser**: Testing across different browsers
- **Mobile Testing**: Responsive design validation

## Migration Guide

### From v1 Components

1. **Notification System**: Replace static notification dropdowns with `NotificationCenter`
2. **Bulk Actions**: Upgrade existing `BulkActionsBar` to `EnhancedBulkActionsBar`
3. **Dashboard Cards**: Replace static cards with live variants
4. **Progress Indicators**: Use `JobProgressDashboard` for background operations

### Breaking Changes

- **API Changes**: Some prop names have changed for consistency
- **Import Paths**: New components use dedicated import paths
- **Context Requirements**: Some components require context providers

## Future Enhancements

- **Chart Integration**: Mini charts in metric cards
- **Advanced Filtering**: Enhanced notification filtering
- **Customizable Layouts**: Drag-and-drop dashboard arrangement
- **Offline Sync**: Improved offline-first capabilities
- **Voice Commands**: Accessibility via voice navigation

## Support

For implementation questions or bug reports, please refer to:
- **Component Documentation**: Individual component READMEs
- **Design System Guide**: `/src/lib/styles/design-tokens.css`
- **Example Usage**: Storybook stories for each component
- **TypeScript Definitions**: Comprehensive type exports

---

*This documentation is maintained alongside component updates to ensure accuracy and completeness.*