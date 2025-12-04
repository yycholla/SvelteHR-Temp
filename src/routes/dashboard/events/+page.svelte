<script lang="ts">
	import type { PageData } from './$types';
	import EventCalendar from '$lib/components/events/EventCalendar.svelte';
	import EventCreateDialog from '$lib/components/events/EventCreateDialog.svelte';
	import EventDetailsDialog from '$lib/components/events/EventDetailsDialog.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Label } from '$lib/components/ui/label';
	import {
		Calendar as CalendarIcon,
		Check,
		Copy,
		Download,
		Filter,
		Plus,
		RefreshCw
	} from '@lucide/svelte';
	import type { EventStatus, EventType, EventVisibilityType, RsvpStatus } from '$lib/graphql/types';
	import { normalizeRsvpStatus } from '$lib/graphql/types';
	import type {
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

	// State - use $derived for automatic reactive tracking
	const events = $derived(data.events || []);

	let localRsvpStatuses = $state<Record<string, RsvpStatus>>({});
	let pendingRsvpUpdates = $state<Record<string, RsvpStatus>>({});

	// Sync RSVP status
	$effect(() => {
		const newStatuses: Record<string, RsvpStatus> = {};
		const updatesToClear: string[] = [];
		(events || []).forEach((event) => {
			const userAttendee = event.attendees?.find((a: any) => a.employeeId === data.user.id);
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
	let showICalDialog = $state(false);
	let iCalLinkCopied = $state(false);
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

	// ... [Keep existing fetch/mutation handlers for comments/history/waitlist] ...
	// For brevity in rewriting, I assume the imports handle the logic, but I need to redefine them here as they access component state.
	// I will copy the helper functions from the previous file content.

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
			commentCount = result.data.eventCommentsCount || rawComments.length; // Adjust if count available
			hasMoreComments = rawComments.length >= 20;
		} catch (err) {
			console.error(err);
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
			console.error(err);
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
			console.error(err);
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

	async function copyICalLink() {
		await navigator.clipboard.writeText(iCalLink);
		iCalLinkCopied = true;
		setTimeout(() => (iCalLinkCopied = false), 2000);
	}

	// Handlers for dialog state management
	const handleLoadMoreComments = () => selectedEvent && fetchEventComments(selectedEvent.id, false);
	const handleLoadMoreHistory = () => selectedEvent && fetchEventHistory(selectedEvent.id, false);
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
		<div class="w-full xl:w-80 flex flex-col gap-6">
			<!-- Main Actions Card -->
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title>Calendar</Card.Title>
					<Card.Description>Manage your schedule</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if data.canCreateEvents}
						<Button
							class="w-full justify-start"
							onclick={() => {
								createDialogDefaults = {};
								showCreateDialog = true;
							}}
						>
							<Plus class="mr-2 h-4 w-4" />
							New Event
						</Button>
					{/if}
					<Button
						variant="outline"
						class="w-full justify-start"
						onclick={() => (showICalDialog = !showICalDialog)}
					>
						<Download class="mr-2 h-4 w-4" />
						Export Calendar
					</Button>
				</Card.Content>
			</Card.Root>

			<!-- iCal Export Dialog (Inline) -->
			{#if showICalDialog}
				<Card.Root class="border-primary/20 bg-muted/50">
					<Card.Header class="pb-2">
						<Card.Title class="text-sm">Calendar Feed</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3">
						<div class="flex gap-2">
							<div
								class="flex-1 bg-background border rounded px-2 py-1 text-xs truncate font-mono text-muted-foreground"
							>
								{iCalLink}
							</div>
							<Button size="icon" variant="ghost" class="h-7 w-7" onclick={copyICalLink}>
								{#if iCalLinkCopied}<Check class="h-3 w-3" />{:else}<Copy class="h-3 w-3" />{/if}
							</Button>
						</div>
						<a
							href={iCalLink}
							download
							class="text-xs text-primary hover:underline flex items-center"
						>
							Download .ics file <CalendarIcon class="ml-1 h-3 w-3" />
						</a>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Stats Grid -->
			<div class="grid grid-cols-2 gap-3">
				<Card.Root class="bg-card">
					<Card.Content class="p-4 text-center">
						<div class="text-2xl font-bold text-foreground">{data.statistics?.upcoming ?? 0}</div>
						<div class="text-xs text-muted-foreground">Upcoming</div>
					</Card.Content>
				</Card.Root>
				<Card.Root class="bg-card">
					<Card.Content class="p-4 text-center">
						<div class="text-2xl font-bold text-emerald-600">{data.statistics?.accepted ?? 0}</div>
						<div class="text-xs text-muted-foreground">Accepted</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Filters -->
			<Card.Root>
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<Card.Title class="text-base">Filters</Card.Title>
						<Button
							variant="ghost"
							size="icon"
							class="h-6 w-6"
							onclick={() => goto('/dashboard/events')}
						>
							<RefreshCw class="h-3 w-3" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label class="text-xs font-medium text-muted-foreground">Visibility</Label>
						<select
							class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
							bind:value={selectedVisibility}
							onchange={applyFilters}
						>
							<option value="all">All</option>
							<option value="company">Company</option>
							<option value="department">Department</option>
							<option value="specific">Personal</option>
						</select>
					</div>
					<div class="space-y-2">
						<Label class="text-xs font-medium text-muted-foreground">Type</Label>
						<select
							class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
							bind:value={selectedType}
							onchange={applyFilters}
						>
							<option value="all">All Types</option>
							<option value="meeting">Meeting</option>
							<option value="training">Training</option>
							<option value="social">Social</option>
							<option value="conference">Conference</option>
							<option value="review">Review</option>
						</select>
					</div>
					<div class="space-y-2">
						<Label class="text-xs font-medium text-muted-foreground">Status</Label>
						<select
							class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
							bind:value={selectedStatus}
							onchange={applyFilters}
						>
							<option value="all">All Statuses</option>
							<option value="scheduled">Scheduled</option>
							<option value="completed">Completed</option>
							<option value="cancelled">Cancelled</option>
						</select>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

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

<EventCreateDialog
	isOpen={showCreateDialog}
	defaultStartTime={createDialogDefaults.startTime}
	defaultEndTime={createDialogDefaults.endTime}
	defaultAllDay={createDialogDefaults.allDay}
	minDate={new Date().toISOString().split('T')[0]}
	employees={data.employees}
	onClose={() => (showCreateDialog = false)}
	onSuccess={() => (showCreateDialog = false)}
/>

{#if showDetailsDialog && selectedEvent}
	<EventDetailsDialog
		isOpen={showDetailsDialog}
		mode={detailsDialogMode}
		event={selectedEvent}
		userId={data.user.id}
		userRole={data.user.role}
		canManageEvent={(data.canCreateEvents && selectedEvent?.organizerId === data.user.id) ||
			data.userPerms?.canDeleteEvents}
		rsvpStats={selectedEventRsvpStats}
		comments={eventComments}
		history={eventHistory}
		waitlistStatus={userWaitlistStatus}
		allEvents={events}
		onClose={() => {
			showDetailsDialog = false;
			selectedEvent = null;
		}}
		onAddComment={handleAddComment}
		onUpdateComment={handleUpdateComment}
		onDeleteComment={handleDeleteComment}
		onJoinWaitlist={handleJoinWaitlist}
		onLeaveWaitlist={handleLeaveWaitlist}
		onLoadMoreComments={handleLoadMoreComments}
		onLoadMoreHistory={handleLoadMoreHistory}
		onRsvpUpdate={handleRsvpUpdate}
		{hasMoreComments}
		{hasMoreHistory}
	/>
{/if}
