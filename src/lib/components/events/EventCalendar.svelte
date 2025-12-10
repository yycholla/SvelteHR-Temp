<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { EventInput } from '@fullcalendar/core';
	import { Bell } from '@lucide/svelte';

	// Feature 027: Import conflict detection utility
	import { detectConflict } from '$lib/utils/calendar';

	// Export type definitions for test imports
	export interface EventCalendarProps {
		events: any[];
		userId: string;
		canManageEvents?: boolean;
		localRsvpStatuses: Record<string, any>;
		onEventClick?: (event: any) => void;
		onDateClick?: (date: Date) => void;
		onDateSelect?: (start: Date, end: Date, allDay: boolean) => void;
		onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
		visibilityFilter?: 'all' | 'company' | 'department' | 'specific';
	}

	// Props with Svelte 5 runes syntax
	const {
		events = [],
		userId,
		canManageEvents = false,
		localRsvpStatuses,
		onEventClick,
		onDateClick,
		onDateSelect,
		onEventDrop,
		visibilityFilter = 'all'
	}: EventCalendarProps = $props();

	// State
	let calendarEl: HTMLElement;
	let calendar: any = null;

	// Derived: Filter events by visibility
	const filteredEvents = $derived(
		visibilityFilter === 'all'
			? events
			: events.filter((e: any) => e.visibilityType === visibilityFilter)
	);

	// Derived: Convert events to FullCalendar format
	const calendarEvents = $derived(
		filteredEvents.map((event: any) => {
			const rsvpStatus = localRsvpStatuses[event.id] || 'pending';

			// RSVP status-based colors (4 distinct colors)
			const colorMap: Record<string, string> = {
				accepted: '#22c55e', // Green
				declined: '#ef4444', // Red
				tentative: '#f59e0b', // Amber/Orange
				pending: '#3b82f6' // Blue
			};

			const userAttendee = event.eventAttendeesByEventId?.nodes?.find(
				(a: any) => a.employeeId === userId
			);
			const hasReminder = userAttendee?.reminderTime != null && userAttendee.reminderTime > 0;

			const calendarEvent: any = {
				id: event.id,
				title: event.title,
				backgroundColor: colorMap[rsvpStatus],
				borderColor: colorMap[rsvpStatus],
				allDay: event.allDay,
				extendedProps: {
					...event,
					rsvpStatus,
					hasReminder
				}
			};

			if (event.rrule) {
				calendarEvent.rrule = event.rrule;
				const duration =
					event.endTime && event.startTime
						? new Date(event.endTime).getTime() - new Date(event.startTime).getTime()
						: 3600000;
				calendarEvent.duration = duration;
			} else {
				calendarEvent.start = event.startTime;
				calendarEvent.end = event.endTime;
			}

			return calendarEvent as EventInput;
		})
	);

	// Initialize calendar on mount (client-side only)
	onMount(async () => {
		if (!browser) return;

		try {
			const [
				{ Calendar },
				{ default: dayGridPlugin },
				{ default: timeGridPlugin },
				{ default: interactionPlugin },
				{ default: rrulePlugin }
			] = await Promise.all([
				import('@fullcalendar/core'),
				import('@fullcalendar/daygrid'),
				import('@fullcalendar/timegrid'),
				import('@fullcalendar/interaction'),
				import('@fullcalendar/rrule')
			]);

			calendar = new Calendar(calendarEl, {
				plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin],
				initialView: 'dayGridMonth',
				headerToolbar: {
					left: 'prev,next today',
					center: 'title',
					right: 'dayGridMonth,timeGridWeek,timeGridDay'
				},
				editable: canManageEvents,
				selectable: true,
				selectMirror: true,
				dayMaxEvents: true,
				weekends: true,
				height: 'auto',
				eventDisplay: 'block', // Force block display to show colors on single-day events
				events: [],
				eventDidMount: (info) => {
					const currentEvent = info.event.extendedProps;
					const hasReminder = currentEvent.hasReminder;

					let hasConflict = false;
					if (localRsvpStatuses[info.event.id] === 'accepted') {
						for (const otherEvent of events) {
							if (otherEvent.id === info.event.id) continue;
							if (localRsvpStatuses[otherEvent.id] !== 'accepted') continue;

							const conflict = detectConflict(
								{
									id: info.event.id,
									startDate: info.event.start || new Date(),
									endDate: info.event.end || new Date()
								},
								{
									id: otherEvent.id,
									startDate: new Date(otherEvent.startTime),
									endDate: new Date(otherEvent.endTime)
								}
							);

							if (conflict) {
								hasConflict = true;
								break;
							}
						}
					}

					const titleEl = info.el.querySelector('.fc-event-title, .fc-event-title-container');

					if (titleEl) {
						if (hasReminder) {
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

							titleEl.appendChild(bellIcon);
						}

						if (hasConflict) {
							const conflictIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
							conflictIcon.setAttribute('width', '12');
							conflictIcon.setAttribute('height', '12');
							conflictIcon.setAttribute('viewBox', '0 0 24 24');
							conflictIcon.setAttribute('fill', 'none');
							conflictIcon.setAttribute('stroke', 'hsl(var(--destructive))');
							conflictIcon.setAttribute('stroke-width', '2');
							conflictIcon.setAttribute('stroke-linecap', 'round');
							conflictIcon.setAttribute('stroke-linejoin', 'round');
							conflictIcon.style.marginLeft = '0.25rem';
							conflictIcon.style.display = 'inline-block';
							conflictIcon.style.verticalAlign = 'middle';
							conflictIcon.setAttribute('title', 'Schedule conflict detected');

							const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
							triangle.setAttribute(
								'd',
								'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'
							);
							conflictIcon.appendChild(triangle);

							const exclamation = document.createElementNS('http://www.w3.org/2000/svg', 'line');
							exclamation.setAttribute('x1', '12');
							exclamation.setAttribute('y1', '9');
							exclamation.setAttribute('x2', '12');
							exclamation.setAttribute('y2', '13');
							conflictIcon.appendChild(exclamation);

							const dot = document.createElementNS('http://www.w3.org/2000/svg', 'line');
							dot.setAttribute('x1', '12');
							dot.setAttribute('y1', '17');
							dot.setAttribute('x2', '12.01');
							dot.setAttribute('y2', '17');
							conflictIcon.appendChild(dot);

							titleEl.appendChild(conflictIcon);

							info.el.style.backgroundImage =
								'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.1) 10px, rgba(239, 68, 68, 0.1) 20px)';
						}
					}
				},
				eventClick: (info) => {
					if (onEventClick) onEventClick(info.event.extendedProps);
				},
				dateClick: (info) => {
					if (onDateClick) onDateClick(info.date);
				},
				select: (info) => {
					if (onDateSelect) onDateSelect(info.start, info.end, info.allDay);
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
							info.revert();
						}
					}
				}
			});

			calendar.render();
			calendar.addEventSource(calendarEvents);
		} catch (error) {
			console.error('[EventCalendar] Error initializing calendar:', error);
		}
	});

	// Update calendar when events or RSVP statuses change
	$effect(() => {
		if (calendar && calendarEvents.length > 0) {
			// Remove all existing event sources
			calendar.getEventSources().forEach((source: { remove: () => void }) => source.remove());
			// Add updated events
			calendar.addEventSource(calendarEvents);
			// Refetch to ensure calendar is updated
			calendar.refetchEvents();
		}
	});

	onDestroy(() => {
		if (calendar) calendar.destroy();
	});
