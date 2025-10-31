/**
 * Date Formatting Utilities
 * Feature: 027-we-need-to
 *
 * Centralized date/time formatting using date-fns
 */

import { format, formatDistance, isToday, isTomorrow, isYesterday } from 'date-fns';

/**
 * Format date as human-readable string
 * Examples: "Today", "Tomorrow", "Jan 15, 2025", "Yesterday"
 */
export function formatDate(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;

	if (isToday(dateObj)) {
		return 'Today';
	}

	if (isTomorrow(dateObj)) {
		return 'Tomorrow';
	}

	if (isYesterday(dateObj)) {
		return 'Yesterday';
	}

	return format(dateObj, 'MMM d, yyyy');
}

/**
 * Format time as human-readable string
 * Examples: "2:30 PM", "9:00 AM"
 */
export function formatTime(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return format(dateObj, 'h:mm a');
}

/**
 * Format date and time together
 * Examples: "Today at 2:30 PM", "Jan 15, 2025 at 9:00 AM"
 */
export function formatDateTime(date: Date | string): string {
	return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Format date range
 * Examples: "Jan 15 - Jan 20, 2025", "Today - Tomorrow"
 */
export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
	const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
	const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

	const startFormatted = formatDate(start);
	const endFormatted = formatDate(end);

	// Same day
	if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
		return `${startFormatted}, ${formatTime(start)} - ${formatTime(end)}`;
	}

	// Different days
	return `${startFormatted} - ${endFormatted}`;
}

/**
 * Format relative time
 * Examples: "2 hours ago", "in 3 days", "5 minutes ago"
 */
export function formatRelativeTime(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return formatDistance(dateObj, new Date(), { addSuffix: true });
}

/**
 * Format date for calendar display
 * Examples: "Mon, Jan 15", "Tue, Jan 16"
 */
export function formatCalendarDate(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return format(dateObj, 'EEE, MMM d');
}

/**
 * Format date for event details
 * Examples: "Monday, January 15, 2025", "Tuesday, January 16, 2025"
 */
export function formatLongDate(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return format(dateObj, 'EEEE, MMMM d, yyyy');
}

/**
 * Format duration in minutes to human-readable string
 * Examples: "30 minutes", "1 hour", "2 hours 30 minutes"
 */
export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
	}

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	if (remainingMinutes === 0) {
		return `${hours} hour${hours !== 1 ? 's' : ''}`;
	}

	return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string): boolean {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return dateObj < new Date();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string): boolean {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return dateObj > new Date();
}
