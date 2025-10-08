<script lang="ts">
	/**
	 * EventDetailsDialog Component
	 * Feature: 026-integrate-ui-components - Enhanced with tabs and integrated components
	 *
	 * Unified dialog for viewing and editing event details with:
	 * - Tab-based interface (Details, Comments, History)
	 * - Event capacity indicators and waitlist functionality
	 * - Event comments with @mentions and XSS sanitization
	 * - Event history audit trail
	 * - Recurring event scope selection
	 */

	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { X, Edit, Trash2, Calendar as CalendarIcon, MapPin, User, Users } from 'lucide-svelte';
	import RSVPButton from './RSVPButton.svelte';
	import RecurrenceScopeDialog from './RecurrenceScopeDialog.svelte';
	import EventCapacityIndicator from './EventCapacityIndicator.svelte';
	import WaitlistButton from './WaitlistButton.svelte';
	import EventCommentThread from './EventCommentThread.svelte';
	import EventHistoryView from './EventHistoryView.svelte';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { formatEventTimeRange } from '$lib/utils/events';
	import { sanitizeCommentContent, extractMentions } from '$lib/utils/sanitize';
	import type { RsvpStatus, EventType, EventVisibilityType } from '$lib/graphql/types';
	import type { EventComment, EventHistoryEntry, UserWaitlistStatus } from '$lib/graphql/events-operations';

	interface EventData {
		id: string;
		title: string;
		description?: string;
		startTime: string;
		endTime: string;
		allDay?: boolean;
		location?: string;
		eventType: EventType;
		visibilityType?: EventVisibilityType;
		status: string;
		rrule?: string | null; // Recurring event rule
		maxCapacity?: number | null; // Event capacity limit
		acceptedCount?: number; // Current accepted attendees
		waitlistCount?: number; // Current waitlist size
		waitlistEnabled?: boolean; // Whether waitlist is enabled
		isFull?: boolean; // Whether event is at capacity
		userByOrganizerId?: {
			displayName: string;
		};
		eventAttendeesByEventId?: {
			nodes: Array<{
				id: string;
				employeeId: string;
				responseStatus: RsvpStatus;
			}>;
		};
	}

	interface Props {
		isOpen: boolean;
		event: EventData | null;
		userId: string;
		canManageEvent?: boolean;
		mode?: 'view' | 'edit';
		rsvpStats?: {
			total: number;
			accepted: number;
			declined: number;
			tentative: number;
			pending: number;
		};
		// NEW: Feature 026 props
		eventComments?: EventComment[];
		commentCount?: number;
		eventHistory?: EventHistoryEntry[];
		userWaitlistStatus?: UserWaitlistStatus;
		hasMoreComments?: boolean;
		hasMoreHistory?: boolean;
		onClose: () => void;
		onSuccess?: () => void;
		onEdit?: () => void;
		onDelete?: () => void;
		// NEW: Feature 026 event handlers
		onAddComment?: (content: string, mentions: string[]) => Promise<void>;
		onUpdateComment?: (commentId: string, content: string) => Promise<void>;
		onDeleteComment?: (commentId: string) => Promise<void>;
		onLoadMoreComments?: () => Promise<void>;
		onLoadMoreHistory?: () => Promise<void>;
		onJoinWaitlist?: (eventId: string) => Promise<void>;
		onLeaveWaitlist?: (eventId: string) => Promise<void>;
	}

	let {
		isOpen = false,
		event = null,
		userId,
		canManageEvent = false,
		mode = 'view',
		rsvpStats,
		eventComments = [],
		commentCount = 0,
		eventHistory = [],
		userWaitlistStatus,
		hasMoreComments = false,
		hasMoreHistory = false,
		onClose,
		onSuccess,
		onEdit,
		onDelete,
		onAddComment,
		onUpdateComment,
		onDeleteComment,
		onLoadMoreComments,
		onLoadMoreHistory,
		onJoinWaitlist,
		onLeaveWaitlist
	}: Props = $props();

	// Tab state (FR-002: Default to Details tab)
	let activeTab = $state<'details' | 'comments' | 'history'>('details');

	// Form state for edit mode
	let title = $state('');
	let description = $state('');
	let startTime = $state('');
	let endTime = $state('');
	let isAllDay = $state(false);
	let location = $state('');
	let eventType = $state<EventType>('meeting');
	let visibilityType = $state<EventVisibilityType>('company');
	let isSubmitting = $state(false);
	let isDeleting = $state(false);

	// NEW: Recurring event scope dialog state (FR-005)
	let showScopeDialog = $state(false);
	let pendingRsvpStatus = $state<RsvpStatus | null>(null);

	// NEW: Error states for inline error handling (FR-017a, FR-012a)
	let commentError = $state<string | null>(null);
	let waitlistError = $state<string | null>(null);

	// Get user's timezone offset in minutes
	const timezoneOffset = new Date().getTimezoneOffset();

	// Get user's RSVP status
	const userRsvpStatus = $derived<RsvpStatus>(() => {
		if (!event || !event.eventAttendeesByEventId) return 'no_response';
		const userAttendee = event.eventAttendeesByEventId.nodes.find(
			(a) => a.employeeId === userId
		);
		return userAttendee?.responseStatus || 'no_response';
	});

	// NEW: Derived values for conditional rendering (FR-009, FR-012, FR-007)
	const showCapacityIndicator = $derived(
		event?.maxCapacity !== null && event?.maxCapacity !== undefined && event.maxCapacity > 0
	);

	const showWaitlistButton = $derived(
		event?.isFull === true && event?.waitlistEnabled === true
	);

	const isRecurringEvent = $derived(
		event?.rrule !== null && event?.rrule !== undefined && event.rrule !== ''
	);

	// Handle all-day toggle in edit mode
	function handleAllDayToggle() {
		if (isAllDay) {
			const startDate = new Date(startTime);
			startDate.setHours(0, 0, 0, 0);
			startTime = startDate.toISOString().slice(0, 16);

			const endDate = new Date(endTime);
			endDate.setHours(23, 59, 0, 0);
			endTime = endDate.toISOString().slice(0, 16);
		}
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen && !isSubmitting && !isDeleting && !showScopeDialog) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget && !isSubmitting && !isDeleting) {
			onClose();
		}
	}

	// Handle delete
	async function handleDelete() {
		if (!event) return;

		if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
			return;
		}

		isDeleting = true;
		try {
			const formData = new FormData();
			formData.append('eventId', event.id);

			const response = await fetch('/dashboard/events?/deleteEvent', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success' || (response.ok && !result.error)) {
				toast.success('Event deleted successfully');
				await invalidateAll();
				onClose();
				onDelete?.();
			} else {
				const errorMsg = result.error || result.data?.error || 'Failed to delete event';
				toast.error(errorMsg);
			}
		} catch (error) {
			console.error('Error deleting event:', error);
			toast.error('Failed to delete event. Please try again.');
		} finally {
			isDeleting = false;
		}
	}

	// NEW: Handle RSVP with recurring event scope (FR-005, FR-006, FR-007, FR-008)
	async function handleRsvpChange(newStatus: RsvpStatus) {
		if (!event) return;

		// If recurring event, show scope dialog (FR-005)
		if (isRecurringEvent) {
			pendingRsvpStatus = newStatus;
			showScopeDialog = true;
			return;
		}

		// Otherwise, update RSVP directly (FR-007)
		await updateRsvpStatus(newStatus, 'this_event');
	}

	// NEW: Handle scope selection for recurring events (FR-008)
	async function handleScopeConfirm(scope: 'this_event' | 'this_and_future' | 'all_events') {
		if (!pendingRsvpStatus) return;
		await updateRsvpStatus(pendingRsvpStatus, scope);
		showScopeDialog = false;
		pendingRsvpStatus = null;
	}

	// NEW: Update RSVP status with scope
	async function updateRsvpStatus(newStatus: RsvpStatus, scope: 'this_event' | 'this_and_future' | 'all_events') {
		if (!event) return;

		const userAttendee = event.eventAttendeesByEventId?.nodes.find(
			(a) => a.employeeId === userId
		);

		const formData = new FormData();
		formData.append('eventId', event.id);
		formData.append('status', newStatus);
		formData.append('scope', scope); // Pass scope for recurring events

		if (userAttendee) {
			formData.append('attendeeId', userAttendee.id);
		}

		const response = await fetch('/dashboard/events?/updateRsvpStatus', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (result.type === 'success' || (response.ok && !result.error)) {
			toast.success('RSVP updated successfully');
			await invalidateAll();
		} else {
			const errorMsg = result.error || result.data?.error || 'Failed to update RSVP';
			toast.error(errorMsg);
		}
	}

	// NEW: Wrapper functions for comment operations with error handling (FR-017a, FR-017b)
	async function handleAddComment(content: string) {
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

	async function handleUpdateComment(commentId: string, content: string) {
		if (!onUpdateComment) return;

		try {
			commentError = null;
			const sanitized = sanitizeCommentContent(content);
			await onUpdateComment(commentId, sanitized);
		} catch (error: any) {
			commentError = error.message || 'Failed to update comment. Please try again.';
		}
	}

	async function handleDeleteComment(commentId: string) {
		if (!onDeleteComment) return;

		try {
			commentError = null;
			await onDeleteComment(commentId);
		} catch (error: any) {
			commentError = error.message || 'Failed to delete comment. Please try again.';
		}
	}

	// NEW: Wrapper functions for waitlist operations with error handling (FR-012a, FR-012b)
	async function handleJoinWaitlist() {
		if (!onJoinWaitlist || !event) return;

		try {
			waitlistError = null;
			await onJoinWaitlist(event.id);
		} catch (error: any) {
			waitlistError = error.message || 'Failed to join waitlist. Please try again.';
		}
	}

	async function handleLeaveWaitlist() {
		if (!onLeaveWaitlist || !event) return;

		try {
			waitlistError = null;
			await onLeaveWaitlist(event.id);
		} catch (error: any) {
			waitlistError = error.message || 'Failed to leave waitlist. Please try again.';
		}
	}

	// Reset form when event changes or dialog opens
	$effect(() => {
		if (isOpen && event) {
			title = event.title;
			description = event.description || '';
			startTime = event.startTime.slice(0, 16);
			endTime = event.endTime.slice(0, 16);
			isAllDay = event.allDay || false;
			location = event.location || '';
			eventType = event.eventType;
			visibilityType = event.visibilityType || 'company';
			// Reset to details tab when opening (FR-002)
			activeTab = 'details';
			// Clear errors
			commentError = null;
			waitlistError = null;
		}
	});

	// Helper functions
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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && event}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
		onclick={handleBackdropClick}
		role="presentation"
	>
		<!-- Modal Content -->
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				class="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg border bg-card shadow-lg overflow-visible"
				role="dialog"
				aria-modal="true"
				aria-labelledby="dialog-title"
			>
				<!-- Header -->
				<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4">
					<h2 id="dialog-title" class="text-xl font-semibold text-foreground">
						{mode === 'edit' ? 'Edit Event' : 'Event Details'}
					</h2>
					<div class="flex items-center gap-2">
						{#if mode === 'view' && canManageEvent}
							<button
								type="button"
								onclick={() => onEdit?.()}
								class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
								aria-label="Edit event"
							>
								<Edit class="h-5 w-5" />
							</button>
							<button
								type="button"
								onclick={handleDelete}
								disabled={isDeleting}
								class="rounded-md p-2 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Delete event"
							>
								<Trash2 class="h-5 w-5" />
							</button>
						{/if}
						<button
							type="button"
							onclick={onClose}
							disabled={isSubmitting || isDeleting}
							class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							aria-label="Close dialog"
						>
							<X class="h-5 w-5" />
						</button>
					</div>
				</div>

				{#if mode === 'view'}
					<!-- View Mode with Tabs (FR-001, FR-002) -->
					<Tabs value={activeTab} onValueChange={(v) => (activeTab = v as any)} class="flex flex-col flex-1 overflow-hidden">
						<!-- Tab List with Badge (FR-003) -->
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
							<!-- Details Tab (FR-002) -->
							<TabsContent value="details" class="p-6">
								<!-- Event Header -->
								<div class="mb-6">
									<h1 class="text-2xl font-bold text-foreground mb-3">{event.title}</h1>
									<div class="flex flex-wrap items-center gap-2">
										<span class="rounded-md px-2 py-1 text-xs font-medium {getStatusBadgeColor(event.status)}">
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

								<!-- NEW: Capacity Indicator (FR-009, FR-010, FR-011, FR-014) -->
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

								<!-- Event Details Grid -->
								<div class="grid gap-4 sm:grid-cols-2 mb-6">
									<!-- Date and Time -->
									<div class="flex items-start gap-3">
										<CalendarIcon class="h-5 w-5 text-muted-foreground mt-0.5" />
										<div>
											<div class="text-sm font-medium text-foreground mb-1">Date & Time</div>
											<div class="text-sm text-muted-foreground">
												{formatEventTimeRange(event.startTime, event.endTime, event.allDay)}
											</div>
											{#if event.allDay}
												<span class="mt-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
													All Day
												</span>
											{/if}
										</div>
									</div>

									<!-- Location -->
									{#if event.location}
										<div class="flex items-start gap-3">
											<MapPin class="h-5 w-5 text-muted-foreground mt-0.5" />
											<div>
												<div class="text-sm font-medium text-foreground mb-1">Location</div>
												<div class="text-sm text-muted-foreground">{event.location}</div>
											</div>
										</div>
									{/if}

									<!-- Organizer -->
									<div class="flex items-start gap-3">
										<User class="h-5 w-5 text-muted-foreground mt-0.5" />
										<div>
											<div class="text-sm font-medium text-foreground mb-1">Organizer</div>
											<div class="text-sm text-muted-foreground">
												{event.userByOrganizerId?.displayName || 'Unknown'}
											</div>
										</div>
									</div>

									<!-- Attendees -->
									{#if rsvpStats}
										<div class="flex items-start gap-3">
											<Users class="h-5 w-5 text-muted-foreground mt-0.5" />
											<div>
												<div class="text-sm font-medium text-foreground mb-1">Attendees</div>
												<div class="text-sm text-muted-foreground">{rsvpStats.total} invited</div>
											</div>
										</div>
									{/if}
								</div>

								<!-- Description -->
								{#if event.description}
									<div class="mb-6 border-t pt-6">
										<h3 class="text-sm font-medium text-foreground mb-2">Description</h3>
										<p class="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
									</div>
								{/if}

								<!-- RSVP Section -->
								<div class="border-t pt-6">
									<h3 class="text-sm font-medium text-foreground mb-3">Your RSVP</h3>
									<RSVPButton
										currentStatus={userRsvpStatus()}
										onChange={handleRsvpChange}
									/>
								</div>

								<!-- NEW: Waitlist Button (FR-012, FR-013) -->
								{#if showWaitlistButton}
									<div class="border-t pt-6">
										<h3 class="text-sm font-medium text-foreground mb-3">Waitlist</h3>
										<WaitlistButton
											eventId={event.id}
											isOnWaitlist={userWaitlistStatus?.isOnWaitlist || false}
											waitlistPosition={userWaitlistStatus?.position || null}
											onJoin={handleJoinWaitlist}
											onLeave={handleLeaveWaitlist}
										/>
										{#if waitlistError}
											<div class="text-sm text-destructive mt-2">
												{waitlistError}
											</div>
										{/if}
									</div>
								{/if}
							</TabsContent>

							<!-- Comments Tab (FR-015, FR-016, FR-017, FR-020, FR-021, FR-022) -->
							<TabsContent value="comments" class="p-6">
								<EventCommentThread
									eventId={event.id}
									comments={eventComments}
									currentUserId={userId}
									onAddComment={handleAddComment}
									onUpdateComment={handleUpdateComment}
									onDeleteComment={handleDeleteComment}
									onLoadMore={onLoadMoreComments}
									hasMore={hasMoreComments}
								/>
								{#if commentError}
									<div class="text-sm text-destructive mt-2">
										{commentError}
									</div>
								{/if}
							</TabsContent>

							<!-- History Tab (FR-023, FR-024, FR-025, FR-026, FR-027) -->
							<TabsContent value="history" class="p-6">
								<EventHistoryView
									history={eventHistory}
									onLoadMore={onLoadMoreHistory}
									hasMore={hasMoreHistory}
								/>
							</TabsContent>
						</div>
					</Tabs>
				{:else}
					<!-- Edit Mode (unchanged) -->
					<form
						method="POST"
						action="/dashboard/events?/updateEvent"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ result, update }) => {
								isSubmitting = false;

								if (result.type === 'success') {
									toast.success('Event updated successfully');
									await invalidateAll();
									onClose();
									onSuccess?.();
								} else if (result.type === 'failure') {
									const errorMsg = result.data?.error || 'Failed to update event';
									toast.error(errorMsg);
								} else if (result.type === 'error') {
									toast.error('An unexpected error occurred');
								}

								await update();
							};
						}}
						class="p-6 overflow-y-auto"
					>
						<!-- Hidden fields -->
						<input type="hidden" name="eventId" value={event.id} />
						<input type="hidden" name="timezoneOffset" value={timezoneOffset} />

						<!-- Title -->
						<div class="mb-4">
							<label for="title" class="block text-sm font-medium text-foreground mb-2">
								Event Title <span class="text-destructive">*</span>
							</label>
							<input
								type="text"
								id="title"
								name="title"
								bind:value={title}
								required
								disabled={isSubmitting}
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
							/>
						</div>

						<!-- Description -->
						<div class="mb-4">
							<label for="description" class="block text-sm font-medium text-foreground mb-2">
								Description
							</label>
							<textarea
								id="description"
								name="description"
								bind:value={description}
								rows="4"
								disabled={isSubmitting}
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
							></textarea>
						</div>

						<!-- Date and Time -->
						<div class="mb-4 grid gap-4 sm:grid-cols-2">
							<div>
								<label for="startTime" class="block text-sm font-medium text-foreground mb-2">
									Start Time <span class="text-destructive">*</span>
								</label>
								<input
									type="datetime-local"
									id="startTime"
									name="startTime"
									bind:value={startTime}
									required
									disabled={isSubmitting}
									class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
								/>
							</div>

							<div>
								<label for="endTime" class="block text-sm font-medium text-foreground mb-2">
									End Time <span class="text-destructive">*</span>
								</label>
								<input
									type="datetime-local"
									id="endTime"
									name="endTime"
									bind:value={endTime}
									required
									min={startTime}
									disabled={isSubmitting}
									class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
								/>
							</div>
						</div>

						<!-- All Day -->
						<div class="mb-4">
							<label class="flex items-center cursor-pointer">
								<input
									type="checkbox"
									name="isAllDay"
									bind:checked={isAllDay}
									onchange={handleAllDayToggle}
									disabled={isSubmitting}
									class="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
								/>
								<span class="ml-2 text-sm text-foreground">All-day event</span>
							</label>
						</div>

						<!-- Location -->
						<div class="mb-4">
							<label for="location" class="block text-sm font-medium text-foreground mb-2">
								Location
							</label>
							<input
								type="text"
								id="location"
								name="location"
								bind:value={location}
								disabled={isSubmitting}
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
							/>
						</div>

						<!-- Event Type and Visibility -->
						<div class="mb-6 grid gap-4 sm:grid-cols-2">
							<div>
								<label for="eventType" class="block text-sm font-medium text-foreground mb-2">
									Event Type <span class="text-destructive">*</span>
								</label>
								<select
									id="eventType"
									name="eventType"
									bind:value={eventType}
									required
									disabled={isSubmitting}
									class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<option value="meeting">Meeting</option>
									<option value="training">Training</option>
									<option value="social">Social</option>
									<option value="conference">Conference</option>
									<option value="other">Other</option>
								</select>
							</div>

							<div>
								<label for="visibilityType" class="block text-sm font-medium text-foreground mb-2">
									Visibility <span class="text-destructive">*</span>
								</label>
								<select
									id="visibilityType"
									name="visibilityType"
									bind:value={visibilityType}
									required
									disabled={isSubmitting}
									class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<option value="company">Company-Wide</option>
									<option value="department">Department Only</option>
									<option value="specific">Specific People</option>
								</select>
							</div>
						</div>

						<!-- Form Actions -->
						<div class="flex items-center justify-end gap-4 border-t pt-6">
							<button
								type="button"
								onclick={onClose}
								disabled={isSubmitting}
								class="rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if isSubmitting}
									<svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Saving...
								{:else}
									Save Changes
								{/if}
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>

	<!-- NEW: Recurring Event Scope Dialog (FR-005, FR-006) -->
	{#if isRecurringEvent}
		<RecurrenceScopeDialog
			bind:open={showScopeDialog}
			eventTitle={event.title}
			action="RSVP update"
			onConfirm={handleScopeConfirm}
			onCancel={() => {
				showScopeDialog = false;
				pendingRsvpStatus = null;
			}}
		/>
	{/if}
{/if}
