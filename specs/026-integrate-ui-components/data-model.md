# Data Model: Integrate Events UI Components

**Feature**: 026-integrate-ui-components
**Date**: 2025-10-08
**Context**: Component integration contracts and data flow specifications

## Overview

This feature integrates 6 pre-built UI components into EventDetailsDialog. The data model focuses on **component integration contracts** rather than database entities (which already exist from feature 025).

## Component Integration Contracts

### 1. EventDetailsDialog Enhanced Props

**Purpose**: Main dialog component with integrated tabs and sub-components

**Props Interface**:
```typescript
interface EventDetailsDialogProps {
  // Existing props (preserved)
  isOpen: boolean;
  event: Event;
  userId: string;
  canManageEvent: boolean;
  mode: 'view' | 'edit';
  rsvpStats: RsvpStats;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;

  // NEW: Comments integration
  eventComments?: EventComment[];
  commentCount?: number;
  onAddComment?: (content: string, mentions: string[]) => Promise<void>;
  onUpdateComment?: (commentId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onLoadMoreComments?: () => Promise<void>;
  hasMoreComments?: boolean;

  // NEW: History integration
  eventHistory?: EventHistoryEntry[];
  onLoadMoreHistory?: () => Promise<void>;
  hasMoreHistory?: boolean;

  // NEW: Waitlist integration
  userWaitlistStatus?: UserWaitlistStatus;
  onJoinWaitlist?: (eventId: string) => Promise<void>;
  onLeaveWaitlist?: (eventId: string) => Promise<void>;
}
```

**State Management**:
```typescript
// Tab state
let activeTab = $state<'details' | 'comments' | 'history'>('details');

// Pagination state
let commentsOffset = $state(0);
let historyOffset = $state(0);

// Error state (for inline error messages)
let commentError = $state<string | null>(null);
let waitlistError = $state<string | null>(null);
```

**Derived Values**:
```typescript
const showCapacityIndicator = $derived(
  event.maxCapacity !== null && event.maxCapacity > 0
);

const showWaitlistButton = $derived(
  event.isFull && event.waitlistEnabled
);

const showScopeDialog = $derived(
  event.rrule !== null && event.rrule !== ''
);
```

### 2. EventComment Data Structure

**Purpose**: Represents a single comment on an event

**TypeScript Interface**:
```typescript
interface EventComment {
  id: string;
  eventId: string;
  employeeId: string;
  content: string;              // XSS-sanitized plain text
  mentions: string[];           // Array of @mentioned usernames
  createdAt: string;            // ISO 8601 timestamp
  updatedAt: string;            // ISO 8601 timestamp
  employee: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}
```

**Validation Rules** (from FR-017):
- `content`: Must be 1-5000 characters after sanitization
- `content`: No HTML tags or JavaScript allowed (XSS prevention)
- `mentions`: Valid employee usernames only (invalid ones not highlighted)

**State Transitions**:
```
[New] --create--> [Published]
[Published] --edit (own only)--> [Updated]
[Published/Updated] --delete (own only)--> [Deleted]
```

### 3. EventHistoryEntry Data Structure

**Purpose**: Represents a single change in the event's audit trail

**TypeScript Interface**:
```typescript
interface EventHistoryEntry {
  id: string;
  eventId: string;
  changedBy: string;
  fieldName: string;             // e.g., "title", "startTime", "maxCapacity"
  oldValue?: string | null;
  newValue?: string | null;
  changeType: 'created' | 'updated' | 'deleted';
  createdAt: string;             // ISO 8601 timestamp
  employee: {
    id: string;
    displayName: string;
  };
}
```

**Immutability**:
- History entries are **read-only** (FR-027)
- No edit or delete operations
- Automatic creation via database triggers (from feature 025)

**Display Logic**:
```typescript
// Color coding by changeType
const entryColor = {
  created: 'text-green-600',
  updated: 'text-blue-600',
  deleted: 'text-red-600'
};
```

### 4. UserWaitlistStatus Data Structure