</script>

<!--
  EventCalendar Component
  Feature: 019-we-need-to - Phase 4
  Feature: 027-we-need-to - RRULE Support

  Full-featured calendar view for events with FullCalendar integration

  Features:
  - Month, week, and day views
  - Event creation via date click (manager/admin only)
  - Event editing via drag-and-drop
  - RSVP status color-coding
  - Event filtering by visibility type
  - Responsive design for mobile
  - Interactive event details
  - Recurring events with RRULE (RFC 5545) support
  - Reminder indicators

  Props:
  - events: Array of event objects (supports RRULE for recurring events)
  - userId: Current user ID for RSVP status
  - canManageEvents: Whether user can create/edit events
  - localRsvpStatuses: Local RSVP status map for optimistic UI updates
  - onEventClick: Callback when event is clicked
  - onDateClick: Callback when date is clicked (for event creation)
  - onDateSelect: Callback when date range is selected
  - onEventDrop: Callback when event is dragged to new date
  - visibilityFilter?: Filter events by visibility type
-->

<svelte:head>
	<link
		href="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.19/index.global.min.css"
		rel="stylesheet"
	/>
	<link
		href="https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.19/index.global.min.css"
		rel="stylesheet"
	/>
	<link
		href="https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.19/index.global.min.css"
		rel="stylesheet"
	/>
