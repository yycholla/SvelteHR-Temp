/**
 * RRULE (RFC 5545) Generation Utilities
 * Feature: 027-we-need-to
 *
 * Functions for generating and parsing iCalendar recurrence rules
 * Supports daily, weekly, monthly, and yearly patterns
 * Enforces 5-year maximum limit for recurring events
 */

import type { RecurrencePattern, DayOfWeek } from '$lib/types/events';

/**
 * Day of week mapping for RRULE BYDAY parameter
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
const DAY_MAP: Record<number, string> = {
	0: 'SU',
	1: 'MO',
	2: 'TU',
	3: 'WE',
	4: 'TH',
	5: 'FR',
	6: 'SA'
};

/**
 * Generates an RRULE string from a recurrence pattern
 * @param pattern - The recurrence pattern configuration
 * @param startDate - The event start date (used for DTSTART)
 * @returns RRULE string in RFC 5545 format
 */
export function generateRRule(pattern: RecurrencePattern, startDate: Date): string {
	const parts: {
		freq: string;
		interval: number;
		byday?: string;
		until: string;
	} = {
		freq: pattern.frequency.toUpperCase(),
		interval: pattern.interval,
		until: formatDateForRRule(pattern.endDate)
	};

	// Add BYDAY for weekly recurrence
	if (pattern.frequency === 'weekly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
		parts.byday = pattern.daysOfWeek.map((day: DayOfWeek) => DAY_MAP[day]).join(',');
	}

	return formatRRuleString(parts);
}

/**
 * Parses form data into a RecurrencePattern with generated RRULE string
 * @param formData - Form input data for recurrence
 * @param startDate - Event start date
 * @returns Complete RecurrencePattern with rruleString
 */
export function parseRecurrencePattern(
	formData: {
		frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
		interval: number;
		daysOfWeek: DayOfWeek[] | undefined;
		endDate: Date;
	},
	startDate: Date
): RecurrencePattern {
	const pattern: RecurrencePattern = {
		frequency: formData.frequency,
		interval: formData.interval,
		daysOfWeek: formData.daysOfWeek,
		endDate: formData.endDate,
		rruleString: ''
	};

	// Generate RRULE string
	pattern.rruleString = generateRRule(pattern, startDate);

	return pattern;
}

/**
 * Validates that recurring event end date does not exceed 5 years from start
 * @param startDate - Event start date
 * @param endDate - Recurrence end date
 * @returns true if within 5 years, false otherwise
 */
export function validate5YearLimit(startDate: Date, endDate: Date): boolean {
	const fiveYearsLater = new Date(startDate);
	fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);

	// Allow exactly 5 years
	return endDate <= fiveYearsLater;
}

/**
 * Formats RRULE components into RFC 5545 string
 * @param parts - RRULE components
 * @returns Formatted RRULE string
 */
export function formatRRuleString(parts: {
	freq: string;
	interval: number;
	byday?: string;
	until: string;
}): string {
	const components: string[] = [];

	components.push(`FREQ=${parts.freq}`);
	components.push(`INTERVAL=${parts.interval}`);

	if (parts.byday) {
		components.push(`BYDAY=${parts.byday}`);
	}

	components.push(`UNTIL=${parts.until}`);

	return components.join(';');
}

/**
 * Formats a Date into RRULE UNTIL format (YYYYMMDD)
 * RRULE UNTIL dates should be in UTC
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDateForRRule(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');

	return `${year}${month}${day}`;
}
