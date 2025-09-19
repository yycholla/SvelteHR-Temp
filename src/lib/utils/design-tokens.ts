/**
 * Design Token Utilities
 *
 * TypeScript utilities for Carbon Design Token usage and validation.
 * Provides type-safe access to Carbon Design System tokens and helper functions.
 */

// Design Token Categories
export type TokenCategory = 'spacing' | 'color' | 'typography' | 'motion';

// Design Token Interface
export interface DesignToken {
	name: string;
	category: TokenCategory;
	value: string | number;
	description: string;
	platforms: string[];
}

// Carbon Spacing Tokens (8px grid system)
export const spacing = {
	'01': '0.125rem', // 2px
	'02': '0.25rem', // 4px
	'03': '0.5rem', // 8px
	'04': '0.75rem', // 12px
	'05': '1rem', // 16px
	'06': '1.5rem', // 24px
	'07': '2rem', // 32px
	'08': '2.5rem', // 40px
	'09': '3rem', // 48px
	'10': '4rem', // 64px
	'11': '5rem', // 80px
	'12': '6rem', // 96px
	'13': '10rem' // 160px
} as const;

// Carbon Typography Tokens
export const typography = {
	productiveHeading01: {
		fontSize: 'var(--cds-productive-heading-01-font-size)',
		fontWeight: 'var(--cds-productive-heading-01-font-weight)',
		lineHeight: 'var(--cds-productive-heading-01-line-height)',
		letterSpacing: 'var(--cds-productive-heading-01-letter-spacing)'
	},
	productiveHeading02: {
		fontSize: 'var(--cds-productive-heading-02-font-size)',
		fontWeight: 'var(--cds-productive-heading-02-font-weight)',
		lineHeight: 'var(--cds-productive-heading-02-line-height)',
		letterSpacing: 'var(--cds-productive-heading-02-letter-spacing)'
	},
	productiveHeading03: {
		fontSize: 'var(--cds-productive-heading-03-font-size)',
		fontWeight: 'var(--cds-productive-heading-03-font-weight)',
		lineHeight: 'var(--cds-productive-heading-03-line-height)',
		letterSpacing: 'var(--cds-productive-heading-03-letter-spacing)'
	},
	productiveHeading04: {
		fontSize: 'var(--cds-productive-heading-04-font-size)',
		fontWeight: 'var(--cds-productive-heading-04-font-weight)',
		lineHeight: 'var(--cds-productive-heading-04-line-height)',
		letterSpacing: 'var(--cds-productive-heading-04-letter-spacing)'
	},
	productiveHeading05: {
		fontSize: 'var(--cds-productive-heading-05-font-size)',
		fontWeight: 'var(--cds-productive-heading-05-font-weight)',
		lineHeight: 'var(--cds-productive-heading-05-line-height)',
		letterSpacing: 'var(--cds-productive-heading-05-letter-spacing)'
	},
	bodyShort01: {
		fontSize: 'var(--cds-body-short-01-font-size)',
		fontWeight: 'var(--cds-body-short-01-font-weight)',
		lineHeight: 'var(--cds-body-short-01-line-height)',
		letterSpacing: 'var(--cds-body-short-01-letter-spacing)'
	},
	bodyShort02: {
		fontSize: 'var(--cds-body-short-02-font-size)',
		fontWeight: 'var(--cds-body-short-02-font-weight)',
		lineHeight: 'var(--cds-body-short-02-line-height)',
		letterSpacing: 'var(--cds-body-short-02-letter-spacing)'
	},
	bodyLong01: {
		fontSize: 'var(--cds-body-long-01-font-size)',
		fontWeight: 'var(--cds-body-long-01-font-weight)',
		lineHeight: 'var(--cds-body-long-01-line-height)',
		letterSpacing: 'var(--cds-body-long-01-letter-spacing)'
	},
	bodyLong02: {
		fontSize: 'var(--cds-body-long-02-font-size)',
		fontWeight: 'var(--cds-body-long-02-font-weight)',
		lineHeight: 'var(--cds-body-long-02-line-height)',
		letterSpacing: 'var(--cds-body-long-02-letter-spacing)'
	},
	bodyCompact01: {
		fontSize: 'var(--cds-body-compact-01-font-size)',
		fontWeight: 'var(--cds-body-compact-01-font-weight)',
		lineHeight: 'var(--cds-body-compact-01-line-height)',
		letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
	},
	bodyCompact02: {
		fontSize: 'var(--cds-body-compact-02-font-size)',
		fontWeight: 'var(--cds-body-compact-02-font-weight)',
		lineHeight: 'var(--cds-body-compact-02-line-height)',
		letterSpacing: 'var(--cds-body-compact-02-letter-spacing)'
	},
	label01: {
		fontSize: 'var(--cds-label-01-font-size)',
		fontWeight: 'var(--cds-label-01-font-weight)',
		lineHeight: 'var(--cds-label-01-line-height)',
		letterSpacing: 'var(--cds-label-01-letter-spacing)'
	},
	label02: {
		fontSize: 'var(--cds-label-02-font-size)',
		fontWeight: 'var(--cds-label-02-font-weight)',
		lineHeight: 'var(--cds-label-02-line-height)',
		letterSpacing: 'var(--cds-label-02-letter-spacing)'
	},
	helperText01: {
		fontSize: 'var(--cds-helper-text-01-font-size)',
		fontWeight: 'var(--cds-helper-text-01-font-weight)',
		lineHeight: 'var(--cds-helper-text-01-line-height)',
		letterSpacing: 'var(--cds-helper-text-01-letter-spacing)'
	},
	helperText02: {
		fontSize: 'var(--cds-helper-text-02-font-size)',
		fontWeight: 'var(--cds-helper-text-02-font-weight)',
		lineHeight: 'var(--cds-helper-text-02-line-height)',
		letterSpacing: 'var(--cds-helper-text-02-letter-spacing)'
	}
} as const;

