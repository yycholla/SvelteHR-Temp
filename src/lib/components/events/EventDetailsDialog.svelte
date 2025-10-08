<script lang="ts">
	/**
	 * EventDetailsDialog Component
	 * Feature: 019-we-need-to - Events Management
	 *
	 * Unified dialog for viewing and editing event details.
	 * Supports view mode (read-only) and edit mode with full form functionality.
	 */

	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { X, Edit, Trash2, Calendar as CalendarIcon, MapPin, User, Users } from 'lucide-svelte';
	import RSVPButton from './RSVPButton.svelte';
	import { formatEventTimeRange } from '$lib/utils/events';
	import type { RsvpStatus, EventType, EventVisibilityType } from '$lib/graphql/types';

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
		onClose: () => void;
		onSuccess?: () => void;
		onEdit?: () => void;
		onDelete?: () => void;
	}

	let {
		isOpen = false,
		event = null,
		userId,
		canManageEvent = false,
		mode = 'view',
		rsvpStats,
		onClose,
		onSuccess,
		onEdit,
		onDelete
	}: Props = $props();

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
		if (event.key === 'Escape' && isOpen && !isSubmitting && !isDeleting) {
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

	// Reset form when event changes or dialog opens
	$effect(() => {
		if (isOpen && event) {
			title = event.title;
			description = event.description || '';
			// Convert UTC to local datetime-local format
			startTime = event.startTime.slice(0, 16);
			endTime = event.endTime.slice(0, 16);
			isAllDay = event.allDay || false;
			location = event.location || '';
			eventType = event.eventType;
			visibilityType = event.visibilityType || 'company';
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
				class="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg border bg-card shadow-lg overflow-visible"
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
					<!-- View Mode -->
					<div class="p-6 overflow-y-auto">
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
								onChange={async (newStatus) => {
									console.log('🔔 RSVP onChange - selected status:', newStatus);
									console.log('🔔 Current userRsvpStatus:', userRsvpStatus());

									// Find the current user's attendee record
									const userAttendee = event.eventAttendeesByEventId?.nodes.find(
										(a) => a.employeeId === userId
									);

									console.log('🔔 User attendee record:', userAttendee);

									const formData = new FormData();
									formData.append('eventId', event.id);
									formData.append('status', newStatus);

									if (userAttendee) {
										// Update existing attendee
										formData.append('attendeeId', userAttendee.id);
										console.log('🔔 Updating existing attendee:', userAttendee.id);
									} else {
										console.log('🔔 Creating new attendee for user:', userId);
									}

									console.log('🔔 Submitting RSVP update...');

									const response = await fetch('/dashboard/events?/updateRsvpStatus', {
										method: 'POST',
										body: formData
									});

									console.log('🔔 Response status:', response.status);

									const result = await response.json();
									console.log('🔔 Response result:', result);

									if (result.type === 'success' || (response.ok && !result.error)) {
										toast.success('RSVP updated successfully');
										console.log('🔔 Calling invalidateAll...');
										await invalidateAll();
										console.log('🔔 invalidateAll complete');
										console.log('🔔 New userRsvpStatus after refresh:', userRsvpStatus());
									} else {
										const errorMsg = result.error || result.data?.error || 'Failed to update RSVP';
										toast.error(errorMsg);
									}
								}}
							/>
						</div>
					</div>
				{:else}
					<!-- Edit Mode -->
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
{/if}
