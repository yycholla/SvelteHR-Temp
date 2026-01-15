<script lang="ts">
	import type { PageData } from './$types';
	import { logger } from '$lib/utils/logger';
	import EventCalendar from '$lib/components/events/EventCalendar.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import type { EventStatus, EventType, EventVisibilityType, RsvpStatus } from '$lib/graphql/types';
	import { normalizeRsvpStatus } from '$lib/graphql/types';
	import type {
		Event,
		EventComment,
		EventHistoryEntry,
		UserWaitlistStatus
	} from '$lib/graphql/events-operations';
	import {
		CREATE_EVENT_COMMENT,
		DELETE_EVENT_COMMENT,
		GET_EVENT_COMMENTS,
		GET_EVENT_HISTORY,
		GET_USER_WAITLIST_STATUS,
		JOIN_EVENT_WAITLIST,
		LEAVE_EVENT_WAITLIST,
		UPDATE_EVENT_COMMENT
	} from '$lib/graphql/events-operations';
	import { sanitizeCommentContent } from '$lib/utils/sanitize';
	import { createUrqlClient } from '$lib/graphql/client';
	import type { EventData } from '$lib/components/events/types';

	// Import decomposed components
	import EventSidebar from './components/EventSidebar.svelte';
	import EventModals from './components/EventModals.svelte';

	const { data }: { data: PageData } = $props();

	// Client-side URQL client
	let urqlClient: any = null;
	if (browser) {
		const token = document.cookie
			.split('; ')
			.find((row) => row.startsWith('hr_token='))
			?.split('=')[1];
		if (token) localStorage.setItem('postgraphile-jwt-token', token);
		urqlClient = createUrqlClient();
	}

	const timezoneOffset = new Date().getTimezoneOffset();

	// Helper function to convert Event to EventData format
	function convertEventToEventData(event: Event): EventData {
		return {
			id: event.id,
			title: event.title,
			description: event.description,
			startTime: event.startTime,
			endTime: event.endTime,
			isAllDay: event.isAllDay,
			location: event.location,
			eventType: event.eventType as EventType,
			visibilityType: event.isPublic
				? ('company' as EventVisibilityType)
				: ('specific' as EventVisibilityType),
			status: event.status,
			organizerId: event.organizerId,
			rrule: null, // RRULE not yet in GraphQL schema
			maxCapacity: null, // Capacity not yet in GraphQL schema
			acceptedCount:
				event.attendees?.filter((a) => normalizeRsvpStatus(a.responseStatus) === 'accepted')
					.length || 0,
			waitlistCount: 0, // Waitlist count not yet in GraphQL schema
			waitlistEnabled: false, // Waitlist not yet fully implemented
			isFull: false,
			organizer: event.organizer
				? {
						displayName: event.organizer.displayName
					}
				: undefined,
			attendees: event.attendees?.map((a) => ({
				id: a.id,
				employeeId: a.employeeId,
				responseStatus: normalizeRsvpStatus(a.responseStatus),
				reminderTime: null,
				employee: a.employee
					? {
							displayName: a.employee.displayName
						}
					: undefined
			}))
		};
	}

	// State - use $derived for automatic reactive tracking
	const events = $derived(data.events || []);
	const eventsAsEventData = $derived(events.map(convertEventToEventData));

	let localRsvpStatuses = $state<Record<string, RsvpStatus>>({});
	let pendingRsvpUpdates = $state<Record<string, RsvpStatus>>({});

	// Sync RSVP status
	$effect(() => {
		const newStatuses: Record<string, RsvpStatus> = {};
		const updatesToClear: string[] = [];
		(events || []).forEach((event: Event) => {
			const userAttendee = event.attendees?.find((a) => a.employeeId === data.user.id);
			const serverStatus = normalizeRsvpStatus(userAttendee?.responseStatus);
			if (pendingRsvpUpdates[event.id]) {
				const pendingStatus = pendingRsvpUpdates[event.id];
				if (serverStatus === pendingStatus) {
					updatesToClear.push(event.id);
					newStatuses[event.id] = serverStatus;
				} else {
					newStatuses[event.id] = pendingStatus;
				}
			} else {
				newStatuses[event.id] = serverStatus;
			}
		});
		localRsvpStatuses = newStatuses;
		if (updatesToClear.length > 0) {
			const newPending = { ...pendingRsvpUpdates };
			updatesToClear.forEach((id) => delete newPending[id]);
			pendingRsvpUpdates = newPending;
		}
	});

	// UI State
	const iCalLink = $derived(`${$page.url.origin}/api/calendar/events.ics`);

	let showCreateDialog = $state(false);
	let createDialogDefaults = $state<{ startTime?: string; endTime?: string; allDay?: boolean }>({});

	let showDetailsDialog = $state(false);
	let detailsDialogMode = $state<'view' | 'edit'>('view');
	let selectedEvent = $state<any>(null);
	let selectedEventRsvpStats = $state<any>(null);

	// Feature 026 State
	let eventComments = $state<EventComment[]>([]);
	let commentCount = $state(0);
	let commentOffset = $state(0);
	let hasMoreComments = $state(false);
	let eventHistory = $state<EventHistoryEntry[]>([]);
	let historyOffset = $state(0);
	let hasMoreHistory = $state(false);
	let userWaitlistStatus = $state<UserWaitlistStatus>({ isOnWaitlist: false, position: null });

	// Filters
	let selectedVisibility = $state<EventVisibilityType | 'all'>(data.filters?.visibility || 'all');
	let selectedStatus = $state<EventStatus | 'all'>(data.filters?.status || 'all');
	let selectedType = $state<EventType | 'all'>(data.filters?.type || 'all');

	// Handlers
	async function handleEventClick(event: any) {
		selectedEvent = event;
		const attendees = event.attendees || [];
		selectedEventRsvpStats = {
			total: attendees.length,
			accepted: attendees.filter((a: any) => a.responseStatus === 'accepted').length,
			declined: attendees.filter((a: any) => a.responseStatus === 'declined').length,
			tentative: attendees.filter((a: any) => a.responseStatus === 'tentative').length,
			pending: attendees.filter((a: any) => a.responseStatus === 'pending').length
		};
		detailsDialogMode = 'view';
		await Promise.all([
			fetchEventComments(event.id, true),
			fetchEventHistory(event.id, true),
			fetchUserWaitlistStatus(event.id)
		]);
		showDetailsDialog = true;
	}

	async function fetchEventComments(eventId: string, reset: boolean = false) {
		if (!urqlClient) return;
		try {
			const offset = reset ? 0 : commentOffset;
			const result = await urqlClient
				.query(GET_EVENT_COMMENTS, { eventId, limit: 20, offset })
				.toPromise();
			if (result.error || !result.data) return;
			const rawComments = result.data.eventComments || [];
			const comments = rawComments.map((c: any) => ({
				id: c.id,
				content: c.commentText,
				author: {
					id: c.user?.id || c.userId,
					name: c.user?.displayName || 'Unknown',
					avatarUrl: undefined
				},
				mentions: [],
				createdAt: c.createdAt,
				updatedAt: c.updatedAt
			}));
			if (reset) {
				eventComments = comments;
				commentOffset = comments.length;
			} else {
				eventComments = [...eventComments, ...comments];
				commentOffset += comments.length;
			}
			commentCount = result.data.eventCommentsCount || rawComments.length;
			hasMoreComments = rawComments.length >= 20;
		} catch (err) {
			logger.error(
				'Failed to fetch event comments',
				err instanceof Error ? err : new Error(String(err)),
				{ eventId }
			);
		}
	}

	async function fetchEventHistory(eventId: string, reset: boolean = false) {
		if (!urqlClient) return;
		try {
			const offset = reset ? 0 : historyOffset;
			const result = await urqlClient
				.query(GET_EVENT_HISTORY, { eventId, limit: 25, offset })
				.toPromise();
			if (result.error || !result.data) return;
			const rawHistory = result.data.eventHistories || [];
			const history = rawHistory.map((h: any) => ({
				id: h.id,
				changedBy: { id: h.changedBy?.id, name: h.changedBy?.displayName || 'Unknown' },
				changeType: h.changeType,
				fieldName: h.fieldName,
				oldValue: h.oldValues,
				newValue: h.newValues,
				changedAt: h.createdAt
			}));
			if (reset) {
				eventHistory = history;
				historyOffset = history.length;
			} else {
				eventHistory = [...eventHistory, ...history];
				historyOffset += history.length;
			}
			hasMoreHistory = rawHistory.length >= 25;
		} catch (err) {
			logger.error(
				'Failed to fetch event history',
				err instanceof Error ? err : new Error(String(err)),
				{ eventId }
			);
		}
	}

	async function fetchUserWaitlistStatus(eventId: string) {
		if (!urqlClient) return;
		try {
			const result = await urqlClient
				.query(GET_USER_WAITLIST_STATUS, { eventId, userId: data.user.id })
				.toPromise();
			if (result.data?.eventWaitlists?.length > 0) {
				const w = result.data.eventWaitlists[0];
				userWaitlistStatus = { isOnWaitlist: true, position: w.position, joinedAt: w.joinedAt };
			} else {
				userWaitlistStatus = { isOnWaitlist: false, position: null };
			}
		} catch (err) {
			logger.error(
				'Failed to fetch waitlist status',
				err instanceof Error ? err : new Error(String(err)),
				{ eventId }
			);
		}
	}

	async function handleAddComment(content: string, mentions: string[]) {
		if (!selectedEvent || !urqlClient) return;
		try {
			const result = await urqlClient
				.mutation(CREATE_EVENT_COMMENT, {
					input: {
						eventId: selectedEvent.id,
						userId: data.user.id,
						commentText: sanitizeCommentContent(content)
					}
				})
				.toPromise();
			if (result.data) {
				fetchEventComments(selectedEvent.id, true);
				toast.success('Comment added');
			}
		} catch (e) {
			toast.error('Failed to add comment');
		}
	}

	async function handleUpdateComment(commentId: string, content: string) {
		if (!urqlClient) return;
		try {
			const result = await urqlClient
				.mutation(UPDATE_EVENT_COMMENT, {
					id: commentId,
					input: { commentText: sanitizeCommentContent(content) }
				})
				.toPromise();
			if (result.data) {
				fetchEventComments(selectedEvent.id, true);
				toast.success('Comment updated');
			}
		} catch (e) {
			toast.error('Failed to update comment');
		}
	}

	async function handleDeleteComment(commentId: string) {
		if (!urqlClient) return;
		try {
			const result = await urqlClient.mutation(DELETE_EVENT_COMMENT, { id: commentId }).toPromise();
			if (result.data) {
				eventComments = eventComments.filter((c) => c.id !== commentId);
				toast.success('Comment deleted');
			}
		} catch (e) {
			toast.error('Failed to delete comment');
		}
	}

	async function handleJoinWaitlist(eventId: string) {
		if (!urqlClient) return;
		try {
			await urqlClient
				.mutation(JOIN_EVENT_WAITLIST, { eventId, employeeId: data.user.id })
				.toPromise();
			fetchUserWaitlistStatus(eventId);
			toast.success('Joined waitlist');
		} catch (e) {
			toast.error('Failed to join waitlist');
		}
	}

	async function handleLeaveWaitlist(eventId: string) {
		if (!urqlClient) return;
		try {
			await urqlClient
				.mutation(LEAVE_EVENT_WAITLIST, { eventId, employeeId: data.user.id })
				.toPromise();
			fetchUserWaitlistStatus(eventId);
			toast.success('Left waitlist');
		} catch (e) {
			toast.error('Failed to leave waitlist');
		}
	}

	function formatLocalISO(date: Date): string {
		const offset = date.getTimezoneOffset() * 60000;
		return new Date(date.getTime() - offset).toISOString().slice(0, 16);
	}

	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);
		if (selectedVisibility !== 'all') params.set('visibility', selectedVisibility);
		else params.delete('visibility');
		if (selectedStatus !== 'all') params.set('status', selectedStatus);
		else params.delete('status');
		if (selectedType !== 'all') params.set('type', selectedType);
		else params.delete('type');
		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Handlers for dialog state management
	const handleLoadMoreComments = async () => {
		if (selectedEvent) await fetchEventComments(selectedEvent.id, false);
	};
	const handleLoadMoreHistory = async () => {
		if (selectedEvent) await fetchEventHistory(selectedEvent.id, false);
	};
	const handleRsvpUpdate = (eventId: string, status: RsvpStatus) => {
		pendingRsvpUpdates = { ...pendingRsvpUpdates, [eventId]: status };
	};
