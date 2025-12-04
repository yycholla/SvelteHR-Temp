# EventDetailsDialog Updates for Feature 025

## Required Additions

The existing EventDetailsDialog.svelte needs the following enhancements for the 025-events-flesh-out feature:

### 1. Add RSVP Scope Selection (for recurring events)

```svelte
{#if event.rrule}
  <RecurrenceScopeDialog
    bind:open={showScopeDialog}
    eventTitle={event.title}
    action="rsvp"
    onConfirm={handleRsvpWithScope}
    onCancel={() => showScopeDialog = false}
  />
{/if}
```

### 2. Add Capacity Indicator

```svelte
<EventCapacityIndicator
  acceptedCount={rsvpStats.accepted}
  maxCapacity={event.maxCapacity}
  waitlistCount={event.waitlistCount}
  isFull={event.isFull}
/>
```

### 3. Add Waitlist Button

```svelte
{#if event.isFull && event.waitlistEnabled}
  <WaitlistButton
    eventId={event.id}
    isOnWaitlist={userWaitlistStatus.isOnWaitlist}
    waitlistPosition={userWaitlistStatus.position}
    onJoin={handleJoinWaitlist}
    onLeave={handleLeaveWaitlist}
  />
{/if}
```

### 4. Add Comments Section (as a tab)

```svelte
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="comments">
      Comments
      {#if commentCount > 0}
        <Badge variant="secondary" class="ml-2">{commentCount}</Badge>
      {/if}
    </TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>

  <TabsContent value="details">
    <!-- Existing event details -->
  </TabsContent>

  <TabsContent value="comments">
    <EventCommentThread
      eventId={event.id}
      comments={eventComments}
      currentUserId={userId}
      onAddComment={handleAddComment}
      onUpdateComment={handleUpdateComment}
      onDeleteComment={handleDeleteComment}
    />
  </TabsContent>

  <TabsContent value="history">
    <EventHistoryView history={eventHistory} />
  </TabsContent>
</Tabs>
```

### 5. Add Props

```typescript
interface Props {
	// ... existing props
	eventComments?: Comment[];
	eventHistory?: HistoryEntry[];
	commentCount?: number;
	userWaitlistStatus?: {
		isOnWaitlist: boolean;
		position: number | null;
	};
	onJoinWaitlist?: (eventId: string) => Promise<void>;
	onLeaveWaitlist?: (eventId: string) => Promise<void>;
	onAddComment?: (content: string, mentions: string[]) => Promise<void>;
	onUpdateComment?: (commentId: string, content: string) => Promise<void>;
	onDeleteComment?: (commentId: string) => Promise<void>;
}
```

### 6. Update Imports

```typescript
import RecurrenceScopeDialog from './RecurrenceScopeDialog.svelte';
import EventCapacityIndicator from './EventCapacityIndicator.svelte';
import WaitlistButton from './WaitlistButton.svelte';
import EventCommentThread from './EventCommentThread.svelte';
import EventHistoryView from './EventHistoryView.svelte';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
import { Badge } from '$lib/components/ui/badge';
```

## Implementation Notes

- RSVP scope dialog should only show for recurring events (where `event.rrule` is set)
- Capacity indicator should show progress bar when `event.maxCapacity` is set
- Waitlist button appears when event is full and waitlist is enabled
- Comments and history are in separate tabs to reduce initial load
- All new features are optional props with sensible defaults for backward compatibility