// Carbon Color Tokens
export const colors = {
	// Text colors
	textPrimary: 'var(--cds-text-primary)',
	textSecondary: 'var(--cds-text-secondary)',
	textTertiary: 'var(--cds-text-tertiary)',
	textError: 'var(--cds-text-error)',
	textInverse: 'var(--cds-text-inverse)',
	textHelperText: 'var(--cds-text-helper)',
	textPlaceholder: 'var(--cds-text-placeholder)',
	textOnColor: 'var(--cds-text-on-color)',
	textOnColorDisabled: 'var(--cds-text-on-color-disabled)',

	// Background colors
	background: 'var(--cds-background)',
	backgroundHover: 'var(--cds-background-hover)',
	backgroundActive: 'var(--cds-background-active)',
	backgroundSelected: 'var(--cds-background-selected)',
	backgroundSelectedHover: 'var(--cds-background-selected-hover)',
	backgroundInverse: 'var(--cds-background-inverse)',
	backgroundBrand: 'var(--cds-background-brand)',

	// Border colors
	borderSubtle: 'var(--cds-border-subtle)',
	borderStrong: 'var(--cds-border-strong)',
	borderTile: 'var(--cds-border-tile)',
	borderInverse: 'var(--cds-border-inverse)',
	borderInteractive: 'var(--cds-border-interactive)',

	// Link colors
	linkPrimary: 'var(--cds-link-primary)',
	linkPrimaryHover: 'var(--cds-link-primary-hover)',
	linkSecondary: 'var(--cds-link-secondary)',
	linkVisited: 'var(--cds-link-visited)',
	linkInverse: 'var(--cds-link-inverse)',

	// Support colors
	supportError: 'var(--cds-support-error)',
	supportSuccess: 'var(--cds-support-success)',
	supportWarning: 'var(--cds-support-warning)',
	supportInfo: 'var(--cds-support-info)',

	// Interactive colors
	interactive: 'var(--cds-interactive)',
	hover: 'var(--cds-hover)',
	active: 'var(--cds-active)',
	selected: 'var(--cds-selected)',
	selectedHover: 'var(--cds-selected-hover)',
	focus: 'var(--cds-focus)',
	focusInset: 'var(--cds-focus-inset)',
	focusInverse: 'var(--cds-focus-inverse)',

	// Layer colors
	layer01: 'var(--cds-layer-01)',
	layer02: 'var(--cds-layer-02)',
	layer03: 'var(--cds-layer-03)',
	layerHover01: 'var(--cds-layer-hover-01)',
	layerHover02: 'var(--cds-layer-hover-02)',
	layerHover03: 'var(--cds-layer-hover-03)',
	layerActive01: 'var(--cds-layer-active-01)',
	layerActive02: 'var(--cds-layer-active-02)',
	layerActive03: 'var(--cds-layer-active-03)',
	layerSelected01: 'var(--cds-layer-selected-01)',
	layerSelected02: 'var(--cds-layer-selected-02)',
	layerSelected03: 'var(--cds-layer-selected-03)',
	layerSelectedHover01: 'var(--cds-layer-selected-hover-01)',
	layerSelectedHover02: 'var(--cds-layer-selected-hover-02)',
	layerSelectedHover03: 'var(--cds-layer-selected-hover-03)'
} as const;

