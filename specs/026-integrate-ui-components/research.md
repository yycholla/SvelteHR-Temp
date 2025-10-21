# Research: Integrate Events UI Components

**Feature**: 026-integrate-ui-components
**Date**: 2025-10-08
**Status**: Complete

## Research Questions

### R1: Review Existing Components

**Question**: What are the props interfaces, state management patterns, and event handlers for the 6 components from feature 025?

**Findings**:

All 6 components follow Svelte 5 runes patterns with proper TypeScript typing:

1. **RecurrenceScopeDialog.svelte**
   - Props: `open` ($bindable), `eventTitle`, `action`, `onConfirm`, `onCancel`
   - State: `selectedScope` ($state) - 'this_event' | 'this_and_future' | 'all_events'
   - Events: onConfirm(scope), onCancel()

2. **EventCapacityIndicator.svelte**
   - Props: `acceptedCount`, `maxCapacity`, `waitlistCount`, `isFull`, `variant` (compact/default)
   - Derived: `percentFull` ($derived)
   - No events - pure display component

3. **WaitlistButton.svelte**
   - Props: `eventId`, `isOnWaitlist`, `waitlistPosition`, `onJoin`, `onLeave`
   - State: `loading` ($state), `error` ($state)
   - Events: onJoin(eventId), onLeave(eventId)
   - Uses toast notifications for success/error

4. **EventCommentThread.svelte**
   - Props: `eventId`, `comments`, `currentUserId`, `onAddComment`, `onUpdateComment`, `onDeleteComment`
   - State: `newCommentContent` ($state), `editingCommentId` ($state)
   - Helper: `parseContent(content)` - highlights @mentions
   - Uses date-fns for relative timestamps

5. **EventHistoryView.svelte**
   - Props: `history` (HistoryEntry[])
   - State: `expandedEntries` ($state) - Set<string>
   - Color-coded by change_type: created (green), updated (blue), deleted (red)
   - Accordion collapse/expand per entry

6. **Tabs/Badge components** (shadcn-svelte)
   - Already available in `src/lib/components/ui/`
   - Standard Bits UI patterns

**Decision**: Use components as-is with proper prop passing from EventDetailsDialog

**Rationale**: Components are production-ready, follow constitutional patterns (Svelte 5 runes, TypeScript strict)

### R2: Integration Patterns

**Question**: What does EventDetailsDialog-025-updates.md prescribe for integration?

**Findings**:

Integration guide specifies:

```svelte
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="comments">
      Comments
      {#if commentCount > 0}
        <Badge variant="secondary">{commentCount}</Badge>
      {/if}
    </TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>

  <TabsContent value="details">
    <!-- Existing details + EventCapacityIndicator + WaitlistButton -->
  </TabsContent>

  <TabsContent value="comments">
    <EventCommentThread {...commentProps} />
  </TabsContent>

  <TabsContent value="history">
    <EventHistoryView history={eventHistory} />
  </TabsContent>
</Tabs>
```

Props to add to EventDetailsDialog:
- `eventComments?: Comment[]`
- `eventHistory?: HistoryEntry[]`
- `commentCount?: number`
- `userWaitlistStatus?: { isOnWaitlist: boolean; position: number | null }`
- Event handlers: `onJoinWaitlist`, `onLeaveWaitlist`, `onAddComment`, `onUpdateComment`, `onDeleteComment`

**Decision**: Follow integration guide exactly - tab-based layout with conditional rendering

**Rationale**: Guide already accounts for backward compatibility, proper data flow

### R3: GraphQL Query Requirements

**Question**: What GraphQL queries are needed for comments, history, waitlist status?

**Findings**:

Based on feature 025 database schema and clarifications:

**Query: eventComments**
```graphql
query EventComments($eventId: UUID!, $limit: Int = 20, $offset: Int = 0) {
  eventComments(
    filter: { eventId: { equalTo: $eventId } }
    first: $limit
    offset: $offset
    orderBy: CREATED_AT_DESC
  ) {
    nodes {
      id
      content
      mentions
      createdAt
      updatedAt
      employeeByEmployeeId {
        id
        displayName
        avatarUrl
      }
    }
    totalCount
  }
}
```

**Query: eventHistory**
```graphql
query EventHistory($eventId: UUID!, $limit: Int = 25, $offset: Int = 0) {
  eventHistories(
    filter: { eventId: { equalTo: $eventId } }
    first: $limit
    offset: $offset
    orderBy: CREATED_AT_DESC
  ) {
    nodes {
      id
      fieldName
      oldValue
      newValue
      changeType
      createdAt
      employeeByChangedBy {
        id
        displayName
      }
    }
    totalCount
  }
}
```

