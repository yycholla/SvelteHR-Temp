<script lang="ts">
	// EventCard Component
	// Feature: 019-we-need-to - Task T019
	// Purpose: Display event summary with RSVP indicator

	import type { Event, RsvpStatus } from '$lib/graphql/types';
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
	let eventTypeLabel = $derived(EVENT_TYPE_LABELS[event.type] || event.type);
	let timeRange = $derived(formatEventTimeRange(event.startDate, event.endDate, event.allDay));

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
	class="event-card group relative rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md"
	class:cursor-pointer={onClick}
	class:hover:border-blue-300={onClick}
	class:compact
	role={onClick ? 'button' : 'article'}
	tabindex={onClick ? 0 : undefined}
	onclick={handleClick}
	onkeypress={handleKeyPress}
>
	<!-- Event Color Indicator -->
	<div class="absolute left-0 top-0 h-full w-1 rounded-l-lg" style="background-color: {event.color}"></div>

	<!-- Event Header -->
	<div class="mb-2 flex items-start justify-between pl-3">
		<div class="flex-1">
			<h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
				{event.title}
			</h3>

			{#if !compact}
				<div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
					<!-- Event Type Badge -->
					<span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
						{eventTypeLabel}
					</span>

					<!-- Event Status Badge -->
					<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getEventStatusColor(event.status)}">
						{event.status}
					</span>

					{#if isOngoing}
						<span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
							● Ongoing
						</span>
					{:else if isUpcoming}
						<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
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
	<div class="mb-2 flex items-center pl-3 text-sm text-gray-700">
		<svg class="mr-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
		<span>{timeRange}</span>
	</div>

	<!-- Event Location -->
	{#if event.location && !compact}
		<div class="mb-2 flex items-center pl-3 text-sm text-gray-700">
			<svg class="mr-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			<span>{event.location}</span>
		</div>
	{/if}

	<!-- Event Description -->
	{#if event.description && !compact}
		<div class="mb-3 pl-3 text-sm text-gray-600">
			<p class="line-clamp-2">{event.description}</p>
		</div>
	{/if}

	<!-- Event Footer -->
	{#if !compact}
		<div class="flex items-center justify-between border-t border-gray-100 pt-3 pl-3">
			<!-- Organizer -->
			<div class="flex items-center text-sm text-gray-600">
				<svg class="mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
				<span>Organized by <span class="font-medium text-gray-900">{event.organizer.displayName}</span></span>
			</div>

			<!-- Attendee Count -->
			{#if event.eventAttendees && event.eventAttendees.nodes.length > 0}
				<div class="flex items-center text-sm text-gray-600">
					<svg class="mr-1 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
					</svg>
					<span>{event.eventAttendees.nodes.length} attendee{event.eventAttendees.nodes.length !== 1 ? 's' : ''}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.event-card.compact {
		@apply p-3;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
