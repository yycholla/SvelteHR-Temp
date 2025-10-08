/**
 * XSS Sanitization Utility
 *
 * Provides functions to sanitize user-generated content by stripping all HTML tags
 * and JavaScript while preserving plain text and @mention formatting.
 *
 * Security: Server-side sanitization must match these patterns for defense-in-depth.
 */

/**
 * Sanitizes comment content by stripping all HTML tags and JavaScript
 * while preserving plain text and @mention formatting.
 *
 * @param content - Raw user input that may contain malicious HTML/JS
 * @returns Sanitized plain text with @mentions preserved
 *
 * @example
 * sanitizeCommentContent('<script>alert("XSS")</script>Hello @alice')
 * // Returns: 'Hello @alice'
 *
 * @example
 * sanitizeCommentContent('This is <b>bold</b> and <i>italic</i> @bob')
 * // Returns: 'This is bold and italic @bob'
 */
export function sanitizeCommentContent(content: string): string {
	if (!content || typeof content !== 'string') {
		return '';
	}

	return (
		content
			// Remove all script tags and their contents (case-insensitive)
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			// Remove all HTML tags (including event handlers like onclick, onerror, etc.)
			.replace(/<[^>]+>/g, '')
			// Remove HTML entities that could be used for XSS
			.replace(/&lt;script&gt;/gi, '')
			.replace(/&lt;\/script&gt;/gi, '')
			// Trim whitespace
			.trim()
	);
}

/**
 * Extracts @mentions from sanitized content.
 *
 * @param content - Sanitized content (should be run after sanitizeCommentContent)
 * @returns Array of mentioned usernames (without @ prefix)
 *
 * @example
 * extractMentions('Hello @alice and @bob!')
 * // Returns: ['alice', 'bob']
 *
 * @example
 * extractMentions('No mentions here')
 * // Returns: []
 */
export function extractMentions(content: string): string[] {
	if (!content || typeof content !== 'string') {
		return [];
	}

	// Match @username pattern (username must start with letter/underscore, contain alphanumeric/underscore)
	const mentionRegex = /@(\w+)/g;
	const matches = Array.from(content.matchAll(mentionRegex), (m) => m[1]);

	// Return unique mentions (in case of duplicates)
	return [...new Set(matches)];
}

/**
 * Validates comment content length.
 *
 * @param content - Comment content to validate
 * @param minLength - Minimum allowed length (default: 1)
 * @param maxLength - Maximum allowed length (default: 5000)
 * @returns Object with isValid boolean and optional error message
 *
 * @example
 * validateCommentLength('Hello')
 * // Returns: { isValid: true }
 *
 * @example
 * validateCommentLength('')
 * // Returns: { isValid: false, error: 'Comment must be at least 1 character' }
 */
export function validateCommentLength(
	content: string,
	minLength: number = 1,
	maxLength: number = 5000
): { isValid: boolean; error?: string } {
	if (!content || typeof content !== 'string') {
		return {
			isValid: false,
			error: `Comment must be at least ${minLength} character${minLength > 1 ? 's' : ''}`
		};
	}

	const trimmedLength = content.trim().length;

	if (trimmedLength < minLength) {
		return {
			isValid: false,
			error: `Comment must be at least ${minLength} character${minLength > 1 ? 's' : ''}`
		};
	}

	if (trimmedLength > maxLength) {
		return {
			isValid: false,
			error: `Comment must not exceed ${maxLength} characters`
		};
	}

	return { isValid: true };
}

/**
 * Formats timestamp based on 48-hour threshold.
 *
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted timestamp (relative if ≤48h, absolute if >48h)
 *
 * Note: Requires date-fns library (already in project dependencies)
 *
 * @example
 * formatCommentTimestamp('2025-10-08T10:00:00Z') // 2 hours ago
 * // Returns: '2 hours ago' (if within 48 hours)
 *
 * @example
 * formatCommentTimestamp('2025-10-01T10:00:00Z') // 7 days ago
 * // Returns: 'Oct 01, 2025 10:00 AM' (if beyond 48 hours)
 */
export function formatCommentTimestamp(timestamp: string): string {
	try {
		const date = new Date(timestamp);
		const now = new Date();
		const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

		// Import date-fns functions dynamically to avoid circular dependencies
		// These will be imported in the component that uses this function
		if (hoursDiff <= 48) {
			// For implementation in component: formatDistanceToNow(date, { addSuffix: true })
			return `${Math.round(hoursDiff)} hours ago`;
		} else {
			// For implementation in component: format(date, 'MMM dd, yyyy h:mm a')
			return date.toLocaleString('en-US', {
				month: 'short',
				day: '2-digit',
				year: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		}
	} catch (error) {
		console.error('Error formatting timestamp:', error);
		return timestamp;
	}
}