**Query: userWaitlistStatus**
```graphql
query UserWaitlistStatus($eventId: UUID!, $userId: UUID!) {
  eventWaitlists(
    filter: {
      and: [
        { eventId: { equalTo: $eventId } }
        { employeeId: { equalTo: $userId } }
      ]
    }
  ) {
    nodes {
      id
      position
      joinedAt
    }
  }
}
```

**Mutations**: createEventComment, updateEventComment, deleteEventComment, joinEventWaitlist, leaveEventWaitlist
(Already defined in feature 025 GraphQL resolvers)

**Decision**: Use PostGraphile auto-generated queries with pagination parameters

**Rationale**: Feature 025 resolvers already deployed, PostGraphile handles RLS automatically

### R4: XSS Sanitization Strategy

**Question**: How to strip HTML/JavaScript while preserving plain text and @mentions?

**Findings**:

From clarification FR-017c/FR-017d: "Strip all HTML tags and scripts, allow only plain text and @mentions"

**Approach 1**: Server-side sanitization (RECOMMENDED)
- Sanitize in GraphQL mutation resolver before DB insert
- Use library like DOMPurify (server-side build) or custom regex
- Store sanitized content in database
- Client displays as-is (already safe)

**Approach 2**: Client-side sanitization
- Sanitize before GraphQL mutation call
- Risk: Client could be bypassed (not recommended for security-critical data)

**Approach 3**: Hybrid (Defense in depth)
- Sanitize on both client and server
- Client for UX (immediate feedback), server for security

**Decision**: Server-side sanitization in GraphQL resolver + client-side helper for preview

**Implementation**:
```typescript
// src/lib/utils/sanitize.ts
export function sanitizeCommentContent(content: string): string {
  // Remove all HTML tags except @mentions
  // @mentions format: @username (no HTML, just plain text)
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .trim();
}

export function parseCommentMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = content.matchAll(mentionRegex);
  return Array.from(matches, m => m[1]);
}
```

**Rationale**:
- Server-side enforcement prevents bypass attacks
- Simple regex avoids heavy dependencies
- @mentions are plain text (no special rendering needed beyond highlighting)

**Alternatives considered**:
- DOMPurify: Overkill for plain text + @mentions (we're not allowing ANY HTML)
- HTML entity encoding: Not needed since we strip all tags

## Technology Decisions

### TypeScript Types for Integration

**Decision**: Generate TypeScript interfaces from GraphQL schema via codegen

```typescript
// Generated types (example)
interface EventComment {
  id: string;
  content: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  employeeByEmployeeId: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

interface EventHistoryEntry {
  id: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changeType: 'created' | 'updated' | 'deleted';
  createdAt: string;
  employeeByChangedBy: {
    id: string;
    displayName: string;
  };
}

interface UserWaitlistStatus {
  isOnWaitlist: boolean;
  position: number | null;
  joinedAt?: string;
}
```

**Rationale**: Type safety per constitution, GraphQL codegen already in project

### Pagination Strategy

**Decision**: "Load More" button pattern (not infinite scroll)

From clarifications:
- Comments: Show 20 most recent, "Load More" for older
- History: Show 25 most recent, "Load More" for older

**Implementation**:
```typescript
// State management
let commentsOffset = $state(0);
let hasMoreComments = $derived(totalCommentCount > (commentsOffset + 20));

async function loadMoreComments() {
  commentsOffset += 20;
  // Fetch next page via GraphQL
}
```

**Rationale**:
- Simpler UX than infinite scroll
- Better performance (user controls when to load)
- Aligns with clarification requirements

### Timestamp Display Logic

**Decision**: Use date-fns with 48-hour threshold

From clarification FR-021/FR-022: Relative timestamps ≤48 hours, absolute >48 hours

```typescript
import { formatDistanceToNow, format, isAfter, subHours } from 'date-fns';

export function formatCommentTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const threshold = subHours(now, 48);

  if (isAfter(date, threshold)) {
    return formatDistanceToNow(date, { addSuffix: true }); // "2 hours ago"
  } else {
    return format(date, 'MMM dd, yyyy h:mm a'); // "Jan 15, 2025 3:30 PM"
  }
}
```

**Rationale**: date-fns already in dependencies, well-tested library

## Integration Checklist

✅ All components from feature 025 reviewed
✅ Integration guide (EventDetailsDialog-025-updates.md) analyzed
✅ GraphQL query requirements defined
✅ XSS sanitization strategy chosen
✅ TypeScript type generation approach defined
✅ Pagination pattern selected
✅ Timestamp display logic designed

## Open Questions

None - all research questions resolved.

## Next Steps

Proceed to Phase 1: Design & Contracts
- Create data-model.md with component integration contracts
- Generate GraphQL contract specs in contracts/
- Write failing contract tests
- Create quickstart.md validation scenario
- Update CLAUDE.md with integration context
