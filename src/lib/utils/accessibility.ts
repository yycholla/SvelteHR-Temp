/**
 * Accessibility utilities and helpers
 * Provides WCAG 2.1 AA compliance tools and utilities
 */

/**
 * Focus management utilities
 */
export class FocusManager {
	private focusableSelectors = [
		'button:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'a[href]',
		'[tabindex]:not([tabindex="-1"])',
		'[contenteditable="true"]'
	].join(', ');

	/**
	 * Get all focusable elements within a container
	 */
	getFocusableElements(container: HTMLElement): HTMLElement[] {
		return Array.from(
			container.querySelectorAll(this.focusableSelectors)
		) as HTMLElement[];
	}

	/**
	 * Trap focus within a container (for modals, etc.)
	 */
	trapFocus(container: HTMLElement): () => void {
		const focusableElements = this.getFocusableElements(container);
		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		const handleTabKey = (event: KeyboardEvent) => {
			if (event.key !== 'Tab') return;

			if (event.shiftKey) {
				// Shift + Tab
				if (document.activeElement === firstElement) {
					event.preventDefault();
					lastElement.focus();
				}
			} else {
				// Tab
				if (document.activeElement === lastElement) {
					event.preventDefault();
					firstElement.focus();
				}
			}
		};

		container.addEventListener('keydown', handleTabKey);

		// Focus first element initially
		if (firstElement) {
			firstElement.focus();
		}

		// Return cleanup function
		return () => {
			container.removeEventListener('keydown', handleTabKey);
		};
	}

	/**
	 * Restore focus to previously focused element
	 */
	restoreFocus(previouslyFocusedElement: HTMLElement | null): void {
		if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
			previouslyFocusedElement.focus();
		}
	}

	/**
	 * Skip to main content functionality
	 */
	skipToMain(): void {
		const mainContent = document.querySelector('main, #main, [role="main"]') as HTMLElement;
		if (mainContent) {
			mainContent.focus();
			mainContent.scrollIntoView();
		}
	}
}

/**
 * ARIA utilities
 */
export class AriaUtils {
	/**
	 * Generate unique ID for ARIA relationships
	 */
	static generateId(prefix: string = 'aria'): string {
		return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Set ARIA expanded state
	 */
	static setExpanded(element: HTMLElement, expanded: boolean): void {
		element.setAttribute('aria-expanded', expanded.toString());
	}

	/**
	 * Set ARIA hidden state
	 */
	static setHidden(element: HTMLElement, hidden: boolean): void {
		if (hidden) {
			element.setAttribute('aria-hidden', 'true');
		} else {
			element.removeAttribute('aria-hidden');
		}
	}

	/**
	 * Set ARIA live region
	 */
	static setLiveRegion(
		element: HTMLElement, 
		politeness: 'polite' | 'assertive' = 'polite'
	): void {
		element.setAttribute('aria-live', politeness);
	}

	/**
	 * Announce message to screen readers
	 */
	static announceMessage(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
		const announcer = document.createElement('div');
		announcer.setAttribute('aria-live', priority);
		announcer.setAttribute('aria-atomic', 'true');
		announcer.className = 'sr-only';
		announcer.textContent = message;
		
		document.body.appendChild(announcer);
		
		// Remove after announcement
		setTimeout(() => {
			document.body.removeChild(announcer);
		}, 1000);
	}
}

/**
 * Color contrast utilities
 */
export class ContrastChecker {
	/**
	 * Calculate relative luminance of a color
	 */
	private static getRelativeLuminance(r: number, g: number, b: number): number {
		const [rs, gs, bs] = [r, g, b].map(c => {
			c = c / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		});
		
		return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
	}

	/**
	 * Calculate contrast ratio between two colors
	 */
	static getContrastRatio(color1: string, color2: string): number {
		const rgb1 = this.hexToRgb(color1);
		const rgb2 = this.hexToRgb(color2);
		
		if (!rgb1 || !rgb2) return 0;
		
		const l1 = this.getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
		const l2 = this.getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
		
		const lighter = Math.max(l1, l2);
		const darker = Math.min(l1, l2);
		
		return (lighter + 0.05) / (darker + 0.05);
	}

	/**
	 * Check if colors meet WCAG AA contrast requirements
	 */
	static meetsWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
		const ratio = this.getContrastRatio(foreground, background);
		return isLargeText ? ratio >= 3 : ratio >= 4.5;
	}

