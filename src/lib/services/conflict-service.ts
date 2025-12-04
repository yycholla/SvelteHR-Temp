/**
 * Conflict Detection Service
 * Feature: 025-events-flesh-out
 *
 * Service for detecting scheduling conflicts between events.
 * Uses PostgreSQL tsrange for efficient temporal overlap queries.
 */

export interface ConflictCheckOptions {
	userId: string;
	startTime: Date;
	endTime: Date;
	excludeEventId?: string; // When updating an event, exclude it from conflict check
	includeRsvpStatuses?: ('accepted' | 'tentative' | 'pending')[];
}

export interface ConflictingEvent {
	id: string;
	title: string;
	startTime: Date;
	endTime: Date;
	rsvpStatus: 'accepted' | 'declined' | 'tentative' | 'pending';
	location?: string;
}

export interface ConflictCheckResult {
	hasConflicts: boolean;
	conflicts: ConflictingEvent[];
	conflictCount: number;
}

/**
 * Conflict Detection Service Class
 */
export class ConflictService {
	/**
	 * Check for scheduling conflicts for a user
	 */
	static async checkConflicts(options: ConflictCheckOptions): Promise<ConflictCheckResult> {
		try {
			const { userId, startTime, endTime, excludeEventId, includeRsvpStatuses } = options;

			// Default to checking accepted and tentative events
			const rsvpStatuses = includeRsvpStatuses || ['accepted', 'tentative'];

			// This is a placeholder for the actual GraphQL query
			// In real implementation, this would call the conflictingEvents query
			// which uses PostgreSQL tsrange overlap detection

			// PostgreSQL query pattern (for reference):
			// SELECT e.* FROM events e
			// INNER JOIN event_attendees ea ON ea.event_id = e.id
			// WHERE ea.employee_id = $userId
			//   AND ea.rsvp_status IN ('accepted', 'tentative')
			//   AND tsrange(e.start_time, e.end_time) && tsrange($startTime, $endTime)
			//   AND ($excludeEventId IS NULL OR e.id != $excludeEventId)

			const conflicts: ConflictingEvent[] = [];

			return {
				hasConflicts: conflicts.length > 0,
				conflicts,
				conflictCount: conflicts.length
			};
		} catch (error) {
			console.error('Error checking conflicts:', error);
			return {
				hasConflicts: false,
				conflicts: [],
				conflictCount: 0
			};
		}
	}

	/**
	 * Check if two time ranges overlap
	 */
	static timeRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
		// Two ranges overlap if:
		// - start1 < end2 AND end1 > start2
		return start1 < end2 && end1 > start2;
	}

	/**
	 * Get all conflicts for a user within a date range
	 */
	static async getUserConflicts(
		userId: string,
		rangeStart: Date,
		rangeEnd: Date
	): Promise<Map<string, ConflictingEvent[]>> {
		try {
			// This would query all user's events within range and group conflicts
			// Returns a map of event ID -> array of conflicting events

			// Placeholder implementation
			const conflictMap = new Map<string, ConflictingEvent[]>();

			return conflictMap;
		} catch (error) {
			console.error('Error getting user conflicts:', error);
			return new Map();
		}
	}

	/**
	 * Find best available time slot
	 */
	static async findAvailableSlot(
		userId: string,
		duration: number, // in minutes
		preferredStart: Date,
		searchWindowDays = 7
	): Promise<Date | null> {
		try {
			// This would search for the first available time slot
			// that doesn't conflict with user's existing events

			// Algorithm:
			// 1. Get all user events in search window
			// 2. Generate candidate time slots
			// 3. Filter out slots that conflict
			// 4. Return first available slot

			// Placeholder implementation
			return null;
		} catch (error) {
			console.error('Error finding available slot:', error);
			return null;
		}
	}

	/**
	 * Calculate conflict severity
	 */
	static calculateConflictSeverity(
		conflicts: ConflictingEvent[]
	): 'none' | 'low' | 'medium' | 'high' {
		if (conflicts.length === 0) {
			return 'none';
		}

		// Count accepted vs tentative
		const acceptedConflicts = conflicts.filter((c) => c.rsvpStatus === 'accepted').length;

		if (acceptedConflicts === 0) {
			return 'low'; // Only tentative conflicts
		} else if (acceptedConflicts === 1) {
			return 'medium'; // One hard conflict
		} else {
			return 'high'; // Multiple hard conflicts
		}
	}

	/**
	 * Get conflict warning message
	 */
	static getConflictWarning(conflicts: ConflictingEvent[]): string {
		if (conflicts.length === 0) {
			return '';
		}

		const acceptedConflicts = conflicts.filter((c) => c.rsvpStatus === 'accepted');
		const tentativeConflicts = conflicts.filter((c) => c.rsvpStatus === 'tentative');

		if (acceptedConflicts.length > 0) {
			const eventTitles = acceptedConflicts.map((c) => `"${c.title}"`).join(', ');
			return `This time conflicts with ${acceptedConflicts.length} accepted event${acceptedConflicts.length > 1 ? 's' : ''}: ${eventTitles}`;
		} else {
			return `This time may conflict with ${tentativeConflicts.length} tentative event${tentativeConflicts.length > 1 ? 's' : ''}`;
		}
	}

	/**
	 * Check if time slot is available
	 */
	static async isTimeSlotAvailable(
		userId: string,
		startTime: Date,
		endTime: Date,
		excludeEventId?: string
	): Promise<boolean> {
		const result = await this.checkConflicts({
			userId,
			startTime,
			endTime,
			excludeEventId
		});

		return !result.hasConflicts;
	}

	/**
	 * Get suggested times to avoid conflicts
	 */
	static getSuggestedTimes(
		originalStart: Date,
		originalEnd: Date,
		conflicts: ConflictingEvent[]
	): Date[] {
		const suggestions: Date[] = [];
		const duration = originalEnd.getTime() - originalStart.getTime();

		// Suggest time before first conflict
		if (conflicts.length > 0) {
			const firstConflict = conflicts.sort(
				(a, b) => a.startTime.getTime() - b.startTime.getTime()
			)[0];

			const suggestedEnd = new Date(firstConflict.startTime);
			const suggestedStart = new Date(suggestedEnd.getTime() - duration);

			suggestions.push(suggestedStart);
		}

		// Suggest time after last conflict
		if (conflicts.length > 0) {
			const lastConflict = conflicts.sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0];

			const suggestedStart = new Date(lastConflict.endTime);
			suggestions.push(suggestedStart);
		}

		return suggestions;
	}
}