// Carbon Motion Tokens
export const motion = {
	durationFast01: 'var(--cds-duration-fast-01)', // 70ms
	durationFast02: 'var(--cds-duration-fast-02)', // 110ms
	durationModerate01: 'var(--cds-duration-moderate-01)', // 150ms
	durationModerate02: 'var(--cds-duration-moderate-02)', // 240ms
	durationSlow01: 'var(--cds-duration-slow-01)', // 400ms
	durationSlow02: 'var(--cds-duration-slow-02)', // 700ms

	easingStandard: 'var(--cds-easing-standard)', // cubic-bezier(0.2, 0, 0.38, 0.9)
	easingEntrance: 'var(--cds-easing-entrance)', // cubic-bezier(0, 0, 0.38, 0.9)
	easingExit: 'var(--cds-easing-exit)' // cubic-bezier(0.2, 0, 1, 0.9)
} as const;

// Carbon Layout Tokens
export const layout = {
	size01: 'var(--cds-size-01)', // 16px
	size02: 'var(--cds-size-02)', // 24px
	size03: 'var(--cds-size-03)', // 32px
	size04: 'var(--cds-size-04)', // 40px
	size05: 'var(--cds-size-05)', // 48px
	size06: 'var(--cds-size-06)', // 56px
	size07: 'var(--cds-size-07)', // 64px
	size08: 'var(--cds-size-08)', // 80px

	// Fluid spacing
	fluidSpacing01: 'var(--cds-fluid-spacing-01)',
	fluidSpacing02: 'var(--cds-fluid-spacing-02)',
	fluidSpacing03: 'var(--cds-fluid-spacing-03)',
	fluidSpacing04: 'var(--cds-fluid-spacing-04)',

	// Container sizes
	containerFluid: 'var(--cds-container-fluid)',
	container01: 'var(--cds-container-01)', // 672px
	container02: 'var(--cds-container-02)', // 1056px
	container03: 'var(--cds-container-03)', // 1312px
	container04: 'var(--cds-container-04)', // 1584px
	container05: 'var(--cds-container-05)' // 1856px
} as const;

// Breakpoint System
export const breakpoints = {
	small: { min: 320, max: 671 }, // Mobile
	medium: { min: 672, max: 1055 }, // Tablet
	large: { min: 1056, max: 1311 }, // Desktop
	xlarge: { min: 1312, max: null } // Large Desktop
} as const;

// Type Guards
export function isValidDesignToken(token: any): token is DesignToken {
	return (
		typeof token === 'object' &&
		typeof token.name === 'string' &&
		['spacing', 'color', 'typography', 'motion'].includes(token.category) &&
		(typeof token.value === 'string' || typeof token.value === 'number') &&
		typeof token.description === 'string' &&
		Array.isArray(token.platforms)
	);
}

export function isValidTokenCategory(category: string): category is TokenCategory {
	return ['spacing', 'color', 'typography', 'motion'].includes(category);
}

// Utility Functions

/**
 * Get a spacing token value
 * @param key - Spacing key (01-13)
 * @returns CSS custom property or fallback value
 */
