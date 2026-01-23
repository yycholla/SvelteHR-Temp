/**
 * String validation utilities
 * Pure functions with no Svelte dependencies
 */

/**
 * Checks if a string is non-empty after trimming
 * @param value - The string to check
 * @returns true if non-empty, false otherwise
 */
export function isNonEmpty(value: string | null | undefined): boolean {
	if (!value) return false;
	return value.trim().length > 0;
}

/**
 * Checks if a string meets a minimum length requirement
 * @param value - The string to check
 * @param minLength - The minimum length required
 * @returns true if string meets minimum length, false otherwise
 */
export function hasMinLength(value: string | null | undefined, minLength: number): boolean {
	if (!value) return false;
	return value.length >= minLength;
}

/**
 * Checks if a string is within a maximum length
 * @param value - The string to check
 * @param maxLength - The maximum length allowed
 * @returns true if string is within maximum length, false otherwise
 */
export function hasMaxLength(value: string | null | undefined, maxLength: number): boolean {
	if (!value) return true; // null/undefined has no length, so within max
	return value.length <= maxLength;
}

/**
 * Checks if a string matches a regular expression pattern
 * @param value - The string to check
 * @param pattern - The regular expression pattern to match
 * @returns true if string matches pattern, false otherwise
 */
export function matchesPattern(value: string, pattern: RegExp): boolean {
	return pattern.test(value);
}
