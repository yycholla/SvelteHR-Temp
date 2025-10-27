<script lang="ts">
	// EventCard Component
	// Feature: 019-we-need-to - Task T019
	// Purpose: Display event summary with RSVP indicator

	import type { RsvpStatus } from '$lib/graphql/types';
	import type { Event } from '$lib/graphql/events-operations';
	import {
		formatEventTimeRange,
		getRsvpStatusColor,
		getEventStatusColor,
		isEventUpcoming,
		isEventOngoing,
		getUserRsvpStatus
	} from '$lib/utils/events';
	import { EVENT_TYPE_LABELS, RSVP_STATUS_LABELS } from '$lib/graphql/types';

	interface Props {
		event: Event;
		userId?: string;
		onClick?: () => void;
		showRsvp?: boolean;
		compact?: boolean;
	}

	let { event, userId, onClick, showRsvp = true, compact = false }: Props = $props();

	// Derived state
	let userRsvpStatus = $derived(userId ? getUserRsvpStatus(event, userId) : null);
	let isUpcoming = $derived(isEventUpcoming(event));
	let isOngoing = $derived(isEventOngoing(event));
	let eventTypeLabel = $derived(EVENT_TYPE_LABELS[event.eventType] || event.eventType);
	let timeRange = $derived(formatEventTimeRange(event.startTime, event.endTime, event.allDay));

	function handleClick() {
		if (onClick) {
			onClick();
		}
	}

	function handleKeyPress(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && onClick) {
			e.preventDefault();
			onClick();
		}
	}
</script>

<div
	class="event-card group relative rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md"
	class:cursor-pointer={onClick}
	class:hover:border-primary={onClick}
	class:compact
	role={onClick ? 'button' : 'article'}
	tabindex={onClick ? 0 : undefined}
	onclick={handleClick}
	onkeypress={handleKeyPress}
	data-testid="event-card"
>
	<!-- Event Color Indicator -->
	<div class="absolute left-0 top-0 h-full w-1 rounded-l-lg" style="background-color: {event.color}"></div>

	<!-- Event Header -->
	<div class="mb-2 flex items-start justify-between pl-3">
		<div class="flex-1">
			<h3 class="text-lg font-semibold text-foreground group-hover:text-primary">
				{event.title}
			</h3>

			{#if !compact}
				<div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
					<!-- Event Type Badge -->
					<span class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
						{eventTypeLabel}
					</span>

					<!-- Event Status Badge -->
					<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getEventStatusColor(event.status)}">
						{event.status}
					</span>

					{#if isOngoing}
						<span class="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
							● Ongoing
						</span>
					{:else if isUpcoming}
						<span class="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
							Upcoming
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- RSVP Status Indicator -->
		{#if showRsvp && userRsvpStatus}
			<div class="ml-4 flex-shrink-0">
				<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium {getRsvpStatusColor(userRsvpStatus)}">
					{RSVP_STATUS_LABELS[userRsvpStatus]}
				</span>
			</div>
		{/if}
	</div>

	<!-- Event Time -->
	<div class="mb-2 flex items-center pl-3 text-sm text-foreground">
		<svg class="mr-2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
		<span>{timeRange}</span>
	</div>

	<!-- Event Location -->
	{#if event.location && !compact}
		<div class="mb-2 flex items-center pl-3 text-sm text-foreground">
			<svg class="mr-2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			<span>{event.location}</span>
		</div>
	{/if}

	<!-- Event Description -->
	{#if event.description && !compact}
		<div class="mb-3 pl-3 text-sm text-muted-foreground">
			<p class="line-clamp-2">{event.description}</p>
		</div>
	{/if}

	<!-- Event Footer -->
	{#if !compact}
		<div class="flex items-center justify-between border-t pt-3 pl-3">
			<!-- Organizer -->
			<div class="flex items-center text-sm text-muted-foreground">
				<svg class="mr-1.5 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
				<span>Organized by <span class="font-medium text-foreground">{event.userByOrganizerId?.displayName || 'Unknown'}</span></span>
			</div>

			<!-- Attendee Count -->
			{#if event.eventAttendeesByEventId && event.eventAttendeesByEventId.nodes.length > 0}
				<div class="flex items-center text-sm text-muted-foreground">
					<svg class="mr-1 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
					</svg>
					<span>{event.eventAttendeesByEventId.nodes.length} attendee{event.eventAttendeesByEventId.nodes.length !== 1 ? 's' : ''}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>