</svelte:head>

<div class="event-calendar-wrapper">
	<div bind:this={calendarEl} class="event-calendar">
		{#if !browser}
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
</div>

<style>
	.event-calendar-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		background: transparent;
	}

	.event-calendar {
		flex: 1;
		width: 100%;
		min-height: 0;
	}

	.calendar-loading {
		width: 100%;
		height: 100%;
		padding: 1rem;
	}

	/* FullCalendar Theming */
	:global(.fc) {
		font-family: inherit;
		color: hsl(var(--foreground));
		height: 100%;
		--fc-border-color: hsl(var(--border));
		--fc-page-bg-color: hsl(var(--card));
		--fc-neutral-bg-color: hsl(var(--muted));
		--fc-list-event-hover-bg-color: hsl(var(--accent));
		--fc-today-bg-color: hsl(var(--accent) / 0.3);
	}

	:global(.fc-theme-standard .fc-scrollgrid) {
		border: none !important;
	}

	:global(.fc-theme-standard td),
	:global(.fc-theme-standard th) {
		border-color: hsl(var(--border));
	}

	/* Header */
	:global(.fc-col-header-cell) {
		background-color: transparent !important;
		border-bottom: 1px solid hsl(var(--border)) !important;
		border-left: none !important;
		border-right: none !important;
		padding: 0.75rem 0;
	}

	:global(.fc-col-header-cell-cushion) {
		color: hsl(var(--muted-foreground));
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.05em;
	}

	/* Toolbar */
	:global(.fc-toolbar-title) {
		font-size: 1.5rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		letter-spacing: -0.025em;
	}

	:global(.fc-button) {
		background-color: hsl(var(--background)) !important;
		border: 1px solid hsl(var(--input)) !important;
		color: hsl(var(--foreground)) !important;
		text-transform: capitalize;
		font-weight: 500;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important; /* shadow-sm */
		height: 2.25rem; /* h-9 */
		padding: 0 1rem !important;
		border-radius: var(--radius) !important;
		font-size: 0.875rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	:global(.fc-button:hover) {
		background-color: hsl(var(--accent)) !important;
		color: hsl(var(--accent-foreground)) !important;
	}

	:global(.fc-button-active) {
		background-color: hsl(var(--secondary)) !important;
		border-color: hsl(var(--secondary)) !important;
		color: hsl(var(--secondary-foreground)) !important;
		box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05) !important;
	}

	/* Button Groups */
	:global(.fc-button-group .fc-button) {
		border-radius: 0 !important;
		margin: 0 !important;
		border-right-width: 0 !important;
	}
	:global(.fc-button-group .fc-button:last-child) {
		border-right-width: 1px !important;
	}
	:global(.fc-button-group .fc-button:first-child) {
		border-top-left-radius: var(--radius) !important;
		border-bottom-left-radius: var(--radius) !important;
	}
	:global(.fc-button-group .fc-button:last-child) {
		border-top-right-radius: var(--radius) !important;
		border-bottom-right-radius: var(--radius) !important;
	}

	/* Today Highlight (Darker) */
	:global(.fc-day-today) {
		background-color: hsl(var(--muted) / 0.5) !important;
	}

	/* Day Numbers */
	:global(.fc-daygrid-day-number) {
		color: hsl(var(--foreground));
		padding: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	/* Events */
	:global(.fc-event) {
		border: none;
		border-radius: calc(var(--radius) - 2px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		padding: 2px 6px;
		margin: 1px 2px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	:global(.fc-daygrid-event-dot) {
		border-color: currentColor !important;
	}

	/* Day Grid */
	:global(.fc-daygrid-day-frame) {
		min-height: 100%;
	}

	/* Time Grid Alternating Rows (Zebra Stripe) */
	/* Target the ROW (tr), then the LANE (td) inside it */
	:global(.fc-timegrid-slots tr:nth-child(odd) .fc-timegrid-slot-lane) {
		background-color: hsl(var(--muted) / 0.5);
	}

	/* Today Highlight (Darker/Distinct) */
	/* Use secondary color which usually contrasts well with card background */
	:global(.fc-day-today) {
		background-color: hsl(var(--secondary) / 0.5) !important;
	}
</style>
