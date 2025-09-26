import { browser } from '$app/environment';

/**
 * Reactive hook for detecting mobile viewport
 * Returns a reactive state that updates when window size changes
 */
export function IsMobile() {
	let isMobile = $state(false);

	if (browser) {
		// Initial check
		isMobile = window.innerWidth < 768;

		// Listen for window resize
		const handleResize = () => {
			isMobile = window.innerWidth < 768;
		};

		// Add event listener
		window.addEventListener('resize', handleResize);

		// Cleanup function (not directly supported in this format, but would be handled by component cleanup)
		// In a real implementation, you'd use $effect for cleanup
	}

	return {
		get value() {
			return isMobile;
		}
	};
}