**Purpose**: Represents current user's waitlist position for an event

**TypeScript Interface**:
```typescript
interface UserWaitlistStatus {
  isOnWaitlist: boolean;
  position: number | null;      // FIFO position (1 = first in line)
  joinedAt?: string;            // ISO 8601 timestamp
}
```

**Business Rules**:
- `position`: Automatically managed server-side (FIFO ordering)
- Auto-promotion when spot opens (handled by feature 025 trigger)
- Only shown when `event.isFull && event.waitlistEnabled`

### 5. Tab State Management

**Purpose**: Control which tab is active and manage badge counts

**State Interface**:
```typescript
interface TabState {
  activeTab: 'details' | 'comments' | 'history';
  commentCount: number;         // For badge display
  historyCount: number;         // For badge display (optional)
}
```

**Badge Display Logic**:
```svelte
{#if commentCount > 0}
  <Badge variant="secondary">{commentCount}</Badge>
{/if}
```

## Data Flow Diagrams

### Server-Side Data Loading Flow

```
+page.server.ts (load function)
  |
  ├─> GraphQL Query: eventComments
  |   └─> Returns: { nodes: EventComment[], totalCount }
  |
  ├─> GraphQL Query: eventHistory
  |   └─> Returns: { nodes: EventHistoryEntry[], totalCount }
  |
  └─> GraphQL Query: userWaitlistStatus
      └─> Returns: UserWaitlistStatus
  |
  V
+page.svelte (data prop)
  |
  V
EventDetailsDialog (component props)
  |
  ├─> Comments Tab -> EventCommentThread component
  ├─> History Tab -> EventHistoryView component
  └─> Details Tab -> EventCapacityIndicator + WaitlistButton
```

### Comment Creation Flow (with XSS Sanitization)

```
User Input
  |
  V
EventCommentThread (onAddComment)
  |
  V
sanitizeCommentContent(content)  // Client-side preview
  |
  V
GraphQL Mutation: createEventComment
  |
  V
Server-side sanitization (resolver)
  |
  V
Database INSERT (event_comments table)
  |
  V
Refetch comments query
  |
  V
Update UI with new comment
```

### Pagination Flow

```
Initial Load: offset=0, limit=20 (comments) / limit=25 (history)
  |
  V
Display results + "Load More" button if totalCount > limit
  |
  V
User clicks "Load More"
  |
  V
Increment offset by limit
  |
  V
GraphQL Query with new offset
  |
  V
Append results to existing array
  |
  V
Update "hasMore" flag based on totalCount
```

## GraphQL Operations (Summary)

### Queries

1. **eventComments** (pagination: 20 per page)
   - Input: `eventId`, `limit`, `offset`
   - Output: `{ nodes: EventComment[], totalCount: number }`

2. **eventHistory** (pagination: 25 per page)
   - Input: `eventId`, `limit`, `offset`
   - Output: `{ nodes: EventHistoryEntry[], totalCount: number }`

3. **userWaitlistStatus**
   - Input: `eventId`, `userId`
   - Output: `UserWaitlistStatus`

### Mutations

1. **createEventComment**
   - Input: `eventId`, `content` (sanitized), `mentions`
   - Output: `EventComment`
   - Error: Inline error message below input (FR-017a)

2. **updateEventComment**
   - Input: `commentId`, `content` (sanitized)
   - Output: `EventComment`
   - Constraint: Own comments only (FR-020)

3. **deleteEventComment**
   - Input: `commentId`
   - Output: `boolean`
   - Constraint: Own comments only (FR-020)

4. **joinEventWaitlist**
   - Input: `eventId`
   - Output: `UserWaitlistStatus`
   - Error: Inline error message below button (FR-012a)

5. **leaveEventWaitlist**
   - Input: `eventId`
   - Output: `boolean`

## Timestamp Display Logic

**Rule** (from FR-021/FR-022): 48-hour threshold

```typescript
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (hoursDiff <= 48) {
    return formatDistanceToNow(date, { addSuffix: true }); // "2 hours ago"
  } else {
    return format(date, 'MMM dd, yyyy h:mm a'); // "Jan 15, 2025 3:30 PM"
  }
}
```

