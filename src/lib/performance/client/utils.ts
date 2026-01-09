import { logger } from '$lib/utils/logger';

/**
 * UUID generation with fallbacks for environments that don't support crypto.randomUUID()
 * This ensures compatibility across all browsers and contexts.
 */
export function generateUUID(): string {
	// Try modern crypto.randomUUID() first
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		try {
			return crypto.randomUUID();
		} catch (error) {
			// Fall through to next method if it fails
			logger.warn('crypto.randomUUID() failed, using fallback', { error: error as Error });
		}
	}

	// Fallback to crypto.getRandomValues() with UUID v4 format
	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		try {
			const bytes = new Uint8Array(16);
			crypto.getRandomValues(bytes);

			// Set version (4) and variant bits according to RFC 4122
			bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
			bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

			// Convert to UUID string format
			const hexValues = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
			return [
				hexValues.slice(0, 4).join(''),
				hexValues.slice(4, 6).join(''),
				hexValues.slice(6, 8).join(''),
				hexValues.slice(8, 10).join(''),
				hexValues.slice(10, 16).join('')
			].join('-');
		} catch (error) {
			// Fall through to Math.random() fallback
			logger.warn('crypto.getRandomValues() failed, using Math.random() fallback', {
				error: error as Error
			});
		}
	}

	// Last resort: Math.random() based UUID (non-cryptographic)
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * Get performance recommendations based on metric type
 */
export function getRecommendations(type: string, duration: number, budget: number): string[] {
	const recommendations: string[] = [];

	switch (type) {
		case 'page-load':
			recommendations.push(
				'Optimize image loading with lazy loading',
				'Reduce JavaScript bundle size',
				'Implement code splitting',
				'Use server-side rendering (SSR)',
				'Optimize CSS delivery'
			);
			break;
		case 'graphql':
			recommendations.push(
				'Review GraphQL query complexity',
				'Implement query result caching',
				'Optimize database indexes',
				'Consider query batching',
				'Use field-level caching'
			);
			break;
		case 'component':
			recommendations.push(
				"Use Svelte's reactive statements efficiently",
				'Implement virtual scrolling for large lists',
				'Optimize component re-renders',
				'Consider component lazy loading',
				'Profile component with Svelte DevTools'
			);
			break;
		case 'real-time':
			recommendations.push(
				'Optimize WebSocket message handling',
				'Implement message batching',
				'Use efficient data structures',
				'Consider connection pooling',
				'Optimize network latency'
			);
			break;
		case 'export':
			recommendations.push(
				'Implement streaming exports',
				'Use web workers for processing',
				'Optimize data transformation',
				'Consider server-side generation',
				'Implement progress indicators'
			);
			break;
	}

	return recommendations;
}
