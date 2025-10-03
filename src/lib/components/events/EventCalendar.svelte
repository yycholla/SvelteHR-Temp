<!--
  EventCalendar Component
  Feature: 019-we-need-to - Phase 4

  Full-featured calendar view for events with FullCalendar integration

  Features:
  - Month, week, and day views
  - Event creation via date click (manager/admin only)
  - Event editing via drag-and-drop
  - RSVP status color-coding
  - Event filtering by visibility type
  - Responsive design for mobile
  - Interactive event details

  Props:
  - events: Array of event objects
  - userId: Current user ID for RSVP status
  - canManageEvents: Whether user can create/edit events
  - onEventClick: Callback when event is clicked
  - onDateClick: Callback when date is clicked (for event creation)
  - onEventDrop: Callback when event is dragged to new date
  - visibilityFilter?: Filter events by visibility type
-->

<svelte:head>
	<link href="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.19/index.global.min.css" rel="stylesheet" />
	<link href="https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.19/index.global.min.css" rel="stylesheet" />
	<link href="https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.19/index.global.min.css" rel="stylesheet" />
</svelte:head>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { EventInput } from '@fullcalendar/core';

	// Props with Svelte 5 runes syntax
	let {
		events = [],
		userId,
		canManageEvents = false,
		onEventClick,
		onDateClick,
		onEventDrop,
		visibilityFilter = 'all'
	}: {
		events: any[];
		userId: string;
		canManageEvents?: boolean;
		onEventClick?: (event: any) => void;
		onDateClick?: (date: Date) => void;
		onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
		visibilityFilter?: 'all' | 'company' | 'department' | 'specific';
	} = $props();

	// State
	let calendarEl: HTMLElement;
	let calendar: any = null;

	// Derived: Filter events by visibility
	let filteredEvents = $derived(() => {
		if (visibilityFilter === 'all') {
			return events;
		}
		return events.filter((e: any) => e.visibilityType === visibilityFilter);
	});

	// Derived: Convert events to FullCalendar format
	let calendarEvents = $derived(() => {
		return filteredEvents().map((event: any) => {
			// Get user's RSVP status
			const userAttendee = event.attendees?.find((a: any) => a.employeeId === userId);
			const rsvpStatus = userAttendee?.rsvpStatus || 'no_response';

			// Color based on RSVP status
			const colorMap: Record<string, string> = {
				accepted: '#10b981', // green
				declined: '#ef4444', // red
				tentative: '#f59e0b', // amber
				pending: '#3b82f6', // blue
				no_response: '#6b7280' // gray
			};

			return {
				id: event.id,
				title: event.title,
				start: event.startTime,
				end: event.endTime,
				allDay: event.isAllDay,
				backgroundColor: colorMap[rsvpStatus],
				borderColor: colorMap[rsvpStatus],
				extendedProps: {
					...event,
					rsvpStatus
				}
			} as EventInput;
		});
	});

	// Initialize calendar on mount (client-side only)
	onMount(async () => {
		if (!browser) return;

		// Dynamically import FullCalendar modules (client-side only)
		const [{ Calendar }, { default: dayGridPlugin }, { default: timeGridPlugin }, { default: interactionPlugin }] = await Promise.all([
			import('@fullcalendar/core'),
			import('@fullcalendar/daygrid'),
			import('@fullcalendar/timegrid'),
			import('@fullcalendar/interaction')
		]);

		calendar = new Calendar(calendarEl, {
			plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
			initialView: 'dayGridMonth',
			headerToolbar: {
				left: 'prev,next today',
				center: 'title',
				right: 'dayGridMonth,timeGridWeek,timeGridDay'
			},
			editable: canManageEvents,
			selectable: canManageEvents,
			selectMirror: true,
			dayMaxEvents: true,
			weekends: true,
			events: calendarEvents(),
			eventClick: (info) => {
				if (onEventClick) {
					onEventClick(info.event.extendedProps);
				}
			},
			dateClick: (info) => {
				if (canManageEvents && onDateClick) {
					onDateClick(info.date);
				}
			},
			eventDrop: (info) => {
				if (canManageEvents && onEventDrop) {
					onEventDrop(
						info.event.id,
						info.event.start || new Date(),
						info.event.end || new Date()
					);
				}
			},
			eventResize: (info) => {
				if (canManageEvents && onEventDrop) {
					onEventDrop(
						info.event.id,
						info.event.start || new Date(),
						info.event.end || new Date()
					);
				}
			},
			height: 'auto',
			contentHeight: 'auto',
			aspectRatio: 1.8
		});

		calendar.render();
	});

	// Update calendar events when they change
	$effect(() => {
		if (calendar) {
			calendar.removeAllEvents();
			calendar.addEventSource(calendarEvents());
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (calendar) {
			calendar.destroy();
		}
	});

	// Public methods
	export function changeView(view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') {
		if (calendar) {
			calendar.changeView(view);
		}
	}

	export function goToDate(date: Date) {
		if (calendar) {
			calendar.gotoDate(date);
		}
	}

	export function today() {
		if (calendar) {
			calendar.today();
		}
	}

	export function next() {
		if (calendar) {
			calendar.next();
		}
	}

	export function prev() {
		if (calendar) {
			calendar.prev();
		}
	}
</script>

<div class="event-calendar-wrapper">
	<!-- Calendar container -->
	<div bind:this={calendarEl} class="event-calendar">
		{#if !browser}
			<!-- SSR placeholder -->
			<div class="calendar-loading">
				<div class="animate-pulse">
					<div class="h-8 bg-muted rounded mb-4"></div>
					<div class="grid grid-cols-7 gap-2 mb-2">
						{#each Array(7) as _}
							<div class="h-6 bg-muted rounded"></div>
						{/each}
					</div>
					<div class="grid grid-cols-7 gap-2">
						{#each Array(35) as _}
							<div class="h-20 bg-muted rounded"></div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Legend -->
	<div class="calendar-legend">
		<h4 class="text-sm font-semibold mb-2 text-foreground">RSVP Status Legend</h4>
		<div class="flex flex-wrap gap-3">
			<div class="flex items-center gap-1.5">
				<div class="w-3 h-3 rounded-sm" style="background-color: hsl(var(--chart-2))"></div>
				<span class="text-xs text-muted-foreground">Accepted</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="w-3 h-3 rounded-sm bg-destructive"></div>
				<span class="text-xs text-muted-foreground">Declined</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="w-3 h-3 rounded-sm" style="background-color: hsl(var(--chart-4))"></div>
				<span class="text-xs text-muted-foreground">Tentative</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="w-3 h-3 rounded-sm bg-primary"></div>
				<span class="text-xs text-muted-foreground">Pending</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="w-3 h-3 rounded-sm bg-muted"></div>
				<span class="text-xs text-muted-foreground">No Response</span>
			</div>
		</div>
	</div>
</div>

<style>
	.event-calendar-wrapper {
		width: 100%;
		padding: 1rem;
		background: hsl(var(--card));
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border));
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
	}

	.event-calendar {
		width: 100%;
		min-height: 600px;
	}

	.calendar-loading {
		width: 100%;
		min-height: 600px;
		padding: 1rem;
	}

	.calendar-legend {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid hsl(var(--border));
	}

	/* FullCalendar custom styles */
	:global(.fc) {
		font-family: inherit;
		color: hsl(var(--foreground));
	}

	:global(.fc-button) {
		background-color: hsl(var(--primary)) !important;
		border-color: hsl(var(--primary)) !important;
		color: hsl(var(--primary-foreground)) !important;
		text-transform: capitalize;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
	}

	:global(.fc-button:hover) {
		background-color: hsl(var(--primary) / 0.9) !important;
		border-color: hsl(var(--primary) / 0.9) !important;
	}

	:global(.fc-button-active) {
		background-color: hsl(var(--primary) / 0.8) !important;
		border-color: hsl(var(--primary) / 0.8) !important;
	}

	:global(.fc-daygrid-day-number) {
		padding: 0.5rem;
		color: hsl(var(--foreground));
	}

	:global(.fc-col-header-cell) {
		background-color: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
	}

	:global(.fc-daygrid-day) {
		background-color: hsl(var(--background));
	}

	:global(.fc-event) {
		cursor: pointer;
		border-radius: 0.25rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
	}

	:global(.fc-event:hover) {
		opacity: 0.85;
	}

	:global(.fc-day-today) {
		background-color: hsl(var(--accent)) !important;
	}

	:global(.fc-toolbar-title) {
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	:global(.fc-scrollgrid) {
		border-color: hsl(var(--border)) !important;
	}

	:global(.fc-scrollgrid td),
	:global(.fc-scrollgrid th) {
		border-color: hsl(var(--border)) !important;
	}

	/* Mobile responsive styles */
	@media (max-width: 640px) {
		.event-calendar-wrapper {
			padding: 0.5rem;
		}

		.event-calendar {
			min-height: 400px;
		}

		:global(.fc-toolbar) {
			flex-direction: column;
			gap: 0.5rem;
		}

		:global(.fc-toolbar-chunk) {
			display: flex;
			justify-content: center;
		}

		:global(.fc-button) {
			padding: 0.25rem 0.5rem;
			font-size: 0.75rem;
		}

		:global(.fc-toolbar-title) {
			font-size: 1rem;
		}

		:global(.fc-event) {
			font-size: 0.75rem;
			padding: 0.125rem 0.25rem;
		}

		.calendar-legend {
			font-size: 0.75rem;
		}
	}

	@media (max-width: 768px) {
		:global(.fc) {
			font-size: 0.875rem;
		}

		:global(.fc-daygrid-day-number) {
			padding: 0.25rem;
		}
	}
</style>
