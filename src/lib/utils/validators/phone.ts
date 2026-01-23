/**
 * Phone number validation utilities
 * Pure functions with no Svelte dependencies
 */

/**
 * Validates if a string is a valid phone number
 * Accepts various formats: (555) 123-4567, 555-123-4567, 5551234567, +1-555-123-4567
 * Requires at least 10 digits
 * @param phone - The phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhone(phone: string | null | undefined): boolean {
	if (!phone) return false;
	const normalized = phone.replace(/[\s\-()]/g, '');
	return normalized.length >= 10 && /^\+?\d+$/.test(normalized);
}

/**
 * Normalizes a phone number by removing all formatting characters
 * @param phone - The phone number to normalize
 * @returns Phone number with only digits
 */
export function normalizePhone(phone: string | null | undefined): string {
	if (!phone) return '';
	return phone.replace(/[\s\-()+]/g, '');
}
