import { logger } from '$lib/utils/logger';
/**
 * Debug Settings Store (Svelte 5 Runes)
 * Manages developer debug information display settings (system_admin only)
 */

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

/**
 * Debug Settings Store
 */
class DebugSettingsStore {
	show_debug_info = $state(false);
	show_performance_metrics = $state(false);
	log_level = $state<'debug' | 'info' | 'warn' | 'error'>('info');

	/**
	 * Load debug settings from the system settings API
	 */
	async load(): Promise<void> {
		if (!browser) return;

		try {
			const response = await fetch('/api/settings/debug');
			if (response.ok) {
				const data = await response.json();
				const settings = data.settings || DEFAULT_SETTINGS;

				this.show_debug_info = settings.show_debug_info;
				this.show_performance_metrics = settings.show_performance_metrics;
				this.log_level = settings.log_level;
			}
		} catch (error) {
			logger.error('Catch failed', error as Error);
		}
	}

	/**
	 * Toggle debug info display
	 */
	toggleDebugInfo(): void {
		this.show_debug_info = !this.show_debug_info;
	}

	/**
	 * Toggle performance metrics display
	 */
	togglePerformanceMetrics(): void {
		this.show_performance_metrics = !this.show_performance_metrics;
	}

	/**
	 * Set log level
	 */
	setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
		this.log_level = level;
	}

	/**
	 * Get all settings as object
	 */
	getSettings(): DebugSettings {
		return {
			show_debug_info: this.show_debug_info,
			show_performance_metrics: this.show_performance_metrics,
			log_level: this.log_level
		};
	}
}

export const debugSettings = new DebugSettingsStore();
