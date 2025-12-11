<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { logger } from '$lib/utils/logger';
	import { toast } from 'svelte-sonner';
	import { Bell, Calendar as CalendarIcon, MapPin, User, Users } from '@lucide/svelte';
	import RSVPButton from './RSVPButton.svelte';
	import EventCapacityIndicator from './EventCapacityIndicator.svelte';
	import WaitlistButton from './WaitlistButton.svelte';
	import EventCommentThread from './EventCommentThread.svelte';
	import EventHistoryView from './EventHistoryView.svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { formatEventTimeRange } from '$lib/utils/events';
	import { extractMentions, sanitizeCommentContent } from '$lib/utils/sanitize';
	import type { RsvpStatus } from '$lib/graphql/types';
	import type {
		EventComment,
		EventHistoryEntry,
		UserWaitlistStatus
	} from '$lib/graphql/events-operations';
	import type { EventData } from './types';

	interface Props {
		event: EventData;
		userId: string;
		userRole?: string;
		rsvpStats?: {
			total: number;
			accepted: number;
			declined: number;
			tentative: number;
			pending: number;
		};
		eventComments?: EventComment[];
		commentCount?: number;
		eventHistory?: EventHistoryEntry[];
		userWaitlistStatus?: UserWaitlistStatus;
		hasMoreComments?: boolean;
		hasMoreHistory?: boolean;
		onRsvpUpdate?: (newStatus: RsvpStatus) => void;
		onAddComment?: (content: string, mentions: string[]) => Promise<void>;
		onUpdateComment?: (commentId: string, content: string) => Promise<void>;
		onDeleteComment?: (commentId: string) => Promise<void>;
		onLoadMoreComments?: () => Promise<void>;
		onLoadMoreHistory?: () => Promise<void>;
		onJoinWaitlist?: (eventId: string) => Promise<void>;
		onLeaveWaitlist?: (eventId: string) => Promise<void>;
	}

	const {
		event,
		userId,
		userRole,
		rsvpStats,
		eventComments = [],
		commentCount = 0,
		eventHistory = [],
		userWaitlistStatus,
		hasMoreComments = false,
		hasMoreHistory = false,
		onRsvpUpdate,
		onAddComment,
		onUpdateComment,
		onDeleteComment,
		onLoadMoreComments,
		onLoadMoreHistory,
		onJoinWaitlist,
		onLeaveWaitlist
	}: Props = $props();

	// Tab state
	let activeTab = $state<'details' | 'comments' | 'history'>('details');

	// Attendee tab state
	type AttendeeTab = 'all' | 'accepted' | 'declined' | 'tentative' | 'pending' | 'no_response';
	let activeAttendeeTab = $state<AttendeeTab>('all');

	// Reminder state
	type ReminderPreset = '15min' | '1hour' | '1day' | '1week' | 'none';
	let selectedReminder = $state<ReminderPreset>('none');
	let isSavingReminder = $state(false);

	// Error states
	let commentError = $state<string | null>(null);
	let waitlistError = $state<string | null>(null);

	// Initialize reminder from event prop
	// Since this component is remounted when event changes (keyed in parent), init logic runs once
	{
		const userAttendee = event.attendees?.find((a: any) => a.employeeId === userId);

		if (userAttendee?.reminderTime) {
			const minutes = userAttendee.reminderTime;
			if (minutes === 15) selectedReminder = '15min';
			else if (minutes === 60) selectedReminder = '1hour';
			else if (minutes === 1440) selectedReminder = '1day';
			else if (minutes === 10080) selectedReminder = '1week';
			else selectedReminder = 'none';
		} else {
			selectedReminder = 'none';
		}
	}

	// Derived values
	const displayRsvpStats = $derived.by(() => {
		if (!event?.attendees) {
			return rsvpStats || { total: 0, accepted: 0, declined: 0, tentative: 0, pending: 0 };
		}
		const attendees = event.attendees;
		return {
			total: attendees.length,
			accepted: attendees.filter((a: any) => a.responseStatus === 'accepted').length,
			declined: attendees.filter((a: any) => a.responseStatus === 'declined').length,
			tentative: attendees.filter((a: any) => a.responseStatus === 'tentative').length,
			pending: attendees.filter((a: any) => a.responseStatus === 'pending').length
		};
	});

	const filteredAttendees = $derived(
		activeAttendeeTab === 'all'
			? event?.attendees || []
			: (event?.attendees || []).filter((a: any) => a.responseStatus === activeAttendeeTab)
	);

	const userRsvpStatus = $derived(
		!event?.attendees
			? 'no_response'
			: event.attendees.find((a) => a.employeeId === userId)?.responseStatus || 'no_response'
	);

	const showCapacityIndicator = $derived(
		event?.maxCapacity !== null && event?.maxCapacity !== undefined && event.maxCapacity > 0
	);

	const showWaitlistButton = $derived(event?.isFull === true && event?.waitlistEnabled === true);

	const isRecurringEvent = $derived(
		event?.rrule !== null && event?.rrule !== undefined && event.rrule !== ''
	);

	// Mappers for child components
	const mappedComments = $derived(
		eventComments.map((c) => ({
			id: c.id,
			content: c.content || c.commentText || '',
			author: {
				id: c.author?.id || c.user?.id || 'unknown',
				name: c.author?.name || c.user?.displayName || 'Unknown',
				avatarUrl: c.author?.avatarUrl
			},
			mentions: c.mentions || [],
			createdAt: c.createdAt,
			updatedAt: c.updatedAt
		}))
	);

	const mappedHistory = $derived(
		eventHistory.map((h) => ({
			id: h.id,
			changedBy: {
				id: h.changedBy?.id || 'unknown',
				name: h.changedBy?.name || h.changedBy?.displayName || 'System'
			},
			changeType: h.changeType as any,
			fieldName: h.fieldName,
			oldValue: h.oldValue || h.oldValues,
			newValue: h.newValue || h.newValues,
			changedAt: h.changedAt || h.createdAt
		}))
	);

	// Handlers
	async function handleRsvpChange(newStatus: RsvpStatus) {
		// Call the parent's RSVP handler
		// Parent (EventDetailsDialog) will handle scope dialog, conflict checks, and API call
		if (onRsvpUpdate) {
			onRsvpUpdate(newStatus);
		}
	}

	// Wait! The `onRsvpUpdate` prop in `EventDetailsDialog` was for *external* notification (optimistic UI).
	// The *internal* `handleRsvpChange` did the heavy lifting.
	// I need to expose that heavy lifting capability to this child.
	// OR I keep the `RSVPButton` here but pass the `onChange` handler from the parent.
	// Let's change the props of `EventDetailsView` to accept `onRsvpChangeRequest`.

	// But `EventDetailsDialog` has `handleRsvpChange` which takes `newStatus`.
	// So I'll pass that as a prop `handleRsvpChange`.

	async function handleReminderChange(preset: ReminderPreset) {
		if (!event) return;

		const presetToMinutes: Record<Exclude<ReminderPreset, 'none'>, number> = {
			'15min': 15,
			'1hour': 60,
			'1day': 1440,
			'1week': 10080
		};

		const reminderLabels: Record<Exclude<ReminderPreset, 'none'>, string> = {
			'15min': '15 minutes before',
			'1hour': '1 hour before',
			'1day': '1 day before',
			'1week': '1 week before'
		};

		if (preset !== 'none') {
			isSavingReminder = true;
			try {
				const formData = new FormData();
				formData.append('eventId', event.id);
				formData.append('reminderMinutes', presetToMinutes[preset].toString());

				const response = await fetch('/dashboard/events?/setEventReminder', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();

				if (result.type === 'success' || response.ok) {
					toast.success(`Reminder set for ${reminderLabels[preset]}`);
					await invalidateAll();
				} else {
					const errorMsg = (result.data as any)?.error || 'Failed to set reminder';
					toast.error(errorMsg);
					selectedReminder = 'none';
				}
			} catch (error) {
				logger.error('Catch failed', error as Error);
				toast.error('Failed to set reminder. Please try again.');
				selectedReminder = 'none';
			} finally {
				isSavingReminder = false;
			}
		} else {
			isSavingReminder = true;
			try {
				const formData = new FormData();
				formData.append('eventId', event.id);
				formData.append('reminderMinutes', '0');

				const response = await fetch('/dashboard/events?/setEventReminder', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();

				if (result.type === 'success' || response.ok) {
					toast.success('Reminder disabled');
					await invalidateAll();
				} else {
					toast.error('Failed to disable reminder');
				}
			} catch (error) {
				logger.error('Catch failed', error as Error);
				toast.error('Failed to disable reminder');
			} finally {
				isSavingReminder = false;
			}
		}
	}

	// Wrappers with error handling
	async function handleAddCommentWrapper(content: string) {
		if (!onAddComment) return;
		try {
			commentError = null;
			const sanitized = sanitizeCommentContent(content);
			const mentions = extractMentions(sanitized);
			await onAddComment(sanitized, mentions);
		} catch (error: any) {
			commentError = error.message || 'Failed to submit comment. Please try again.';
		}
	}

	async function handleUpdateCommentWrapper(commentId: string, content: string) {
		if (!onUpdateComment) return;
		try {
			commentError = null;
			const sanitized = sanitizeCommentContent(content);
			await onUpdateComment(commentId, sanitized);
		} catch (error: any) {
			commentError = error.message || 'Failed to update comment. Please try again.';
		}
	}

	async function handleDeleteCommentWrapper(commentId: string) {
		if (!onDeleteComment) return;
		try {
			commentError = null;
			await onDeleteComment(commentId);
		} catch (error: any) {
			commentError = error.message || 'Failed to delete comment. Please try again.';
		}
	}

	async function handleJoinWaitlistWrapper() {
		if (!onJoinWaitlist || !event) return;
		try {
			waitlistError = null;
			await onJoinWaitlist(event.id);
		} catch (error: any) {
			waitlistError = error.message || 'Failed to join waitlist. Please try again.';
		}
	}

	async function handleLeaveWaitlistWrapper() {
		if (!onLeaveWaitlist || !event) return;
		try {
			waitlistError = null;
			await onLeaveWaitlist(event.id);
		} catch (error: any) {
			waitlistError = error.message || 'Failed to leave waitlist. Please try again.';
		}
	}

	// Helpers
	function getStatusBadgeColor(status: string): string {
		const colors: Record<string, string> = {
			draft: 'bg-muted text-muted-foreground',
			scheduled: 'bg-primary/10 text-primary',
			ongoing: 'bg-accent text-accent-foreground',
			completed: 'bg-accent text-accent-foreground',
			cancelled: 'bg-destructive/10 text-destructive'
		};
		return colors[status] || 'bg-muted text-muted-foreground';
	}

	function getVisibilityLabel(type: string): string {
		const labels: Record<string, string> = {
			company: 'Company-Wide',
			department: 'Department',
			specific: 'Specific People'
		};
		return labels[type] || type;
	}

	function getRsvpStatusColor(status: string): string {
		const colors: Record<string, string> = {
			accepted: 'bg-primary/10 text-primary',
			declined: 'bg-destructive/10 text-destructive',
			tentative: 'bg-accent text-accent-foreground',
			pending: 'bg-primary/10 text-primary',
			no_response: 'bg-muted text-muted-foreground'
		};
		return colors[status] || 'bg-muted text-muted-foreground';
	}
</script>

<Tabs
	value={activeTab}
	onValueChange={(v) => (activeTab = v as any)}
	class="flex flex-col flex-1 overflow-hidden"
>
	<TabsList class="mx-6 mt-4">
		<TabsTrigger value="details">Details</TabsTrigger>
		<TabsTrigger value="comments" class="relative">
			Comments
			{#if commentCount > 0}
				<Badge variant="secondary" class="ml-2">{commentCount}</Badge>
			{/if}
		</TabsTrigger>
		<TabsTrigger value="history">History</TabsTrigger>
	</TabsList>

	<div class="flex-1 overflow-y-auto">
		<TabsContent value="details" class="p-6">
			<!-- Event Header -->
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-foreground mb-3">{event.title}</h1>
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="rounded-md px-2 py-1 text-xs font-medium {getStatusBadgeColor(event.status)}"
					>
						{event.status.charAt(0).toUpperCase() + event.status.slice(1)}
					</span>
					<span class="rounded-md px-2 py-1 text-xs font-medium bg-accent text-accent-foreground">
						{event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
					</span>
					{#if event.visibilityType}
						<span class="rounded-md px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
							{getVisibilityLabel(event.visibilityType)}
						</span>
					{/if}
				</div>
			</div>

			{#if showCapacityIndicator}
				<div class="mb-6">
					<EventCapacityIndicator
						acceptedCount={event.acceptedCount || 0}
						maxCapacity={event.maxCapacity || 0}
						waitlistCount={event.waitlistCount || 0}
						isFull={event.isFull || false}
					/>
				</div>
			{/if}

			<div class="grid gap-4 sm:grid-cols-2 mb-6">
				<div class="flex items-start gap-3">
					<CalendarIcon class="h-5 w-5 text-muted-foreground mt-0.5" />
					<div>
						<div class="text-sm font-medium text-foreground mb-1">Date & Time</div>
						<div class="text-sm text-muted-foreground">
							{formatEventTimeRange(event.startTime, event.endTime, event.isAllDay ?? false)}
						</div>
						{#if event.isAllDay}
							<span
								class="mt-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
							>
								All Day
							</span>
						{/if}
					</div>
				</div>

				{#if event.location}
					<div class="flex items-start gap-3">
						<MapPin class="h-5 w-5 text-muted-foreground mt-0.5" />
						<div>
							<div class="text-sm font-medium text-foreground mb-1">Location</div>
							<div class="text-sm text-muted-foreground">{event.location}</div>
						</div>
					</div>
				{/if}

				<div class="flex items-start gap-3">
					<User class="h-5 w-5 text-muted-foreground mt-0.5" />
					<div>
						<div class="text-sm font-medium text-foreground mb-1">Organizer</div>
						<div class="text-sm text-muted-foreground">
							{event.organizer?.displayName || 'Unknown'}
						</div>
					</div>
				</div>

				{#if displayRsvpStats}
					<div class="flex items-start gap-3">
						<Users class="h-5 w-5 text-muted-foreground mt-0.5" />
						<div class="flex-1">
							<div class="text-sm font-medium text-foreground mb-1">Attendees</div>
							<div class="text-sm text-muted-foreground space-y-0.5">
								{#if displayRsvpStats.accepted > 0}
									<div>{displayRsvpStats.accepted} Accepted</div>
								{/if}
								{#if displayRsvpStats.tentative > 0}
									<div>{displayRsvpStats.tentative} Tentative</div>
								{/if}
								{#if displayRsvpStats.declined > 0}
									<div>{displayRsvpStats.declined} Declined</div>
								{/if}
								{#if displayRsvpStats.pending > 0}
									<div>{displayRsvpStats.pending} Pending</div>
								{/if}
								{#if displayRsvpStats.total === 0}
									<div class="text-muted-foreground">No attendees yet</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if event.description}
				<div class="mb-6 border-t pt-6">
					<h3 class="text-sm font-medium text-foreground mb-2">Description</h3>
					<p class="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
				</div>
			{/if}

			<div class="border-t pt-6">
				<h3 class="text-sm font-medium text-foreground mb-3">Your RSVP</h3>
				<div class="flex flex-col sm:flex-row gap-3 items-start">
					<div>
						<RSVPButton currentStatus={userRsvpStatus} onChange={handleRsvpChange} />
					</div>

					{#if userRsvpStatus === 'accepted' || userRsvpStatus === 'tentative'}
						<div class="flex items-center gap-2">
							{#if isSavingReminder}
								<svg
									class="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
							{:else}
								<Bell class="h-4 w-4 text-muted-foreground flex-shrink-0" />
							{/if}
							<select
								bind:value={selectedReminder}
								onchange={(e) => handleReminderChange(e.currentTarget.value as ReminderPreset)}
								disabled={isSavingReminder}
								class="inline-flex items-center gap-2 rounded-lg font-medium transition-all px-3 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<option value="none">No reminder</option>
								<option value="15min">15 min before</option>
								<option value="1hour">1 hour before</option>
								<option value="1day">1 day before</option>
								<option value="1week">1 week before</option>
							</select>
						</div>
					{/if}
				</div>
			</div>

			{#if showWaitlistButton}
				<div class="border-t pt-6">
					<h3 class="text-sm font-medium text-foreground mb-3">Waitlist</h3>
					<WaitlistButton
						eventId={event.id}
						isOnWaitlist={userWaitlistStatus?.isOnWaitlist || false}
						waitlistPosition={userWaitlistStatus?.position || null}
						onJoin={handleJoinWaitlistWrapper}
						onLeave={handleLeaveWaitlistWrapper}
					/>
					{#if waitlistError}
						<div class="text-sm text-destructive mt-2">
							{waitlistError}
						</div>
					{/if}
				</div>
			{/if}

			{#if event.attendees && event.attendees.length > 0}
				<div class="border-t pt-6">
					<h3 class="text-sm font-medium text-foreground mb-4">
						Attendee List ({displayRsvpStats?.total || 0})
					</h3>

					<div class="flex flex-wrap gap-2 mb-4">
						<button
							class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
							'all'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
							onclick={() => (activeAttendeeTab = 'all')}
						>
							All ({displayRsvpStats?.total || 0})
						</button>
						<!-- Only show tabs with count > 0 -->
						{#if (displayRsvpStats?.accepted || 0) > 0}
							<button
								class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
								'accepted'
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
								onclick={() => (activeAttendeeTab = 'accepted')}
							>
								Accepted ({displayRsvpStats?.accepted || 0})
							</button>
						{/if}
						{#if (displayRsvpStats?.tentative || 0) > 0}
							<button
								class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
								'tentative'
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
								onclick={() => (activeAttendeeTab = 'tentative')}
							>
								Tentative ({displayRsvpStats?.tentative || 0})
							</button>
						{/if}
						{#if (displayRsvpStats?.declined || 0) > 0}
							<button
								class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
								'declined'
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
								onclick={() => (activeAttendeeTab = 'declined')}
							>
								Declined ({displayRsvpStats?.declined || 0})
							</button>
						{/if}
						{#if (displayRsvpStats?.pending || 0) > 0}
							<button
								class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
								'pending'
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
								onclick={() => (activeAttendeeTab = 'pending')}
							>
								Pending ({displayRsvpStats?.pending || 0})
							</button>
						{/if}
						{#if displayRsvpStats && displayRsvpStats.total - displayRsvpStats.accepted - displayRsvpStats.declined - displayRsvpStats.tentative - displayRsvpStats.pending > 0}
							<button
								class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {activeAttendeeTab ===
								'no_response'
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
								onclick={() => (activeAttendeeTab = 'no_response')}
							>
								No Response ({displayRsvpStats.total -
									displayRsvpStats.accepted -
									displayRsvpStats.declined -
									displayRsvpStats.tentative -
									displayRsvpStats.pending})
							</button>
						{/if}
					</div>

					<div class="space-y-2 max-h-60 overflow-y-auto">
						{#if filteredAttendees.length > 0}
							{#each filteredAttendees as attendee (attendee.id)}
								<div
									class="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
								>
									<div class="flex items-center gap-2">
										<div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
											<span class="text-xs font-medium text-muted-foreground">
												{attendee.employee?.displayName?.charAt(0)?.toUpperCase() || '?'}
											</span>
										</div>
										<div class="text-sm font-medium text-foreground">
											{attendee.employee?.displayName || 'Unknown'}
											{#if attendee.employeeId === userId}
												<span class="ml-1.5 text-xs text-primary">(You)</span>
											{/if}
										</div>
									</div>
									<span
										class="rounded-md px-2 py-1 text-xs font-medium {getRsvpStatusColor(
											attendee.responseStatus
										)}"
									>
										{attendee.responseStatus.replace('_', ' ').charAt(0).toUpperCase() +
											attendee.responseStatus.slice(1).replace('_', ' ')}
									</span>
								</div>
							{/each}
						{:else}
							<p class="text-sm text-muted-foreground py-4 text-center">
								{activeAttendeeTab === 'all'
									? 'No attendees yet.'
									: `No attendees with ${activeAttendeeTab.replace('_', ' ')} status.`}
							</p>
						{/if}
					</div>
				</div>
			{/if}
		</TabsContent>

		<TabsContent value="comments" class="p-6">
			<EventCommentThread
				eventId={event.id}
				comments={mappedComments}
				currentUserId={userId}
				currentUserRole={userRole}
				eventOrganizerId={event.organizerId}
				onAddComment={handleAddCommentWrapper}
				onUpdateComment={handleUpdateCommentWrapper}
				onDeleteComment={handleDeleteCommentWrapper}
				onLoadMore={onLoadMoreComments}
				hasMore={hasMoreComments}
			/>
			{#if commentError}
				<div class="text-sm text-destructive mt-2">
					{commentError}
				</div>
			{/if}
		</TabsContent>

		<TabsContent value="history" class="p-6">
			<EventHistoryView
				history={mappedHistory}
				onLoadMore={onLoadMoreHistory}
				hasMore={hasMoreHistory}
			/>
		</TabsContent>
	</div>
</Tabs>