## Error Handling Contracts

### Inline Error Messages (from FR-017a, FR-012a)

**Comment Submission Error**:
```svelte
{#if commentError}
  <div class="text-sm text-destructive mt-2">
    {commentError}
  </div>
{/if}
```

**Waitlist Join Error**:
```svelte
{#if waitlistError}
  <div class="text-sm text-destructive mt-2">
    {waitlistError}
  </div>
{/if}
```

**Retry Behavior** (from FR-017b, FR-012b):
- User can retry failed operations without page refresh
- Errors clear when user retries
- No toast notifications (inline only)

## Backward Compatibility Contracts

**From FR-028, FR-029, FR-030**:

```typescript
// Graceful handling when data is absent
const eventComments = data.eventComments ?? [];
const eventHistory = data.eventHistory ?? [];
const commentCount = data.commentCount ?? 0;

// Hide features when not applicable
{#if event.maxCapacity && event.maxCapacity > 0}
  <EventCapacityIndicator {...capacityProps} />
{/if}

{#if commentCount > 0 || canComment}
  <!-- Show Comments tab -->
{/if}

{#if eventHistory.length > 0}
  <!-- Show History tab -->
{/if}
```

## XSS Sanitization Contract

**From FR-017c, FR-017d**:

```typescript
/**
 * Sanitizes comment content by stripping all HTML tags and JavaScript
 * while preserving plain text and @mention formatting.
 *
 * @param content - Raw user input
 * @returns Sanitized plain text with @mentions
 */
export function sanitizeCommentContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Extracts @mentions from sanitized content.
 *
 * @param content - Sanitized content
 * @returns Array of mentioned usernames
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  return Array.from(content.matchAll(mentionRegex), m => m[1]);
}
```

## Component Prop Flow Summary

```
+page.server.ts
  ↓ (load function returns)
{
  event: Event,
  eventComments: EventComment[],
  commentCount: number,
  eventHistory: EventHistoryEntry[],
  userWaitlistStatus: UserWaitlistStatus,
  hasMoreComments: boolean,
  hasMoreHistory: boolean
}
  ↓
+page.svelte
  ↓ (passes to)
EventDetailsDialog
  ↓ (distributes to)
  ├─> EventCommentThread
  |   ├─ eventId
  |   ├─ comments
  |   ├─ currentUserId
  |   ├─ onAddComment
  |   ├─ onUpdateComment
  |   └─ onDeleteComment
  |
  ├─> EventHistoryView
  |   └─ history
  |
  ├─> EventCapacityIndicator
  |   ├─ acceptedCount
  |   ├─ maxCapacity
  |   ├─ waitlistCount
  |   └─ isFull
  |
  ├─> WaitlistButton
  |   ├─ eventId
  |   ├─ isOnWaitlist
  |   ├─ waitlistPosition
  |   ├─ onJoin
  |   └─ onLeave
  |
  └─> RecurrenceScopeDialog
      ├─ open (bindable)
      ├─ eventTitle
      ├─ action
      ├─ onConfirm
      └─ onCancel
```

## Validation Summary

| Entity | Required Fields | Validation Rules | Error Handling |
|--------|----------------|------------------|----------------|
| EventComment | content | 1-5000 chars, XSS sanitized | Inline below input (FR-017a) |
| EventHistory | fieldName, changeType | Read-only, no validation | N/A (display only) |
| UserWaitlistStatus | isOnWaitlist | Server-managed FIFO | Inline below button (FR-012a) |

## Performance Considerations

- **Comment Pagination**: 20 per page prevents large DOM rendering
- **History Pagination**: 25 per page with accordion collapse reduces memory
- **Tab Lazy Loading**: Only active tab content rendered (Svelte conditional rendering)
- **GraphQL Query Optimization**: Use PostGraphile's dataloader for N+1 prevention

---

**Next**: Generate GraphQL contracts in contracts/ directory
