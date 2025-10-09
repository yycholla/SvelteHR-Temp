/**
 * Unit Test: Conflict Detection Algorithm
 * Feature: 027-we-need-to
 *
 * Tests for calendar utility functions including conflict detection,
 * overlap duration calculation, and severity classification.
 * MUST FAIL until implementation in src/lib/utils/calendar.ts
 */

import { describe, it, expect } from 'vitest';
import {
	detectConflict,
	calculateOverlap,
	classifySeverity,
	findConflictingEvents
} from '$lib/utils/calendar';
import type { CalendarEvent } from '$lib/types/events';

describe('Conflict Detection Algorithm', () => {
	const baseEvent: CalendarEvent = {
		id: 'event-1',
		title: 'Meeting A',
		startDate: new Date('2025-10-10T10:00:00'),
		endDate: new Date('2025-10-10T11:00:00'),
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
		userRsvpStatus: 'accepted',
		userWaitlistPosition: null,
		imageUrl: null,
		imageAspectRatio: null,
		createdBy: 'user-1',
		canEdit: false,
		canDelete: false,
		hasConflict: false,
		conflictingEventIds: []
	};

	describe('detectConflict', () => {
		it('should detect overlap when events overlap partially', () => {
			const event1 = { ...baseEvent };
			const event2 = {
				...baseEvent,
				id: 'event-2',
				startDate: new Date('2025-10-10T10:30:00'),
				endDate: new Date('2025-10-10T11:30:00')
			};

			const hasConflict = detectConflict(event1, event2);
			expect(hasConflict).toBe(true);
		});

		it('should detect overlap when one event contains another', () => {
			const event1 = { ...baseEvent };
			const event2 = {
				...baseEvent,
				id: 'event-2',
				startDate: new Date('2025-10-10T10:15:00'),
				endDate: new Date('2025-10-10T10:45:00')
			};

			const hasConflict = detectConflict(event1, event2);
			expect(hasConflict).toBe(true);
		});

		it('should NOT detect conflict when events do not overlap', () => {
			const event1 = { ...baseEvent };
			const event2 = {
				...baseEvent,
				id: 'event-2',
				startDate: new Date('2025-10-10T11:00:00'),
				endDate: new Date('2025-10-10T12:00:00')
			};

			const hasConflict = detectConflict(event1, event2);
			expect(hasConflict).toBe(false);
		});

		it('should NOT detect conflict when events touch but do not overlap', () => {
			const event1 = { ...baseEvent };
			const event2 = {
				...baseEvent,
				id: 'event-2',
				startDate: new Date('2025-10-10T11:00:00'), // Exactly when event1 ends
				endDate: new Date('2025-10-10T12:00:00')
			};

			const hasConflict = detectConflict(event1, event2);
			expect(hasConflict).toBe(false);
		});
	});

	describe('calculateOverlap', () => {
		it('should calculate overlap duration in minutes', () => {
			const event1 = { ...baseEvent };
			const event2 = {
				...baseEvent,
				id: 'event-2',
				startDate: new Date('2025-10-10T10:30:00'),
				endDate: new Date('2025-10-10T11:30:00')
			};

			const { duration, percentage } = calculateOverlap(event1, event2);

			expect(duration).toBe(30); // 30 minutes overlap
		});

		it('should calculate overlap percentage relative to first event', () => {
			const event1 = { ...baseEvent }; // 60 minutes total
			const event2 = {
				...baseEvent,
				id: 'event-2',
				startDate: new Date('2025-10-10T10:30:00'),
				endDate: new Date('2025-10-10T11:30:00')
			};

			const { duration, percentage } = calculateOverlap(event1, event2);

			expect(percentage).toBe(50); // 30 min overlap / 60 min total = 50%
		});

		it('should handle complete overlap (100%)', () => {
			const event1 = { ...baseEvent };
			const event2 = { ...baseEvent, id: 'event-2' }; // Exact same times

			const { duration, percentage } = calculateOverlap(event1, event2);

			expect(percentage).toBe(100);
			expect(duration).toBe(60);
		});

		it('should return 0 duration and percentage for non-overlapping events', () => {
			const event1 = { ...baseEvent };
			const event2 = {
				...baseEvent,
				id: 'event-2',
				startDate: new Date('2025-10-10T11:00:00'),
				endDate: new Date('2025-10-10T12:00:00')
			};

			const { duration, percentage } = calculateOverlap(event1, event2);

			expect(duration).toBe(0);
			expect(percentage).toBe(0);
		});
	});

	describe('classifySeverity', () => {
		it('should classify overlap <30% as minor', () => {
			const severity = classifySeverity(20);
			expect(severity).toBe('minor');
		});

		it('should classify overlap ≥30% as major', () => {
			const severity = classifySeverity(30);
			expect(severity).toBe('major');
		});

		it('should classify overlap >50% as major', () => {
			const severity = classifySeverity(75);
			expect(severity).toBe('major');
		});

		it('should classify 0% overlap as minor', () => {
			const severity = classifySeverity(0);
			expect(severity).toBe('minor');
		});

		it('should classify 100% overlap as major', () => {
			const severity = classifySeverity(100);
			expect(severity).toBe('major');
		});
	});

	describe('findConflictingEvents', () => {
		it('should find all conflicting events for a given event', () => {
			const targetEvent = { ...baseEvent };
			const events = [
				{
					...baseEvent,
					id: 'event-2',
					startDate: new Date('2025-10-10T10:30:00'),
					endDate: new Date('2025-10-10T11:30:00'),
					userRsvpStatus: 'accepted' as const
				},
				{
					...baseEvent,
					id: 'event-3',
					startDate: new Date('2025-10-10T11:00:00'),
					endDate: new Date('2025-10-10T12:00:00'),
					userRsvpStatus: 'accepted' as const
				},
				{
					...baseEvent,
					id: 'event-4',
					startDate: new Date('2025-10-10T14:00:00'),
					endDate: new Date('2025-10-10T15:00:00'),
					userRsvpStatus: 'accepted' as const
				}
			];

			const conflicts = findConflictingEvents(targetEvent, events);

			expect(conflicts).toHaveLength(1); // Only event-2 overlaps
			expect(conflicts[0].id).toBe('event-2');
		});

		it('should only include events where user RSVP is accepted', () => {
			const targetEvent = { ...baseEvent };
			const events = [
				{
					...baseEvent,
					id: 'event-2',
					startDate: new Date('2025-10-10T10:30:00'),
					endDate: new Date('2025-10-10T11:30:00'),
					userRsvpStatus: 'pending' as const
				},
				{
					...baseEvent,
					id: 'event-3',
					startDate: new Date('2025-10-10T10:15:00'),
					endDate: new Date('2025-10-10T10:45:00'),
					userRsvpStatus: 'accepted' as const
				}
			];

			const conflicts = findConflictingEvents(targetEvent, events);

			expect(conflicts).toHaveLength(1);
			expect(conflicts[0].id).toBe('event-3');
		});

		it('should include overlap duration and percentage in results', () => {
			const targetEvent = { ...baseEvent };
			const events = [
				{
					...baseEvent,
					id: 'event-2',
					startDate: new Date('2025-10-10T10:30:00'),
					endDate: new Date('2025-10-10T11:30:00'),
					userRsvpStatus: 'accepted' as const
				}
			];

			const conflicts = findConflictingEvents(targetEvent, events);

			expect(conflicts[0].overlapDuration).toBe(30);
			expect(conflicts[0].overlapPercentage).toBe(50);
			expect(conflicts[0].severity).toBe('major');
		});

		it('should exclude the target event itself from conflicts', () => {
			const targetEvent = { ...baseEvent };
			const events = [targetEvent, { ...baseEvent, id: 'event-2' }];

			const conflicts = findConflictingEvents(targetEvent, events);

			expect(conflicts.every((c) => c.id !== targetEvent.id)).toBe(true);
		});
	});
});
