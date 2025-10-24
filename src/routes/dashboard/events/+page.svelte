<script lang="ts">
	// Events Calendar Page
	// Feature: 019-we-need-to - Task T028
	// Purpose: Display events in calendar view with filtering
	// Feature 026: Integration with comments, history, and waitlist

	import type { PageData } from './$types';
	import EventCalendar from '$lib/components/events/EventCalendar.svelte';
	import EventCreateDialog from '$lib/components/events/EventCreateDialog.svelte';
	import EventDetailsDialog from '$lib/components/events/EventDetailsDialog.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import type { EventVisibilityType, EventStatus, EventType, RsvpStatus } from '$lib/graphql/types';
	import { Calendar, Copy, Check } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { EventComment, EventHistoryEntry, UserWaitlistStatus } from '$lib/graphql/events-operations';
	import {
		GET_EVENT_COMMENTS,
		GET_EVENT_HISTORY,
		GET_USER_WAITLIST_STATUS,
		CREATE_EVENT_COMMENT,
		UPDATE_EVENT_COMMENT,
		DELETE_EVENT_COMMENT,
		JOIN_EVENT_WAITLIST,
		LEAVE_EVENT_WAITLIST
	} from '$lib/graphql/events-operations';
	import { sanitizeCommentContent, extractMentions } from '$lib/utils/sanitize';
	import { createUrqlClient } from '$lib/graphql/client';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();

	// Create client-side urqlClient for fetching event details
	// Get token from cookie and store in localStorage for urql to use
	let urqlClient: any = null;
	if (browser) {
		// Get token from cookie (set by server)
		const token = document.cookie
			.split('; ')
			.find(row => row.startsWith('hr_token='))
			?.split('=')[1];

		if (token) {
			// Store in localStorage with the key urql expects
			localStorage.setItem('postgraphile-jwt-token', token);
		}

		urqlClient = createUrqlClient();
	}

	// Get user's timezone offset in minutes
	const timezoneOffset = new Date().getTimezoneOffset();

	// Solution 1: Make events deeply reactive with $state
	let events = $state(data.events);

	// Sync with server data when it changes (after invalidateAll)
	$effect(() => {
		events = data.events;
	});

	// Solution 2: Local RSVP status object for optimistic updates (plain object for Svelte 5 reactivity)
	let localRsvpStatuses = $state<Record<string, RsvpStatus>>({});

	// Track pending RSVP updates (optimistic UI)
	let pendingRsvpUpdates = $state<Record<string, RsvpStatus>>({});

	// Initialize RSVP statuses from events data, but preserve pending updates
	$effect(() => {
		console.log('[+page] RSVP init effect triggered');
		const newStatuses: Record<string, RsvpStatus> = {};
		const updatesToClear: string[] = [];

		events.forEach(event => {
			const userAttendee = event.eventAttendeesByEventId?.nodes?.find(
				(a: any) => a.employeeId === data.user.id
			);
			const serverStatus = userAttendee?.responseStatus || 'no_response';

			// Check if there's a pending update for this event
			if (pendingRsvpUpdates[event.id]) {
				const pendingStatus = pendingRsvpUpdates[event.id];

				// If server data matches pending update, we can clear the pending update
				if (serverStatus === pendingStatus) {
					console.log(`[+page] Server synced for ${event.id}, clearing pending update`);
					updatesToClear.push(event.id);
					newStatuses[event.id] = serverStatus;
				} else {
					// Server hasn't synced yet, keep using pending update
					console.log(`[+page] Using pending update for ${event.id}:`, pendingStatus, '(server still has:', serverStatus, ')');
					newStatuses[event.id] = pendingStatus;
				}
			} else {
				// No pending update, use server data
				newStatuses[event.id] = serverStatus;
			}
		});

		console.log('[+page] Setting localRsvpStatuses to:', newStatuses);
		localRsvpStatuses = newStatuses;

		// Clear pending updates that have been synced with server
		if (updatesToClear.length > 0) {
			console.log('[+page] Clearing synced pending updates:', updatesToClear);
			const newPending = { ...pendingRsvpUpdates };
			updatesToClear.forEach(id => delete newPending[id]);
			pendingRsvpUpdates = newPending;
		}
	});

	// iCal link state
	let showICalDialog = $state(false);
	let iCalLinkCopied = $state(false);
	const iCalLink = $derived(`${$page.url.origin}/api/calendar/events.ics`);

	// Create event dialog state
	let showCreateDialog = $state(false);
	let createDialogDefaults = $state<{
		startTime?: string;
		endTime?: string;
		allDay?: boolean;
	}>({});

	// Event details dialog state
	let showDetailsDialog = $state(false);
	let detailsDialogMode = $state<'view' | 'edit'>('view');
	let selectedEvent = $state<any>(null);
	let selectedEventRsvpStats = $state<any>(null);

	// Feature 026: Comments, History, Waitlist state
	let eventComments = $state<EventComment[]>([]);
	let commentCount = $state(0);
	let commentOffset = $state(0);
	let hasMoreComments = $state(false);

	let eventHistory = $state<EventHistoryEntry[]>([]);
	let historyOffset = $state(0);
	let hasMoreHistory = $state(false);

	let userWaitlistStatus = $state<UserWaitlistStatus>({ isOnWaitlist: false, position: null });

	// Filter state
	let selectedVisibility = $state<EventVisibilityType | 'all'>(data.filters.visibility || 'all');
	let selectedStatus = $state<EventStatus | 'all'>(data.filters.status || 'all');
	let selectedType = $state<EventType | 'all'>(data.filters.type || 'all');

	// Handle event click (open details dialog)
	async function handleEventClick(event: any) {
		console.log('🔔 Event clicked - full data:', event);
		console.log('🔔 Event attendees raw:', event.eventAttendeesByEventId);

		selectedEvent = event;
		// Calculate RSVP stats
		const attendees = event.eventAttendeesByEventId?.nodes || [];
		console.log('🔔 Attendees array:', attendees);

		selectedEventRsvpStats = {
			total: attendees.length,
			accepted: attendees.filter((a: any) => a.responseStatus === 'accepted').length,
			declined: attendees.filter((a: any) => a.responseStatus === 'declined').length,
			tentative: attendees.filter((a: any) => a.responseStatus === 'tentative').length,
			pending: attendees.filter((a: any) => a.responseStatus === 'pending').length
		};
		detailsDialogMode = 'view';

		// Feature 026: Fetch comments, history, and waitlist status
		await Promise.all([
			fetchEventComments(event.id, true),
			fetchEventHistory(event.id, true),
			fetchUserWaitlistStatus(event.id)
		]);

		showDetailsDialog = true;
	}

	// Feature 026: Fetch event comments with pagination
	async function fetchEventComments(eventId: string, reset: boolean = false) {
		if (!urqlClient) return;

		try {
			const offset = reset ? 0 : commentOffset;
			const result = await urqlClient
				.query(GET_EVENT_COMMENTS, {
					eventId,
					limit: 20,
					offset
				})
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error fetching event comments:', result.error);
				return;
			}

			const rawComments = result.data.allEventComments?.nodes || [];
			const totalCount = result.data.allEventComments?.totalCount || 0;
			const hasMore = result.data.allEventComments?.pageInfo?.hasNextPage || false;

			// Transform GraphQL response to match component's expected format
			const comments = rawComments.map((c: any) => ({
				id: c.id,
				content: c.content,
				author: {
					id: c.userByEmployeeId?.id || c.employeeId,
					name: c.userByEmployeeId?.displayName || 'Unknown User',
					avatarUrl: undefined // Users table doesn't have avatarUrl field
				},
				mentions: c.mentions || [],
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

			commentCount = totalCount;
			hasMoreComments = hasMore;
		} catch (err) {
			console.error('Failed to fetch event comments:', err);
			toast.error('Failed to load comments');
		}
	}

	// Feature 026: Fetch event history with pagination
	async function fetchEventHistory(eventId: string, reset: boolean = false) {
		if (!urqlClient) return;

		try {
			const offset = reset ? 0 : historyOffset;
			const result = await urqlClient
				.query(GET_EVENT_HISTORY, {
					eventId,
					limit: 25,
					offset
				})
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error fetching event history:', result.error);
				return;
			}

			const rawHistory = result.data.allEventHistories?.nodes || [];
			const hasMore = result.data.allEventHistories?.pageInfo?.hasNextPage || false;

			// Transform GraphQL response to match component's expected format
			const history = rawHistory.map((h: any) => ({
				id: h.id,
				changedBy: {
					id: h.userByChangedBy?.id || h.changedBy,
					name: h.userByChangedBy?.displayName || 'Unknown User'
				},
				changeType: h.changeType,
				fieldName: h.fieldName,
				oldValue: h.oldValue,
				newValue: h.newValue,
				changedAt: h.createdAt // GraphQL has createdAt, component expects changedAt
			}));

			if (reset) {
				eventHistory = history;
				historyOffset = history.length;
			} else {
				eventHistory = [...eventHistory, ...history];
				historyOffset += history.length;
			}

			hasMoreHistory = hasMore;
		} catch (err) {
			console.error('Failed to fetch event history:', err);
			toast.error('Failed to load event history');
		}
	}

	// Feature 026: Fetch user's waitlist status
	async function fetchUserWaitlistStatus(eventId: string) {
		if (!urqlClient) return;

		try {
			const result = await urqlClient
				.query(GET_USER_WAITLIST_STATUS, {
					eventId,
					userId: data.user.id
				})
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error fetching waitlist status:', result.error);
				return;
			}

			const nodes = result.data.allEventWaitlists?.nodes || [];
			if (nodes.length > 0) {
				const waitlistEntry = nodes[0];
				userWaitlistStatus = {
					isOnWaitlist: true,
					position: waitlistEntry.position || null,
					joinedAt: waitlistEntry.joinedAt
				};
			} else {
				userWaitlistStatus = { isOnWaitlist: false, position: null };
			}
		} catch (err) {
			console.error('Failed to fetch waitlist status:', err);
		}
	}

	// Feature 026: Handle comment mutations
	async function handleAddComment(content: string, mentions: string[]) {
		if (!selectedEvent || !urqlClient) return;

		// Sanitize content before sending
		const sanitized = sanitizeCommentContent(content);
		// TODO: Convert username mentions to UUIDs
		// For now, passing empty array since mentions are usernames, not UUIDs

		try {
			const result = await urqlClient
				.mutation(CREATE_EVENT_COMMENT, {
					eventId: selectedEvent.id,
					employeeId: data.user.id,
					content: sanitized,
					mentions: []
				})
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error creating comment:', result.error);
				throw new Error(result.error?.message || 'Failed to create comment');
			}

			// Use the returned comment data directly instead of refetching
			const newComment = result.data.createEventComment.eventComment;
			const transformedComment = {
				id: newComment.id,
				content: newComment.content,
				author: {
					id: newComment.userByEmployeeId?.id || data.user.id,
					name: newComment.userByEmployeeId?.displayName || data.user.display_name || 'Unknown User',
					avatarUrl: undefined
				},
				mentions: newComment.mentions || [],
				createdAt: newComment.createdAt,
				updatedAt: newComment.createdAt
			};

			// Add the new comment to the beginning of the list (most recent first)
			eventComments = [transformedComment, ...eventComments];
			commentCount += 1;

			toast.success('Comment added successfully');
		} catch (err: any) {
			console.error('Failed to add comment:', err);
			toast.error(err.message || 'Failed to add comment');
			throw err;
		}
	}

	async function handleUpdateComment(commentId: string, content: string) {
		if (!selectedEvent || !urqlClient) return;

		// Sanitize content before sending
		const sanitized = sanitizeCommentContent(content);
		// TODO: Convert usernames from extractMentions to UUIDs
		// const mentionUsernames = extractMentions(sanitized);

		try {
			const result = await urqlClient
				.mutation(UPDATE_EVENT_COMMENT, {
					commentId,
					content: sanitized,
					mentions: []
				})
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error updating comment:', result.error);
				throw new Error(result.error?.message || 'Failed to update comment');
			}

			// Update the comment in the local state directly
			const updatedComment = result.data.updateEventCommentById.eventComment;
			eventComments = eventComments.map(comment => {
				if (comment.id === commentId) {
					return {
						...comment,
						content: updatedComment.content,
						mentions: updatedComment.mentions || [],
						updatedAt: updatedComment.updatedAt
					};
				}
				return comment;
			});

			toast.success('Comment updated successfully');
		} catch (err: any) {
			console.error('Failed to update comment:', err);
			toast.error(err.message || 'Failed to update comment');
			throw err;
		}
	}

	async function handleDeleteComment(commentId: string) {
		if (!selectedEvent || !urqlClient) return;

		try {
			const result = await urqlClient
				.mutation(DELETE_EVENT_COMMENT, {
					commentId
				})
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error deleting comment:', result.error);
				throw new Error(result.error?.message || 'Failed to delete comment');
			}

			// Remove the comment from local state directly
			eventComments = eventComments.filter(comment => comment.id !== commentId);
			commentCount -= 1;

			toast.success('Comment deleted successfully');
		} catch (err: any) {
			console.error('Failed to delete comment:', err);
			toast.error(err.message || 'Failed to delete comment');
			throw err;
		}
	}

	// Feature 026: Handle waitlist mutations
	async function handleJoinWaitlist(eventId: string) {
		if (!urqlClient) return;

		try {
			const result = await urqlClient
				.mutation(JOIN_EVENT_WAITLIST, {
					eventId,
					employeeId: data.user.id
				})
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error joining waitlist:', result.error);
				throw new Error(result.error?.message || 'Failed to join waitlist');
			}

			// Refresh waitlist status
			await fetchUserWaitlistStatus(eventId);
			toast.success('Joined waitlist successfully');
		} catch (err: any) {
			console.error('Failed to join waitlist:', err);
			toast.error(err.message || 'Failed to join waitlist');
			throw err;
		}
	}

	async function handleLeaveWaitlist(eventId: string) {
		if (!urqlClient) return;

		try {
			const result = await urqlClient
				.mutation(LEAVE_EVENT_WAITLIST, {
					eventId,
					employeeId: data.user.id
				})
				.toPromise();

			if (result.error || !result.data) {
				console.error('Error leaving waitlist:', result.error);
				throw new Error(result.error?.message || 'Failed to leave waitlist');
			}

			// Refresh waitlist status
			await fetchUserWaitlistStatus(eventId);
			toast.success('Left waitlist successfully');
		} catch (err: any) {
			console.error('Failed to leave waitlist:', err);
			toast.error(err.message || 'Failed to leave waitlist');
			throw err;
		}
	}

	// Feature 026: Handle pagination
	async function handleLoadMoreComments() {
		if (selectedEvent) {
			await fetchEventComments(selectedEvent.id, false);
		}
	}

	async function handleLoadMoreHistory() {
		if (selectedEvent) {
			await fetchEventHistory(selectedEvent.id, false);
		}
	}

	// Format date to local ISO string (for URL parameter)
	function formatLocalISO(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');

		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
	}

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams($page.url.searchParams);

		if (selectedVisibility !== 'all') {
			params.set('visibility', selectedVisibility);
		} else {
			params.delete('visibility');
		}

		if (selectedStatus !== 'all') {
			params.set('status', selectedStatus);
		} else {
			params.delete('status');
		}

		if (selectedType !== 'all') {
			params.set('type', selectedType);
		} else {
			params.delete('type');
		}

		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Copy iCal link to clipboard
	async function copyICalLink() {
		try {
			await navigator.clipboard.writeText(iCalLink);
			iCalLinkCopied = true;
			setTimeout(() => {
				iCalLinkCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy link:', err);
		}
	}
</script>

<svelte:head>
	<title>Events - SvelteHR</title>
	<meta name="description" content="View and manage company events" />
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Page Header with Actions -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Events</h1>
			<p class="mt-2 text-muted-foreground">View and manage company events</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- iCal Subscribe Button -->
			<button
				onclick={() => (showICalDialog = !showICalDialog)}
				class="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
			>
				<Calendar class="mr-2 h-4 w-4" />
				Calendar Feed
			</button>

			{#if data.canCreateEvents}
				<button
					onclick={() => {
						createDialogDefaults = {};
						showCreateDialog = true;
					}}
					class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					<svg
						class="mr-2 h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						></path>
					</svg>
					Create Event
				</button>
			{/if}
		</div>
	</div>

	<!-- iCal Link Dialog -->
	{#if showICalDialog}
		<div class="mb-6 rounded-lg border border-primary/20 bg-card p-6 shadow-lg">
			<div class="mb-4 flex items-start justify-between">
				<div>
					<h3 class="text-lg font-semibold text-card-foreground">Calendar Feed</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						Subscribe to this calendar feed in your calendar application
					</p>
				</div>
				<button
					onclick={() => (showICalDialog = false)}
					class="text-muted-foreground hover:text-foreground"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<div class="space-y-4">
				<!-- Copy Link Section -->
				<div>
					<label class="mb-2 block text-sm font-medium text-card-foreground"
						>iCal Feed URL</label
					>
					<div class="flex items-center gap-2">
						<input
							type="text"
							readonly
							value={iCalLink}
							class="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground dark:bg-input/80"
						/>
						<button
							onclick={copyICalLink}
							class="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{#if iCalLinkCopied}
								<Check class="h-4 w-4" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">
						Copy this URL to subscribe in Google Calendar, Apple Calendar, Outlook, or any
						iCal-compatible application
					</p>
				</div>

				<!-- Quick Actions -->
				<div class="flex items-center gap-3 border-t pt-4">
					<a
						href={iCalLink}
						download="sveltehr-events.ics"
						class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
					>
						<Calendar class="mr-2 h-4 w-4" />
						Download .ics File
					</a>
					<div class="text-xs text-muted-foreground">
						or copy the URL above to subscribe
					</div>
				</div>

				<!-- Instructions -->
				<div class="rounded-md bg-muted p-4 dark:bg-input/30">
					<h4 class="mb-2 text-sm font-semibold text-card-foreground">How to Subscribe:</h4>
					<ul class="space-y-1 text-xs text-muted-foreground">
						<li>• <strong>Google Calendar:</strong> Settings → Add calendar → From URL</li>
						<li>
							• <strong>Apple Calendar:</strong> File → New Calendar Subscription → Paste URL
						</li>
						<li>
							• <strong>Outlook:</strong> Add calendar → Subscribe from web → Paste URL
						</li>
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<!-- Filters -->
	<div class="mb-6 rounded-lg border bg-card p-4 shadow-sm">
		<!-- Filters Row -->
		<div class="flex flex-wrap items-end gap-4">
			<!-- Visibility Filter -->
			<div class="flex-1 min-w-[200px]">
				<label for="visibility-filter" class="block text-sm font-medium text-foreground mb-1">
					Visibility
				</label>
				<select
					id="visibility-filter"
					bind:value={selectedVisibility}
					onchange={applyFilters}
					class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="all">All Visibility</option>
					<option value="company">Company-Wide</option>
					<option value="department">Department</option>
					<option value="specific">Specific People</option>
				</select>
			</div>

			<!-- Status Filter -->
			<div class="flex-1 min-w-[200px]">
				<label for="status-filter" class="block text-sm font-medium text-foreground mb-1">
					Status
				</label>
				<select
					id="status-filter"
					bind:value={selectedStatus}
					onchange={applyFilters}
					class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="all">All Statuses</option>
					<option value="draft">Draft</option>
					<option value="scheduled">Scheduled</option>
					<option value="ongoing">Ongoing</option>
					<option value="completed">Completed</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</div>

			<!-- Event Type Filter -->
			<div class="flex-1 min-w-[200px]">
				<label for="type-filter" class="block text-sm font-medium text-foreground mb-1">
					Event Type
				</label>
				<select
					id="type-filter"
					bind:value={selectedType}
					onchange={applyFilters}
					class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="all">All Types</option>
					<option value="meeting">Meeting</option>
					<option value="training">Training</option>
					<option value="social">Social</option>
					<option value="conference">Conference</option>
					<option value="other">Other</option>
				</select>
			</div>

			<!-- Reset Filters Button -->
			<div>
				<button
					type="button"
					onclick={() => goto('/dashboard/events')}
					class="rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					Reset
				</button>
			</div>
		</div>
	</div>

	<!-- Statistics Summary -->
	<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="rounded-lg border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-card-foreground">{data.statistics.total}</div>
			<div class="text-sm text-muted-foreground">Total Events</div>
		</div>

		<div class="rounded-lg border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold text-primary">{data.statistics.upcoming}</div>
			<div class="text-sm text-muted-foreground">Upcoming</div>
		</div>

		<div class="rounded-lg border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold" style="color: hsl(var(--chart-4))">{data.statistics.myEvents}</div>
			<div class="text-sm text-muted-foreground">My Events</div>
		</div>

		<div class="rounded-lg border bg-card p-4 shadow-sm">
			<div class="text-2xl font-bold" style="color: hsl(var(--chart-2))">{data.statistics.accepted}</div>
			<div class="text-sm text-muted-foreground">Accepted</div>
		</div>
	</div>

	<!-- Events Calendar -->
	<div class="mb-6">
		<!-- Always show calendar view, even with no events -->
		<EventCalendar
				events={events}
				userId={data.user.id}
				canManageEvents={data.canCreateEvents}
				localRsvpStatuses={localRsvpStatuses}
				onEventClick={handleEventClick}
				onDateClick={(date) => {
					// Open create dialog with pre-filled date (local time)
					const formattedDate = formatLocalISO(date);
					const endDate = new Date(date);
					endDate.setMinutes(endDate.getMinutes() + 30);
					const formattedEndDate = formatLocalISO(endDate);

					createDialogDefaults = {
						startTime: formattedDate,
						endTime: formattedEndDate,
						allDay: false
					};
					showCreateDialog = true;
				}}
				onDateSelect={(start, end, allDay) => {
					// Open create dialog with pre-filled start and end times
					createDialogDefaults = {
						startTime: formatLocalISO(start),
						endTime: formatLocalISO(end),
						allDay
					};
					showCreateDialog = true;
				}}
				onEventDrop={async (eventId, newStart, newEnd) => {
					// Handle event drag-and-drop (move or resize)
					// Submit form data to update event time
					// toISOString() converts the local date to UTC, which is what we want
					const formData = new FormData();
					formData.append('eventId', eventId);
					formData.append('startTime', newStart.toISOString());
					formData.append('endTime', newEnd.toISOString());

					const response = await fetch('?/updateEventTime', {
						method: 'POST',
						body: formData
					});

					// Parse JSON response from form action
					const result = await response.json();

					if (result.type === 'success' || (response.ok && !result.error)) {
						// Refresh the page data to show updated event times
						await invalidateAll();
						toast.success('Event time updated successfully');
					} else {
						// Extract error message from form action response
						const errorMsg = result.error || result.data?.error || 'Failed to update event';
						console.error('Failed to update event time:', errorMsg);
						toast.error(errorMsg);
						// Throw error to trigger FullCalendar revert
						throw new Error(errorMsg);
					}
				}}
				visibilityFilter={selectedVisibility === 'all' ? 'all' : selectedVisibility}
		/>
	</div>

	<!-- Create Event Dialog -->
	<EventCreateDialog
		isOpen={showCreateDialog}
		defaultStartTime={createDialogDefaults.startTime}
		defaultEndTime={createDialogDefaults.endTime}
		defaultAllDay={createDialogDefaults.allDay}
		minDate={new Date().toISOString().split('T')[0]}
		employees={data.employees}
		onClose={() => (showCreateDialog = false)}
		onSuccess={() => {
			showCreateDialog = false;
		}}
	/>

	<!-- Event Details Dialog (View/Edit) -->
	<EventDetailsDialog
		isOpen={showDetailsDialog}
		event={selectedEvent}
		userId={data.user.id}
		canManageEvent={data.canCreateEvents && selectedEvent?.organizerId === data.user.id}
		mode={detailsDialogMode}
		rsvpStats={selectedEventRsvpStats}
		eventComments={eventComments}
		commentCount={commentCount}
		eventHistory={eventHistory}
		userWaitlistStatus={userWaitlistStatus}
		hasMoreComments={hasMoreComments}
		hasMoreHistory={hasMoreHistory}
		allEvents={events}
		onClose={() => {
			// Close dialog and reset state
			showDetailsDialog = false;
			selectedEvent = null;

			// Reset Feature 026 state
			eventComments = [];
			eventHistory = [];
			commentOffset = 0;
			historyOffset = 0;
			commentCount = 0;
			hasMoreComments = false;
			hasMoreHistory = false;
			userWaitlistStatus = { isOnWaitlist: false, position: null };
		}}
		onSuccess={async () => {
			// Reload data in background to sync with server
			await invalidateAll();

		// Note: pendingRsvpUpdates will be automatically cleared when server data matches
		}}
	onRsvpUpdate={(eventId: string, newStatus: RsvpStatus) => {
		console.log("[Calendar Update] onRsvpUpdate called:", { eventId, newStatus });

		// Track this as a pending update (prevents server data from overwriting optimistic update)
		// The $effect watching pendingRsvpUpdates will automatically update localRsvpStatuses
		pendingRsvpUpdates = {
			...pendingRsvpUpdates,
			[eventId]: newStatus
		};
		console.log("[Calendar Update] Pending updates set:", pendingRsvpUpdates);
	}}
		onAddComment={handleAddComment}
		onUpdateComment={handleUpdateComment}
		onDeleteComment={handleDeleteComment}
		onLoadMoreComments={handleLoadMoreComments}
		onLoadMoreHistory={handleLoadMoreHistory}
		onJoinWaitlist={handleJoinWaitlist}
		onLeaveWaitlist={handleLeaveWaitlist}
	/>
</div>