	/**
	 * Check if colors meet WCAG AAA contrast requirements
	 */
	static meetsWCAGAAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
		const ratio = this.getContrastRatio(foreground, background);
		return isLargeText ? ratio >= 4.5 : ratio >= 7;
	}

	/**
	 * Convert hex color to RGB
	 */
	private static hexToRgb(hex: string): {r: number, g: number, b: number} | null {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigation {
	/**
	 * Handle arrow key navigation for menus and lists
	 */
	static handleArrowKeys(
		event: KeyboardEvent,
		items: HTMLElement[],
		currentIndex: number
	): number {
		let newIndex = currentIndex;
		
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
				break;
			case 'ArrowUp':
				event.preventDefault();
				newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
				break;
			case 'Home':
				event.preventDefault();
				newIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				newIndex = items.length - 1;
				break;
		}
		
		if (newIndex !== currentIndex) {
			items[newIndex].focus();
		}
		
		return newIndex;
	}

	/**
	 * Handle escape key to close modals/dropdowns
	 */
	static handleEscapeKey(event: KeyboardEvent, closeCallback: () => void): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeCallback();
		}
	}

	/**
	 * Handle enter/space activation
	 */
	static handleActivationKeys(event: KeyboardEvent, activateCallback: () => void): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			activateCallback();
		}
	}
}

/**
 * Screen reader utilities
 */
export class ScreenReaderUtils {
	/**
	 * Create visually hidden text for screen readers
	 */
	static createScreenReaderText(text: string): HTMLSpanElement {
		const span = document.createElement('span');
		span.className = 'sr-only';
		span.textContent = text;
		return span;
	}

	/**
	 * Check if screen reader is likely being used
	 */
	static isScreenReaderLikely(): boolean {
		// This is a heuristic and not 100% accurate
		return (
			window.speechSynthesis !== undefined ||
			navigator.userAgent.includes('NVDA') ||
			navigator.userAgent.includes('JAWS') ||
			window.navigator.userAgent.includes('VoiceOver')
		);
	}

	/**
	 * Format number for screen readers
	 */
	static formatNumberForScreenReader(num: number): string {
		if (num === 0) return 'zero';
		if (num === 1) return 'one';
		return num.toLocaleString();
	}

	/**
	 * Format date for screen readers
	 */
	static formatDateForScreenReader(date: Date): string {
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
}

/**
 * Form accessibility utilities
 */
export class FormAccessibility {
	/**
	 * Associate label with input
	 */
	static associateLabelWithInput(label: HTMLLabelElement, input: HTMLInputElement): void {
		const id = AriaUtils.generateId('input');
		input.id = id;
		label.setAttribute('for', id);
	}

	/**
	 * Add error description to input
	 */
	static addErrorDescription(input: HTMLInputElement, errorElement: HTMLElement): void {
		const errorId = AriaUtils.generateId('error');
		errorElement.id = errorId;
		input.setAttribute('aria-describedby', errorId);
		input.setAttribute('aria-invalid', 'true');
	}

	/**
	 * Remove error description from input
	 */
	static removeErrorDescription(input: HTMLInputElement): void {
		input.removeAttribute('aria-describedby');
		input.removeAttribute('aria-invalid');
	}

	/**
	 * Add help text to input
	 */
	static addHelpText(input: HTMLInputElement, helpElement: HTMLElement): void {
		const helpId = AriaUtils.generateId('help');
		helpElement.id = helpId;
		
		const existingDescribedBy = input.getAttribute('aria-describedby');
		const describedBy = existingDescribedBy 
			? `${existingDescribedBy} ${helpId}` 
			: helpId;
		
		input.setAttribute('aria-describedby', describedBy);
	}
}

/**
 * Accessibility audit utilities
 */
export class AccessibilityAuditor {
	/**
	 * Check for common accessibility issues
	 */
	static auditPage(): AccessibilityIssue[] {
		const issues: AccessibilityIssue[] = [];
		
		// Check for missing alt text on images
		const images = document.querySelectorAll('img');
		images.forEach((img, index) => {
			if (!img.alt && !img.getAttribute('aria-label')) {
				issues.push({
					type: 'missing-alt-text',
					element: img,
					message: `Image ${index + 1} missing alt text`,
					severity: 'error'
				});
			}
		});
		
		// Check for missing form labels
		const inputs = document.querySelectorAll('input, select, textarea');
		inputs.forEach((input, index) => {
			const hasLabel = document.querySelector(`label[for="${input.id}"]`) ||
				input.getAttribute('aria-label') ||
				input.getAttribute('aria-labelledby');
			
			if (!hasLabel) {
				issues.push({
					type: 'missing-form-label',
					element: input,
					message: `Form control ${index + 1} missing label`,
					severity: 'error'
				});
			}
		});
		
		// Check for heading hierarchy
		const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
		let previousLevel = 0;
		headings.forEach((heading) => {
			const level = parseInt(heading.tagName.substr(1));
			if (level > previousLevel + 1) {
				issues.push({
					type: 'heading-hierarchy',
					element: heading,
					message: `Heading level ${level} skips levels`,
					severity: 'warning'
				});
			}
			previousLevel = level;
		});
		
		// Check for focus indicators
		const focusableElements = document.querySelectorAll('button, a, input, select, textarea');
		focusableElements.forEach((element) => {
			const styles = getComputedStyle(element, ':focus');
			if (!styles.outline && !styles.boxShadow && !styles.backgroundColor) {
				issues.push({
					type: 'missing-focus-indicator',
					element: element,
					message: 'Element missing focus indicator',
					severity: 'warning'
				});
			}
		});
		
		return issues;
	}

