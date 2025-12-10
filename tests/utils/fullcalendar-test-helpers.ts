/**
 * FullCalendar Test Helpers
 * Utilities for testing FullCalendar integration in EventCalendar component
 * Feature: 027-we-need-to
 */

import { vi } from 'vitest';
import type { CalendarEvent } from '$lib/types/events';

/**
 * Create a mock calendar event with sensible defaults
 */
export function createMockCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
	return {
		id: 'event-123',
		title: 'Test Event',
		startDate: new Date('2025-10-15T10:00:00'),
		endDate: new Date('2025-10-15T11:00:00'),
		allDay: false,
		type: 'meeting',
		visibility: 'public',
		isRecurring: false,
		rrule: null,
		parentEventId: null,
		capacity: null,
		attendeeCount: 0,
		waitlistCount: 0,
		waitlistEnabled: false,
		userRsvpStatus: 'pending',
		userWaitlistPosition: null,
		imageUrl: null,
		imageAspectRatio: null,
		organizerId: 'user-1',
		createdAt: new Date('2025-10-01T08:00:00'),
		updatedAt: new Date('2025-10-01T08:00:00'),
		createdBy: 'user-1',
		canEdit: false,
		canDelete: false,
		hasConflict: false,
		conflictingEventIds: [],
		...overrides
	};
}

/**
 * Create a mock recurring calendar event with RRULE
 */
export function createMockRecurringEvent(
	rrule: string,
	overrides: Partial<CalendarEvent> = {}
): CalendarEvent {
	return createMockCalendarEvent({
		isRecurring: true,
		rrule,
		...overrides
	});
}

/**
 * Create multiple mock events for testing event lists
 */
export function createMockEventList(count: number = 3): CalendarEvent[] {
	return Array.from({ length: count }, (_, i) =>
		createMockCalendarEvent({
			id: `event-${i + 1}`,
			title: `Test Event ${i + 1}`,
			startDate: new Date(`2025-10-${15 + i}T10:00:00`),
			endDate: new Date(`2025-10-${15 + i}T11:00:00`)
		})
	);
}

/**
 * Mock FullCalendar instance with common methods
 */
export function mockFullCalendar() {
	return {
		render: vi.fn(),
		destroy: vi.fn(),
		addEventSource: vi.fn(),
		removeAllEvents: vi.fn(),
		refetchEvents: vi.fn(),
		getEventSources: vi.fn(() => []),
		getEvents: vi.fn(() => []),
		getEventById: vi.fn((id: string) => null),
		updateSize: vi.fn(),
		changeView: vi.fn(),
		next: vi.fn(),
		prev: vi.fn(),
		today: vi.fn(),
		gotoDate: vi.fn(),
		incrementDate: vi.fn(),
		getDate: vi.fn(() => new Date()),
		formatDate: vi.fn((date: Date) => date.toISOString())
	};
}

/**
 * Wait for FullCalendar to render after dynamic import
 * @param container - The container element to search within
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 */
export async function waitForCalendarRender(
	container: HTMLElement,
	timeout: number = 1000
): Promise<HTMLElement | null> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const calendar = container.querySelector('.fc');
		if (calendar) {
			return calendar as HTMLElement;
		}
		// Wait a bit before checking again
		await new Promise((resolve) => setTimeout(resolve, 50));
	}

	return null;
}

/**
 * Create mock FullCalendar plugins for testing
 */
export function mockFullCalendarPlugins() {
	return {
		Calendar: vi.fn().mockImplementation(function (el: HTMLElement, options: any) {
			return mockFullCalendar();
		}),
		dayGridPlugin: { default: {} },
		timeGridPlugin: { default: {} },
		interactionPlugin: { default: {} },
		rrulePlugin: { default: {} }
	};
}

/**
 * Create a mock RSVP statuses map for testing
 */
export function createMockRsvpStatuses(
	eventIds: string[],
	status: 'accepted' | 'declined' | 'tentative' | 'pending' = 'pending'
): Record<string, string> {
	return eventIds.reduce(
		(acc, id) => {
			acc[id] = status;
			return acc;
		},
		{} as Record<string, string>
	);
}

/**
 * Get RSVP status color for testing color-coding logic
 */
export function getRsvpStatusColor(status: string): string {
	const colorMap: Record<string, string> = {
		accepted: '#22c55e',
		declined: '#ef4444',
		tentative: '#f59e0b',
		pending: '#3b82f6'
	};
	return colorMap[status] || '#3b82f6';
}

/**
 * Create mock event with conflict data
 */
export function createConflictingEvents(): [CalendarEvent, CalendarEvent] {
	const event1 = createMockCalendarEvent({
		id: 'event-1',
		title: 'First Meeting',
		startDate: new Date('2025-10-15T10:00:00'),
		endDate: new Date('2025-10-15T11:00:00')
	});

	const event2 = createMockCalendarEvent({
		id: 'event-2',
		title: 'Conflicting Meeting',
		startDate: new Date('2025-10-15T10:30:00'),
		endDate: new Date('2025-10-15T11:30:00'),
		hasConflict: true,
		conflictingEventIds: ['event-1']
	});

	return [event1, event2];
}
