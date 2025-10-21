// Debug Settings Store
// Manages developer debug information display settings (system_admin only)

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface DebugSettings {
	show_debug_info: boolean;
	show_performance_metrics: boolean;
	log_level: 'debug' | 'info' | 'warn' | 'error';
}

const DEFAULT_SETTINGS: DebugSettings = {
	show_debug_info: false,
	show_performance_metrics: false,
	log_level: 'info'
};

function createDebugSettingsStore() {
	const { subscribe, set, update } = writable<DebugSettings>(DEFAULT_SETTINGS);

	return {
		subscribe,
		set,
		update,

		/**
		 * Load debug settings from the system settings API
		 */
		async load() {
			if (!browser) return;

			try {
				const response = await fetch('/api/settings/debug');
				if (response.ok) {
					const data = await response.json();
					set(data.settings || DEFAULT_SETTINGS);
				}
			} catch (error) {
				console.error('[DEBUG SETTINGS] Failed to load:', error);
			}
		},

		/**
		 * Toggle debug info display
		 */
		toggleDebugInfo() {
			update((settings) => ({
				...settings,
				show_debug_info: !settings.show_debug_info
			}));
		},

		/**
		 * Toggle performance metrics display
		 */
		togglePerformanceMetrics() {
			update((settings) => ({
				...settings,
				show_performance_metrics: !settings.show_performance_metrics
			}));
		},

		/**
		 * Set log level
		 */
		setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
			update((settings) => ({
				...settings,
				log_level: level
			}));
		}
	};
}

export const debugSettings = createDebugSettingsStore();
