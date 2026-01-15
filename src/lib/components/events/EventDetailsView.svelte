<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { logger } from '$lib/utils/logger';
	import { toast } from 'svelte-sonner';
	import EventCommentThread from './EventCommentThread.svelte';
	import EventHistoryView from './EventHistoryView.svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { extractMentions, sanitizeCommentContent } from '$lib/utils/sanitize';
	import type { RsvpStatus } from '$lib/graphql/types';
	import type {
		EventComment,
		EventHistoryEntry,
		UserWaitlistStatus
	} from '$lib/graphql/events-operations';
	import type { EventData } from './types';

	// Import decomposed components
	import EventDetailsHeader from './details/EventDetailsHeader.svelte';
	import EventInfoGrid from './details/EventInfoGrid.svelte';
	import EventRsvpSection from './details/EventRsvpSection.svelte';
	import EventWaitlistSection from './details/EventWaitlistSection.svelte';
	import EventAttendeeList from './details/EventAttendeeList.svelte';

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
		if (onRsvpUpdate) {
			onRsvpUpdate(newStatus);
		}
	}

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
			<EventDetailsHeader {event} {showCapacityIndicator} />

			<EventInfoGrid {event} {displayRsvpStats} />

			{#if event.description}
				<div class="mb-6 border-t pt-6">
					<h3 class="text-sm font-medium text-foreground mb-2">Description</h3>
					<p class="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
				</div>
			{/if}

			<EventRsvpSection
				{userRsvpStatus}
				bind:selectedReminder
				{isSavingReminder}
				onRsvpChange={handleRsvpChange}
				onReminderChange={handleReminderChange}
			/>

			{#if showWaitlistButton}
				<EventWaitlistSection
					eventId={event.id}
					{userWaitlistStatus}
					{waitlistError}
					onJoinWaitlist={handleJoinWaitlistWrapper}
					onLeaveWaitlist={handleLeaveWaitlistWrapper}
				/>
			{/if}

			{#if event.attendees && event.attendees.length > 0}
				<EventAttendeeList bind:activeAttendeeTab {displayRsvpStats} {filteredAttendees} {userId} />
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
