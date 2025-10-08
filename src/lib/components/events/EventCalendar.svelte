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
	import { Bell } from 'lucide-svelte';

	// Props with Svelte 5 runes syntax
	let {
		events = [],
		userId,
		canManageEvents = false,
		localRsvpStatuses,
		onEventClick,
		onDateClick,
		onDateSelect,
		onEventDrop,
		visibilityFilter = 'all'
	}: {
		events: any[];
		userId: string;
		canManageEvents?: boolean;
		localRsvpStatuses: Record<string, any>;
		onEventClick?: (event: any) => void;
		onDateClick?: (date: Date) => void;
		onDateSelect?: (start: Date, end: Date, allDay: boolean) => void;
		onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
		visibilityFilter?: 'all' | 'company' | 'department' | 'specific';
	} = $props();

	// State
	let calendarEl: HTMLElement;
	let calendar: any = null;

	// Derived: Filter events by visibility (Fix: removed arrow function)
	let filteredEvents = $derived(
		visibilityFilter === 'all'
			? events
			: events.filter((e: any) => e.visibilityType === visibilityFilter)
	);

	// Derived: Convert events to FullCalendar format (Fix: removed arrow function, use local RSVP status)
	let calendarEvents = $derived(
		filteredEvents.map((event: any) => {
			// Use local RSVP status for instant updates
			const rsvpStatus = localRsvpStatuses[event.id] || 'no_response';

			// Color based on RSVP status
			const colorMap: Record<string, string> = {
				accepted: '#10b981', // green
				declined: '#ef4444', // red
				tentative: '#f59e0b', // amber
				pending: '#3b82f6', // blue
				no_response: '#6b7280' // gray
			};

			// Check if user has actually set a reminder (check reminderTime value)
			const userAttendee = event.eventAttendeesByEventId?.nodes?.find(
				(a: any) => a.employeeId === userId
			);
			const hasReminder = userAttendee?.reminderTime != null && userAttendee.reminderTime > 0;

			return {
				id: event.id,
				title: event.title,
				start: event.startTime,
				end: event.endTime,
				allDay: event.allDay,
				backgroundColor: colorMap[rsvpStatus],
				borderColor: colorMap[rsvpStatus],
				extendedProps: {
					...event,
					rsvpStatus,
					hasReminder
				}
			} as EventInput;
		})
	);

	// Initialize calendar on mount (client-side only)
	onMount(async () => {
		if (!browser) return;

		try {
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
				events: [],
				eventDidMount: (info) => {
					const hasReminder = info.event.extendedProps.hasReminder;
					if (hasReminder) {
						// Find the event title element
						const titleEl = info.el.querySelector('.fc-event-title, .fc-event-title-container');
						if (titleEl) {
							// Create bell icon SVG
							const bellIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
							bellIcon.setAttribute('width', '12');
							bellIcon.setAttribute('height', '12');
							bellIcon.setAttribute('viewBox', '0 0 24 24');
							bellIcon.setAttribute('fill', 'none');
							bellIcon.setAttribute('stroke', 'currentColor');
							bellIcon.setAttribute('stroke-width', '2');
							bellIcon.setAttribute('stroke-linecap', 'round');
							bellIcon.setAttribute('stroke-linejoin', 'round');
							bellIcon.style.marginLeft = '0.25rem';
							bellIcon.style.display = 'inline-block';
							bellIcon.style.verticalAlign = 'middle';

							const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
							path.setAttribute('d', 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9');
							bellIcon.appendChild(path);

							const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
							path2.setAttribute('d', 'M10.3 21a1.94 1.94 0 0 0 3.4 0');
							bellIcon.appendChild(path2);

							// Append bell icon to title
							titleEl.appendChild(bellIcon);
						}
					}
				},
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
				select: (info) => {
					if (canManageEvents && onDateSelect) {
						onDateSelect(info.start, info.end, info.allDay);
					}
				},
				eventDrop: async (info) => {
					if (canManageEvents && onEventDrop) {
						try {
							await onEventDrop(
								info.event.id,
								info.event.start || new Date(),
								info.event.end || new Date()
							);
						} catch (error) {
							// Revert the event if the update fails
							info.revert();
						}
					}
				},
				eventResize: async (info) => {
					if (canManageEvents && onEventDrop) {
						try {
							await onEventDrop(
								info.event.id,
								info.event.start || new Date(),
								info.event.end || new Date()
							);
						} catch (error) {
							// Revert the event if the update fails
							info.revert();
						}
					}
				},
				height: 'auto',
				contentHeight: 'auto',
				aspectRatio: 1.8
			});

			calendar.render();

			// Add initial events after render
			console.log('[EventCalendar] Adding initial events:', calendarEvents.length);
			calendar.addEventSource(calendarEvents);
		} catch (error) {
			console.error('[EventCalendar] Error initializing calendar:', error);
		}
	});

	// Track previous calendar events to avoid redundant updates
	let previousCalendarEvents: any[] = [];

	// Update calendar events when they change
	$effect(() => {
		console.log('[EventCalendar] $effect triggered - calendarEvents updated:', calendarEvents.length);
		if (calendar && calendarEvents.length > 0) {
			// Check if events actually changed (deep comparison of relevant properties)
			const eventsChanged = JSON.stringify(calendarEvents.map(e => ({ id: e.id, backgroundColor: e.backgroundColor }))) !==
			                      JSON.stringify(previousCalendarEvents.map(e => ({ id: e.id, backgroundColor: e.backgroundColor })));

			if (eventsChanged) {
				console.log('[EventCalendar] Events actually changed, updating calendar');
				previousCalendarEvents = [...calendarEvents];

				// Use FullCalendar's setOption to update events
				calendar.getEventSources().forEach(source => source.remove());
				calendar.addEventSource(calendarEvents);
			} else {
				console.log('[EventCalendar] Events unchanged, skipping update');
			}
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
		<h4 class="text-sm font-semibold mb-2 text-foreground">Legend</h4>
		<div class="space-y-2">
			<!-- RSVP Colors -->
			<div class="flex flex-wrap gap-3">
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded-sm" style="background-color: #10b981"></div>
					<span class="text-xs text-muted-foreground">Accepted</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded-sm" style="background-color: #ef4444"></div>
					<span class="text-xs text-muted-foreground">Declined</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded-sm" style="background-color: #f59e0b"></div>
					<span class="text-xs text-muted-foreground">Tentative</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded-sm" style="background-color: #3b82f6"></div>
					<span class="text-xs text-muted-foreground">Pending</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded-sm" style="background-color: #6b7280"></div>
					<span class="text-xs text-muted-foreground">No Response</span>
				</div>
			</div>
			<!-- Icons -->
			<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
				<Bell class="h-3 w-3" />
				<span>Reminder set</span>
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

	/* FullCalendar custom styles with rounded theme */
	:global(.fc) {
		font-family: inherit;
		color: hsl(var(--foreground));
	}

	/* Buttons with rounded corners */
	:global(.fc-button) {
		background-color: hsl(var(--primary)) !important;
		border-color: hsl(var(--primary)) !important;
		color: hsl(var(--primary-foreground)) !important;
		text-transform: capitalize;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		border-radius: var(--radius) !important;
		transition: all 0.2s ease;
	}

	:global(.fc-button:hover) {
		background-color: hsl(var(--primary) / 0.9) !important;
		border-color: hsl(var(--primary) / 0.9) !important;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	:global(.fc-button:active) {
		transform: translateY(0);
	}

	:global(.fc-button-active) {
		background-color: hsl(var(--primary) / 0.8) !important;
		border-color: hsl(var(--primary) / 0.8) !important;
	}

	/* Button groups with rounded ends */
	:global(.fc-button-group) {
		border-radius: var(--radius) !important;
		overflow: hidden;
	}

	:global(.fc-button-group > .fc-button) {
		border-radius: 0 !important;
	}

	:global(.fc-button-group > .fc-button:first-child) {
		border-radius: var(--radius) 0 0 var(--radius) !important;
	}

	:global(.fc-button-group > .fc-button:last-child) {
		border-radius: 0 var(--radius) var(--radius) 0 !important;
	}

	/* Day numbers */
	:global(.fc-daygrid-day-number) {
		padding: 0.5rem;
		color: hsl(var(--foreground));
		font-weight: 500;
	}

	/* Header cells with rounded top */
	:global(.fc-col-header-cell) {
		background-color: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
		font-weight: 600;
		padding: 0.75rem 0.5rem;
	}

	:global(.fc-col-header-cell:first-child) {
		border-top-left-radius: var(--radius);
	}

	:global(.fc-col-header-cell:last-child) {
		border-top-right-radius: var(--radius);
	}

	/* Day cells */
	:global(.fc-daygrid-day) {
		background-color: hsl(var(--background));
		transition: background-color 0.2s ease;
	}

	/* Day hover - light mode uses accent, dark mode uses darker shade */
	:global(.fc-daygrid-day:hover) {
		background-color: hsl(var(--accent));
	}

	:global(.dark .fc-daygrid-day:hover) {
		background-color: hsl(225 15% 8%);
	}

	/* Events with rounded corners */
	:global(.fc-event) {
		cursor: pointer;
		border-radius: calc(var(--radius) * 0.6);
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		border: none !important;
		transition: all 0.2s ease;
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
	}

	:global(.fc-event:hover),
	:global(.fc-daygrid-event:hover),
	:global(.fc-timegrid-event:hover) {
		transform: translateY(-1px) !important;
		box-shadow: 0 6px 12px -2px rgb(0 0 0 / 0.4) !important;
		filter: brightness(1.35) !important;
	}

	/* Today highlight */
	:global(.fc-day-today) {
		background-color: hsl(var(--accent)) !important;
	}

	:global(.fc-day-today .fc-daygrid-day-number) {
		background-color: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0.25rem;
	}

	/* Toolbar title */
	:global(.fc-toolbar-title) {
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	/* Grid borders with rounded corners */
	:global(.fc-scrollgrid) {
		border-color: hsl(var(--border)) !important;
		border-radius: var(--radius) !important;
		overflow: hidden;
	}

	:global(.fc-scrollgrid td),
	:global(.fc-scrollgrid th) {
		border-color: hsl(var(--border)) !important;
	}

	/* More events link */
	:global(.fc-daygrid-more-link) {
		color: hsl(var(--primary));
		font-weight: 500;
		border-radius: calc(var(--radius) * 0.5);
		padding: 0.125rem 0.375rem;
		transition: all 0.2s ease;
	}

	:global(.fc-daygrid-more-link:hover) {
		background-color: hsl(var(--primary) / 0.1);
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
