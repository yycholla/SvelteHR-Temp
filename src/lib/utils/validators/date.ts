/**
 * Date validation utilities
 * Pure functions with no Svelte dependencies
 */

/**
 * Validates if a value is a valid date
 * @param date - The date to validate (Date object or ISO string)
 * @returns true if valid, false otherwise
 */
export function isValidDate(date: Date | string | null | undefined): boolean {
	if (!date) return false;
	const d = typeof date === 'string' ? new Date(date) : date;
	if (isNaN(d.getTime())) return false;

	// For strings, verify the date wasn't auto-corrected by JavaScript
	// e.g., '2026-02-30' becomes '2026-03-02'
	if (typeof date === 'string') {
		const iso = d.toISOString().split('T')[0];
		const input = date.split('T')[0];
		return iso === input;
	}
	return true;
}

/**
 * Checks if a date is in the past
 * @param date - The date to check (Date object or ISO string)
 * @returns true if the date is in the past, false otherwise
 */
export function isPastDate(date: Date | string): boolean {
	if (!isValidDate(date)) return false;
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.getTime() < Date.now();
}

/**
 * Checks if a date is in the future
 * @param date - The date to check (Date object or ISO string)
 * @returns true if the date is in the future, false otherwise
 */
export function isFutureDate(date: Date | string): boolean {
	if (!isValidDate(date)) return false;
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.getTime() > Date.now();
}

/**
 * Checks if a date falls within a specified range (inclusive)
 * @param date - The date to check (Date object or ISO string)
 * @param start - The start of the range (Date object or ISO string)
 * @param end - The end of the range (Date object or ISO string)
 * @returns true if the date is within the range, false otherwise
 */
export function isDateInRange(
	date: Date | string,
	start: Date | string,
	end: Date | string
): boolean {
	if (!isValidDate(date) || !isValidDate(start) || !isValidDate(end)) return false;
	const d = typeof date === 'string' ? new Date(date) : date;
	const s = typeof start === 'string' ? new Date(start) : start;
	const e = typeof end === 'string' ? new Date(end) : end;
	return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
}