	/**
	 * Generate accessibility report
	 */
	static generateReport(): AccessibilityReport {
		const issues = this.auditPage();
		const errors = issues.filter(issue => issue.severity === 'error');
		const warnings = issues.filter(issue => issue.severity === 'warning');
		
		return {
			timestamp: new Date(),
			totalIssues: issues.length,
			errors: errors.length,
			warnings: warnings.length,
			issues,
			score: this.calculateAccessibilityScore(issues)
		};
	}

	/**
	 * Calculate accessibility score (0-100)
	 */
	private static calculateAccessibilityScore(issues: AccessibilityIssue[]): number {
		const errorWeight = 10;
		const warningWeight = 5;
		
		const totalDeductions = issues.reduce((sum, issue) => {
			return sum + (issue.severity === 'error' ? errorWeight : warningWeight);
		}, 0);
		
		return Math.max(0, 100 - totalDeductions);
	}
}

/**
 * Interfaces
 */
export interface AccessibilityIssue {
	type: string;
	element: Element;
	message: string;
	severity: 'error' | 'warning' | 'info';
}

export interface AccessibilityReport {
	timestamp: Date;
	totalIssues: number;
	errors: number;
	warnings: number;
	issues: AccessibilityIssue[];
	score: number;
}

/**
 * Initialize accessibility features
 */
export function initializeAccessibility(): void {
	// Add skip to main content link
	const skipLink = document.createElement('a');
	skipLink.href = '#main';
	skipLink.textContent = 'Skip to main content';
	skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-blue-600 focus:text-white';
	skipLink.addEventListener('click', (e) => {
		e.preventDefault();
		new FocusManager().skipToMain();
	});
	
	document.body.insertBefore(skipLink, document.body.firstChild);
	
	// Add keyboard navigation helpers
	document.addEventListener('keydown', (event) => {
		// Alt + 1 = Skip to main content
		if (event.altKey && event.key === '1') {
			event.preventDefault();
			new FocusManager().skipToMain();
		}
		
		// Alt + H = Go to main heading
		if (event.altKey && event.key === 'h') {
			event.preventDefault();
			const mainHeading = document.querySelector('h1') as HTMLElement;
			if (mainHeading) {
				mainHeading.focus();
				mainHeading.scrollIntoView();
			}
		}
	});
	
	// Announce page changes for SPAs
	let currentPath = window.location.pathname;
	const observer = new MutationObserver(() => {
		if (window.location.pathname !== currentPath) {
			currentPath = window.location.pathname;
			const pageTitle = document.title;
			AriaUtils.announceMessage(`Navigated to ${pageTitle}`, 'polite');
		}
	});
	
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
}

/**
 * Utility constants
 */
export const ACCESSIBILITY_CONSTANTS = {
	WCAG_AA_NORMAL_CONTRAST: 4.5,
	WCAG_AA_LARGE_CONTRAST: 3.0,
	WCAG_AAA_NORMAL_CONTRAST: 7.0,
	WCAG_AAA_LARGE_CONTRAST: 4.5,
	LARGE_TEXT_SIZE_PT: 18,
	LARGE_TEXT_SIZE_PX: 24,
	BOLD_TEXT_SIZE_PT: 14,
	BOLD_TEXT_SIZE_PX: 18.5
};