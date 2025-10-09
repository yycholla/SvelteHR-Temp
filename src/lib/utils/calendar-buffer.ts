/**
 * Calendar Buffer Management Utilities
 * Feature: 027-we-need-to
 *
 * Manages 3-month calendar buffer (current month ± 1 month)
 * Handles month navigation and prefetch logic
 */

/**
 * Calculates 3-month buffer range for calendar data loading
 * Returns start of previous month to end of next month
 *
 * @param currentDate - The current date (typically today or selected month)
 * @returns Object with bufferStart and bufferEnd dates
 */
export function calculate3MonthBuffer(currentDate: Date): {
	bufferStart: Date;
	bufferEnd: Date;
} {
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	// Previous month start (00:00:00)
	const bufferStart = new Date(year, month - 1, 1, 0, 0, 0, 0);

	// Next month end (23:59:59.999)
	const bufferEnd = new Date(year, month + 2, 0, 23, 59, 59, 999);

	return { bufferStart, bufferEnd };
}

/**
 * Gets the adjacent month (next or previous)
 * Normalized to first day of month at 00:00:00
 *
 * @param currentDate - Current date
 * @param direction - 'next' or 'prev'
 * @returns Date object for adjacent month
 */
export function getAdjacentMonth(currentDate: Date, direction: 'next' | 'prev'): Date {
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	if (direction === 'next') {
		return new Date(year, month + 1, 1, 0, 0, 0, 0);
	} else {
		return new Date(year, month - 1, 1, 0, 0, 0, 0);
	}
}

/**
 * Determines if data should be prefetched for target date
 * Returns true if target date is outside current buffer range
 *
 * @param targetDate - Date being navigated to
 * @param currentBuffer - Current buffer range
 * @returns true if prefetch needed, false otherwise
 */
export function shouldPrefetch(
	targetDate: Date,
	currentBuffer: { bufferStart: Date; bufferEnd: Date }
): boolean {
	// Compare year and month only using UTC to avoid timezone issues
	const targetYear = targetDate.getUTCFullYear();
	const targetMonth = targetDate.getUTCMonth();

	const bufferStartYear = currentBuffer.bufferStart.getUTCFullYear();
	const bufferStartMonth = currentBuffer.bufferStart.getUTCMonth();

	const bufferEndYear = currentBuffer.bufferEnd.getUTCFullYear();
	const bufferEndMonth = currentBuffer.bufferEnd.getUTCMonth();

	// Check if target month is before buffer start month
	if (targetYear < bufferStartYear || (targetYear === bufferStartYear && targetMonth < bufferStartMonth)) {
		return true;
	}

	// Check if target month is after buffer end month
	if (targetYear > bufferEndYear || (targetYear === bufferEndYear && targetMonth > bufferEndMonth)) {
		return true;
	}

	return false;
}

/**
 * Normalizes date to first day of month at 00:00:00
 *
 * @param date - Date to normalize
 * @returns New Date object at month start
 */
export function normalizeToMonthStart(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Normalizes date to last day of month at 23:59:59.999
 *
 * @param date - Date to normalize
 * @returns New Date object at month end
 */
export function normalizeToMonthEnd(date: Date): Date {
	// Get last day by going to next month day 0
	return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}
