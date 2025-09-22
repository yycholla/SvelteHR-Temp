import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Theme type
export type Theme = 'light' | 'dark' | 'system';

// Get initial theme from localStorage or default to system
function getInitialTheme(): Theme {
	if (!browser) return 'system';

	const stored = localStorage.getItem('theme') as Theme;
	if (stored && ['light', 'dark', 'system'].includes(stored)) {
		return stored;
	}
	return 'system';
}

// Create the theme store
export const theme = writable<Theme>(getInitialTheme());

// Function to apply theme to document
function applyTheme(themeValue: Theme) {
	if (!browser) return;

	const root = document.documentElement;

	// Remove existing theme classes
	root.classList.remove('light', 'dark');

	if (themeValue === 'system') {
		// Use system preference
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		root.classList.add(prefersDark ? 'dark' : 'light');
	} else {
		// Use explicit theme
		root.classList.add(themeValue);
	}
}

// Function to set theme
export function setTheme(newTheme: Theme) {
	if (!browser) return;

	theme.set(newTheme);
	localStorage.setItem('theme', newTheme);
	applyTheme(newTheme);
}

// Function to toggle between light and dark (skip system)
export function toggleTheme() {
	theme.update(currentTheme => {
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
		setTheme(newTheme);
		return newTheme;
	});
}

// Initialize theme on store creation
if (browser) {
	const initialTheme = getInitialTheme();
	applyTheme(initialTheme);

	// Listen for system theme changes when in system mode
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	mediaQuery.addEventListener('change', () => {
		theme.subscribe(currentTheme => {
			if (currentTheme === 'system') {
				applyTheme('system');
			}
		})();
	});
}