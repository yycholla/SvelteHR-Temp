/**
 * Theme Store for SvelteHR
 *
 * Manages application theme state (light/dark mode) with browser persistence.
 * Integrates with system preference detection and manual theme switching.
 */

import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
	current: Theme;
	resolved: 'light' | 'dark'; // The actual theme applied (auto resolved to light/dark)
	isSystemDark: boolean;
}

// Create the theme store
function createThemeStore() {
	const defaultState: ThemeState = {
		current: 'system',
		resolved: 'light',
		isSystemDark: false
	};

	const { subscribe, set, update } = writable<ThemeState>(defaultState);

	// Initialize theme from localStorage and system preference
	function initialize() {
		if (!browser) return;

		// Get saved theme or default to 'system'
		const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';

		// Detect system preference
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const isSystemDark = mediaQuery.matches;

		// Resolve the actual theme
		const resolvedTheme = savedTheme === 'system' ? (isSystemDark ? 'dark' : 'light') : savedTheme;

		// Update store state
		set({
			current: savedTheme,
			resolved: resolvedTheme,
			isSystemDark
		});

		// Apply theme to document
		applyTheme(resolvedTheme);

		// Listen for system theme changes
		mediaQuery.addEventListener('change', (e) => {
			update((state) => {
				const newSystemDark = e.matches;
				const newResolved =
					state.current === 'system' ? (newSystemDark ? 'dark' : 'light') : state.resolved;

				if (state.current === 'system') {
					applyTheme(newResolved);
				}

				return {
					...state,
					isSystemDark: newSystemDark,
					resolved: newResolved
				};
			});
		});
	}

	// Apply theme to document
	function applyTheme(theme: 'light' | 'dark') {
		if (!browser) return;

		const root = document.documentElement;

		if (theme === 'dark') {
			root.classList.add('dark');
			root.setAttribute('data-theme', 'dark');
		} else {
			root.classList.remove('dark');
			root.setAttribute('data-theme', 'light');
		}
	}

	// Set theme and persist to localStorage
	function setTheme(theme: Theme) {
		if (!browser) return;

		localStorage.setItem('theme', theme);

		update((state) => {
			const resolvedTheme = theme === 'system' ? (state.isSystemDark ? 'dark' : 'light') : theme;

			applyTheme(resolvedTheme);

			return {
				...state,
				current: theme,
				resolved: resolvedTheme
			};
		});
	}

	// Toggle between light and dark (skipping system)
	function toggle() {
		const state = get({ subscribe });
		const newTheme = state.resolved === 'light' ? 'dark' : 'light';
		setTheme(newTheme);
	}

	return {
		subscribe,
		initialize,
		setTheme,
		toggle
	};
}

export const themeStore = createThemeStore();

// Auto-initialize if in browser
if (browser) {
	themeStore.initialize();
}

// Helper to get current theme class
export function getThemeClass(resolved: 'light' | 'dark'): string {
	return resolved === 'dark' ? 'dark' : '';
}

// Theme configuration for UI components
export const THEME_CONFIG = {
	light: {
		primary: '#3b82f6',
		background: '#ffffff',
		foreground: '#1f2937',
		muted: '#f9fafb',
		border: '#e5e7eb'
	},
	dark: {
		primary: '#60a5fa',
		background: '#1f2937',
		foreground: '#f9fafb',
		muted: '#111827',
		border: '#374151'
	}
} as const;

// CSS custom properties helper
export function getCSSVariables(theme: 'light' | 'dark') {
	const config = THEME_CONFIG[theme];
	return Object.entries(config)
		.map(([key, value]) => `--color-${key}: ${value};`)
		.join(' ');
}
