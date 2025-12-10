/**
 * RRULE Test Helpers
 * Utilities for testing recurring events with RRULE (RFC 5545)
 * Feature: 027-we-need-to
 */

/**
 * Recurrence pattern interface matching the application's RecurrencePattern type
 */
export interface MockRecurrencePattern {
	frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	interval: number;
	daysOfWeek?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
	endDate: Date;
	rruleString?: string;
}

/**
 * Create a mock recurrence pattern with sensible defaults
 */
export function createMockRecurrencePattern(
	overrides: Partial<MockRecurrencePattern> = {}
): MockRecurrencePattern {
	return {
		frequency: 'weekly',
		interval: 1,
		daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
		endDate: new Date('2026-10-15'),
		rruleString: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR;UNTIL=20261015T000000Z',
		...overrides
	};
}

/**
 * Validate RRULE string format according to RFC 5545
 * @param rrule - RRULE string to validate
 * @returns true if valid, false otherwise
 */
export function validateRRuleFormat(rrule: string): boolean {
	// Basic RRULE format validation
	const rruleRegex = /^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY);INTERVAL=\d+/;
	return rruleRegex.test(rrule);
}

/**
 * Validate 5-year recurrence limit
 * @param startDate - Event start date
 * @param endDate - Recurrence end date
 * @returns true if within 5-year limit, false otherwise
 */
export function validate5YearLimit(startDate: Date, endDate: Date): boolean {
	const fiveYearsLater = new Date(startDate);
	fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);
	return endDate <= fiveYearsLater;
}

/**
 * Generate RRULE string from pattern
 * This mimics the generateRRule utility function in src/lib/utils/rrule.ts
 */
export function generateMockRRule(pattern: MockRecurrencePattern, startDate: Date): string {
	const parts: string[] = [];

	// Frequency (required)
	parts.push(`FREQ=${pattern.frequency.toUpperCase()}`);

	// Interval (required)
	parts.push(`INTERVAL=${pattern.interval}`);

	// Days of week (for weekly recurrence)
	if (pattern.frequency === 'weekly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
		const dayMap: Record<number, string> = {
			0: 'SU',
			1: 'MO',
			2: 'TU',
			3: 'WE',
			4: 'TH',
			5: 'FR',
			6: 'SA'
		};
		const days = pattern.daysOfWeek.map((day) => dayMap[day]).join(',');
		parts.push(`BYDAY=${days}`);
	}

	// Until date (end date)
	if (pattern.endDate) {
		const until = formatDateForRRule(pattern.endDate);
		parts.push(`UNTIL=${until}`);
	}

	return parts.join(';');
}

/**
 * Format date for RRULE UNTIL parameter (RFC 5545 format)
 * Format: YYYYMMDDTHHmmssZ
 */
export function formatDateForRRule(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	const hours = String(date.getUTCHours()).padStart(2, '0');
	const minutes = String(date.getUTCMinutes()).padStart(2, '0');
	const seconds = String(date.getUTCSeconds()).padStart(2, '0');

	return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Parse RRULE string into components
 */
export function parseRRule(rrule: string): Record<string, string> {
	const parts: Record<string, string> = {};
	const segments = rrule.split(';');

	for (const segment of segments) {
		const [key, value] = segment.split('=');
		if (key && value) {
			parts[key] = value;
		}
	}

	return parts;
}

/**
 * Create daily recurrence pattern
 */
export function createDailyPattern(interval: number = 1, endDate?: Date): MockRecurrencePattern {
	return createMockRecurrencePattern({
		frequency: 'daily',
		interval,
		endDate: endDate || new Date('2026-10-15'),
		rruleString: `FREQ=DAILY;INTERVAL=${interval};UNTIL=${formatDateForRRule(endDate || new Date('2026-10-15'))}`
	});
}

/**
 * Create weekly recurrence pattern
 */
export function createWeeklyPattern(
	daysOfWeek: number[] = [1, 3, 5],
	interval: number = 1,
	endDate?: Date
): MockRecurrencePattern {
	const end = endDate || new Date('2026-10-15');
	const dayMap: Record<number, string> = {
		0: 'SU',
		1: 'MO',
		2: 'TU',
		3: 'WE',
		4: 'TH',
		5: 'FR',
		6: 'SA'
	};
	const days = daysOfWeek.map((day) => dayMap[day]).join(',');

	return createMockRecurrencePattern({
		frequency: 'weekly',
		interval,
		daysOfWeek,
		endDate: end,
		rruleString: `FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${days};UNTIL=${formatDateForRRule(end)}`
	});
}

/**
 * Create monthly recurrence pattern
 */
export function createMonthlyPattern(interval: number = 1, endDate?: Date): MockRecurrencePattern {
	const end = endDate || new Date('2026-10-15');
	return createMockRecurrencePattern({
		frequency: 'monthly',
		interval,
		endDate: end,
		rruleString: `FREQ=MONTHLY;INTERVAL=${interval};UNTIL=${formatDateForRRule(end)}`
	});
}

/**
 * Create yearly recurrence pattern
 */
export function createYearlyPattern(interval: number = 1, endDate?: Date): MockRecurrencePattern {
	const end = endDate || new Date('2030-10-15');
	return createMockRecurrencePattern({
		frequency: 'yearly',
		interval,
		endDate: end,
		rruleString: `FREQ=YEARLY;INTERVAL=${interval};UNTIL=${formatDateForRRule(end)}`
	});
}

/**
 * Create pattern that exceeds 5-year limit (for error testing)
 */
export function createInvalidLongRecurrence(
	startDate: Date = new Date('2025-10-15')
): MockRecurrencePattern {
	const invalidEnd = new Date(startDate);
	invalidEnd.setFullYear(invalidEnd.getFullYear() + 5);
	invalidEnd.setDate(invalidEnd.getDate() + 1); // 5 years + 1 day

	return createMockRecurrencePattern({
		endDate: invalidEnd
	});
}

/**
 * Calculate number of occurrences for a weekly pattern
 * Simplified calculation for testing purposes
 */
export function calculateWeeklyOccurrences(
	startDate: Date,
	endDate: Date,
	interval: number,
	daysOfWeek: number[]
): number {
	const msPerWeek = 7 * 24 * 60 * 60 * 1000;
	const weeks = Math.floor((endDate.getTime() - startDate.getTime()) / msPerWeek / interval);
	return weeks * daysOfWeek.length;
}

/**
 * Check if a date falls on a valid recurrence day
 */
export function isValidRecurrenceDay(date: Date, daysOfWeek: number[]): boolean {
	const dayOfWeek = date.getDay();
	return daysOfWeek.includes(dayOfWeek);
}