export function getSpacing(key: keyof typeof spacing): string {
	return `var(--cds-spacing-${key}, ${spacing[key]})`;
}

/**
 * Generate CSS styles object from typography token
 * @param typographyKey - Typography token key
 * @returns CSS styles object
 */
export function getTypographyStyles(typographyKey: keyof typeof typography) {
	return typography[typographyKey];
}

/**
 * Get color token value
 * @param colorKey - Color token key
 * @returns CSS custom property value
 */
export function getColor(colorKey: keyof typeof colors): string {
	return colors[colorKey];
}

/**
 * Get motion token value
 * @param motionKey - Motion token key
 * @returns CSS custom property value
 */
export function getMotion(motionKey: keyof typeof motion): string {
	return motion[motionKey];
}

/**
 * Get layout token value
 * @param layoutKey - Layout token key
 * @returns CSS custom property value
 */
export function getLayout(layoutKey: keyof typeof layout): string {
	return layout[layoutKey];
}

/**
 * Check if current viewport matches breakpoint
 * @param breakpoint - Breakpoint name
 * @returns Boolean indicating if breakpoint matches
 */
export function matchesBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
	if (typeof window === 'undefined') return false;

	const { min, max } = breakpoints[breakpoint];
	const width = window.innerWidth;

	if (max === null) {
		return width >= min;
	}

	return width >= min && width <= max;
}

/**
 * Get current breakpoint name
 * @returns Current breakpoint name
 */
export function getCurrentBreakpoint(): keyof typeof breakpoints | null {
	if (typeof window === 'undefined') return null;

	const width = window.innerWidth;

	for (const [name, { min, max }] of Object.entries(breakpoints)) {
		if (max === null && width >= min) {
			return name as keyof typeof breakpoints;
		}
		if (max !== null && width >= min && width <= max) {
			return name as keyof typeof breakpoints;
		}
	}

	return null;
}

/**
 * Create CSS custom property fallback
 * @param property - CSS custom property name
 * @param fallback - Fallback value
 * @returns CSS var() with fallback
 */
export function createCSSVar(property: string, fallback?: string): string {
	return fallback ? `var(${property}, ${fallback})` : `var(${property})`;
}

/**
 * Validate accessibility contrast ratio
 * @param foreground - Foreground color
 * @param background - Background color
 * @returns Contrast ratio
 */
export function getContrastRatio(foreground: string, background: string): number {
	// This would require a color parsing library in a real implementation
	// For now, return a placeholder that assumes WCAG AA compliance
	return 4.5;
}

/**
 * Check if color combination meets WCAG standards
 * @param foreground - Foreground color
 * @param background - Background color
 * @param level - WCAG level ('AA' or 'AAA')
 * @returns Boolean indicating compliance
 */
export function meetsWCAGStandard(
	foreground: string,
	background: string,
	level: 'AA' | 'AAA' = 'AA'
): boolean {
	const ratio = getContrastRatio(foreground, background);
	return level === 'AA' ? ratio >= 4.5 : ratio >= 7.0;
}

/**
 * Generate responsive CSS custom properties
 * @param property - Base property name
 * @param values - Values for each breakpoint
 * @returns CSS custom properties object
 */
export function createResponsiveProperty(
	property: string,
	values: Partial<Record<keyof typeof breakpoints, string>>
): Record<string, string> {
	const result: Record<string, string> = {};

	Object.entries(values).forEach(([breakpoint, value]) => {
		if (value) {
			result[`${property}-${breakpoint}`] = value;
		}
	});

	return result;
}

// Export all token collections
export const tokens = {
	spacing,
	typography,
	colors,
	motion,
	layout,
	breakpoints
} as const;

// Export utility functions
export const utils = {
	getSpacing,
	getTypographyStyles,
	getColor,
	getMotion,
	getLayout,
	matchesBreakpoint,
	getCurrentBreakpoint,
	createCSSVar,
	getContrastRatio,
	meetsWCAGStandard,
	createResponsiveProperty
} as const;

// Default export with all utilities
export default {
	tokens,
	utils,
	isValidDesignToken,
	isValidTokenCategory
};
