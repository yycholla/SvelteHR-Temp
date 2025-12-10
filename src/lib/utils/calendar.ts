/**
 * Calendar Utility Functions
 * Feature: 027-we-need-to
 *
 * Conflict detection algorithm for calendar events including:
 * - Overlap detection between events
 * - Overlap duration and percentage calculation
 * - Conflict severity classification (minor vs major)
 * - Finding all conflicting events for a given event
 */

import type { CalendarEvent } from '$lib/types/events';

/**
 * Conflicting event with overlap details
 */
export interface ConflictingEvent {
	id: string;
	event: CalendarEvent;
	overlapDuration: number;
	overlapPercentage: number;
	severity: 'minor' | 'major';
}

/**
 * Detects if two events overlap in time
 * Events touch but don't overlap (end1 === start2) returns false
 */
export function detectConflict(event1: CalendarEvent, event2: CalendarEvent): boolean {
	const start1 = new Date(event1.startDate).getTime();
	const end1 = new Date(event1.endDate).getTime();
	const start2 = new Date(event2.startDate).getTime();
	const end2 = new Date(event2.endDate).getTime();

	// Events overlap if:
	// - event1 starts before event2 ends AND
	// - event1 ends after event2 starts
	// Touching events (end1 === start2) do NOT overlap
	return start1 < end2 && end1 > start2;
}

/**
 * Calculates overlap duration and percentage between two events
 * Returns duration in minutes and percentage relative to first event
 */
export function calculateOverlap(
	event1: CalendarEvent,
	event2: CalendarEvent
): { duration: number; percentage: number } {
	const start1 = new Date(event1.startDate).getTime();
	const end1 = new Date(event1.endDate).getTime();
	const start2 = new Date(event2.startDate).getTime();
	const end2 = new Date(event2.endDate).getTime();

	// If no overlap, return 0
	if (!detectConflict(event1, event2)) {
		return { duration: 0, percentage: 0 };
	}

	// Calculate overlap range
	const overlapStart = Math.max(start1, start2);
	const overlapEnd = Math.min(end1, end2);
	const overlapMs = overlapEnd - overlapStart;

	// Convert to minutes
	const duration = Math.round(overlapMs / (1000 * 60));

	// Calculate percentage relative to event1 duration
	const event1Duration = end1 - start1;
	const percentage = Math.round((overlapMs / event1Duration) * 100);

	return { duration, percentage };
}

/**
 * Classifies conflict severity based on overlap percentage
 * - minor: < 30% overlap
 * - major: >= 30% overlap
 */
export function classifySeverity(overlapPercentage: number): 'minor' | 'major' {
	return overlapPercentage >= 30 ? 'major' : 'minor';
}

/**
 * Finds all conflicting events for a given target event
 * Only considers events where user RSVP status is 'accepted'
 * Returns array of conflicts with overlap details
 */
export function findConflictingEvents(
	targetEvent: CalendarEvent,
	allEvents: CalendarEvent[]
): ConflictingEvent[] {
	const conflicts: ConflictingEvent[] = [];

	for (const event of allEvents) {
		// Skip the target event itself
		if (event.id === targetEvent.id) {
			continue;
		}

		// Only consider accepted events for conflict detection
		if (event.userRsvpStatus !== 'accepted') {
			continue;
		}

		// Check for overlap
		if (detectConflict(targetEvent, event)) {
			const { duration, percentage } = calculateOverlap(targetEvent, event);
			const severity = classifySeverity(percentage);

			conflicts.push({
				id: event.id,
				event,
				overlapDuration: duration,
				overlapPercentage: percentage,
				severity
			});
		}
	}

	return conflicts;
}
