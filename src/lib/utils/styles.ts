import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for merging Tailwind CSS classes with clsx and tailwind-merge
 * Combines conditional classes and resolves conflicts in Tailwind class names
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Variant utility for creating consistent component variants
 */
export function cva(base: string, variants?: Record<string, Record<string, string>>) {
	return (variant?: Record<string, string | undefined>) => {
		let classes = base;

		if (variants && variant) {
			for (const [key, value] of Object.entries(variant)) {
				if (value && variants[key] && variants[key][value]) {
					classes += ` ${variants[key][value]}`;
				}
			}
		}

		return classes;
	};
}

/**
 * Focus ring utility classes for consistent focus states
 */
export const focusRing =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Screen reader only utility
 */
export const srOnly = 'sr-only';

/**
 * Common transition classes
 */
export const transitions = {
	default: 'transition-colors duration-200',
	fast: 'transition-colors duration-100',
	slow: 'transition-colors duration-300',
	all: 'transition-all duration-200',
	transform: 'transition-transform duration-200'
};

/**
 * Animation classes
 */
export const animations = {
	spin: 'animate-spin',
	pulse: 'animate-pulse',
	bounce: 'animate-bounce',
	fadeIn: 'animate-in fade-in duration-200',
	slideIn: 'animate-in slide-in-from-right duration-300',
	slideOut: 'animate-out slide-out-to-right duration-300'
};