</script>

<svelte:head>
	<title>Events - MountainHR</title>
</svelte:head>

<div class="p-8 max-w-[1600px] mx-auto">
	<div class="flex flex-col xl:flex-row gap-8">
		<!-- Sidebar: Controls & Metrics -->
		<EventSidebar
			canCreateEvents={data.canCreateEvents}
			statistics={data.statistics}
			{iCalLink}
			bind:selectedVisibility
			bind:selectedType
			bind:selectedStatus
			onCreateEvent={() => {
				createDialogDefaults = {};
				showCreateDialog = true;
			}}
			onApplyFilters={applyFilters}
		/>

		<!-- Main Content: Calendar -->
		<div class="flex-1 min-w-0">
			<Card.Root class="min-h-[600px] border-border shadow-sm overflow-hidden">
				<Card.Content class="p-0">
					<EventCalendar
						{events}
						userId={data.user.id}
						canManageEvents={data.canCreateEvents}
						{localRsvpStatuses}
						onEventClick={handleEventClick}
						onDateClick={(date) => {
							const start = formatLocalISO(date);
							const endObj = new Date(date);
							endObj.setMinutes(endObj.getMinutes() + 30);
							createDialogDefaults = {
								startTime: start,
								endTime: formatLocalISO(endObj),
								allDay: false
							};
							showCreateDialog = true;
						}}
						onDateSelect={(start, end, allDay) => {
							createDialogDefaults = {
								startTime: formatLocalISO(start),
								endTime: formatLocalISO(end),
								allDay
							};
							showCreateDialog = true;
						}}
						onEventDrop={async (eventId, newStart, newEnd) => {
							const formData = new FormData();
							formData.append('eventId', eventId);
							formData.append('startTime', newStart.toISOString());
							formData.append('endTime', newEnd.toISOString());
							const res = await fetch('?/updateEventTime', { method: 'POST', body: formData });
							if (res.ok) {
								await invalidateAll();
								toast.success('Event updated');
							} else {
								toast.error('Failed to update');
								throw new Error('Failed');
							}
						}}
						visibilityFilter={selectedVisibility === 'all' ? 'all' : selectedVisibility}
					/>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

<EventModals
	bind:showCreateDialog
	{createDialogDefaults}
	employees={data.employees}
	bind:showDetailsDialog
	bind:detailsDialogMode
	bind:selectedEvent
	{selectedEventRsvpStats}
	{eventComments}
	{eventHistory}
	{userWaitlistStatus}
	{hasMoreComments}
	{hasMoreHistory}
	allEvents={eventsAsEventData}
	userId={data.user.id}
	userRole={data.user.role}
	canCreateEvents={data.canCreateEvents}
	userPerms={data.userPerms}
	onAddComment={handleAddComment}
	onUpdateComment={handleUpdateComment}
	onDeleteComment={handleDeleteComment}
	onJoinWaitlist={handleJoinWaitlist}
	onLeaveWaitlist={handleLeaveWaitlist}
	onLoadMoreComments={handleLoadMoreComments}
	onLoadMoreHistory={handleLoadMoreHistory}
	onRsvpUpdate={handleRsvpUpdate}
/>
