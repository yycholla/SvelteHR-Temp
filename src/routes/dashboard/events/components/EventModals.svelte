<script lang="ts">
	import EventCreateDialog from '$lib/components/events/EventCreateDialog.svelte';
	import EventDetailsDialog from '$lib/components/events/EventDetailsDialog.svelte';

	interface Props {
		showCreateDialog: boolean;
		createDialogDefaults: any;
		employees: any[];
		showDetailsDialog: boolean;
		detailsDialogMode: 'view' | 'edit';
		selectedEvent: any;
		selectedEventRsvpStats: any;
		eventComments: any[];
		eventHistory: any[];
		userWaitlistStatus: any;
		hasMoreComments: boolean;
		hasMoreHistory: boolean;
		allEvents: any[];
		userId: string;
		userRole: string;
		canCreateEvents: boolean;
		userPerms: any;
		onAddComment: (content: string, mentions: string[]) => Promise<void>;
		onUpdateComment: (id: string, content: string) => Promise<void>;
		onDeleteComment: (id: string) => Promise<void>;
		onJoinWaitlist: (id: string) => Promise<void>;
		onLeaveWaitlist: (id: string) => Promise<void>;
		onLoadMoreComments: () => Promise<void>;
		onLoadMoreHistory: () => Promise<void>;
		onRsvpUpdate: (id: string, status: any) => void;
	}

	let {
		showCreateDialog = $bindable(),
		createDialogDefaults,
		employees,
		showDetailsDialog = $bindable(),
		detailsDialogMode = $bindable(),
		selectedEvent = $bindable(),
		selectedEventRsvpStats,
		eventComments,
		eventHistory,
		userWaitlistStatus,
		hasMoreComments,
		hasMoreHistory,
		allEvents,
		userId,
		userRole,
		canCreateEvents,
		userPerms,
		onAddComment,
		onUpdateComment,
		onDeleteComment,
		onJoinWaitlist,
		onLeaveWaitlist,
		onLoadMoreComments,
		onLoadMoreHistory,
		onRsvpUpdate
	}: Props = $props();
</script>

<EventCreateDialog
	isOpen={showCreateDialog}
	defaultStartTime={createDialogDefaults.startTime}
	defaultEndTime={createDialogDefaults.endTime}
	defaultAllDay={createDialogDefaults.allDay}
	minDate={new Date().toISOString().split('T')[0]}
	{employees}
	onClose={() => (showCreateDialog = false)}
	onSuccess={() => (showCreateDialog = false)}
/>

{#if showDetailsDialog && selectedEvent}
	<EventDetailsDialog
		isOpen={showDetailsDialog}
		mode={detailsDialogMode}
		event={selectedEvent}
		{userId}
		{userRole}
		canManageEvent={(canCreateEvents && selectedEvent?.organizerId === userId) ||
			userPerms?.canDeleteEvents}
		rsvpStats={selectedEventRsvpStats}
		{eventComments}
		{eventHistory}
		{userWaitlistStatus}
		{allEvents}
		onClose={() => {
			showDetailsDialog = false;
			selectedEvent = null;
		}}
		{onAddComment}
		{onUpdateComment}
		{onDeleteComment}
		{onJoinWaitlist}
		{onLeaveWaitlist}
		{onLoadMoreComments}
		{onLoadMoreHistory}
		{onRsvpUpdate}
		{hasMoreComments}
		{hasMoreHistory}
	/>
{/if}
