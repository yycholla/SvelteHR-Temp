/**
 * Email validation utilities
 * Pure functions with no Svelte dependencies
 */

// Stricter email regex that prevents malformed emails
// Local part: starts/ends with alphanumeric, can contain ._+- in between
// Domain: starts/ends with alphanumeric, can contain .- in between, requires at least one dot for TLD
const EMAIL_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/;

/**
 * Validates if a string is a valid email address
 * @param email - The email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string | null | undefined): boolean {
	if (!email) return false;
	const trimmed = email.trim();

	// Check for consecutive dots (invalid in both local and domain parts)
	if (trimmed.includes('..')) return false;

	// Split and validate local and domain parts
	const parts = trimmed.split('@');
	if (parts.length !== 2) return false;

	const [localPart, domainPart] = parts;

	// Local part: cannot start or end with dot
	if (localPart.startsWith('.') || localPart.endsWith('.')) return false;

	// Domain part: cannot start or end with dot
	if (domainPart.startsWith('.') || domainPart.endsWith('.')) return false;

	// Domain must contain at least one dot for TLD
	if (!domainPart.includes('.')) return false;

	// Basic format check
	if (!EMAIL_REGEX.test(trimmed)) return false;

	return true;
}

/**
 * Normalizes an email address by trimming and converting to lowercase
 * @param email - The email address to normalize
 * @returns Normalized email address
 */
export function normalizeEmail(email: string | null | undefined): string {
	if (!email) return '';
	return email.trim().toLowerCase();
}
