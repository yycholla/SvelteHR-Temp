/**
 * Session Timeout Management Service
 *
 * Implements comprehensive session timeout handling:
 * - Activity-based inactivity detection
 * - Configurable timeout with warnings
 * - Automatic session extension on activity
 * - Clean logout on timeout
 */

import { browser } from '$app/environment';
import { authConfig } from '$lib/auth/config';
import { auth } from '$lib/stores/auth.svelte';
import { goto } from '$app/navigation';

export interface SessionTimeoutConfig {
	// Inactivity timeout in minutes (default: 30 minutes)
	inactivityTimeout: number;
	// Warning time before timeout in minutes (default: 5 minutes)
	warningTime: number;
	// Session refresh interval in minutes (default: 10 minutes)
	refreshInterval: number;
	// Enable session timeout (default: true)
	enabled: boolean;
}

export interface SessionTimeoutCallbacks {
	onWarning?: (remainingSeconds: number) => void;
	onTimeout?: () => void;
	onSessionRefreshed?: () => void;
	onActivityDetected?: () => void;
}

const DEFAULT_CONFIG: SessionTimeoutConfig = {
	inactivityTimeout: 30, // 30 minutes
	warningTime: 5, // 5 minutes warning
	refreshInterval: 10, // Refresh every 10 minutes
	enabled: true
};

export class SessionTimeoutManager {
	private config: SessionTimeoutConfig;
	private callbacks: SessionTimeoutCallbacks;

	// Timers
	private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
	private warningTimer: ReturnType<typeof setTimeout> | null = null;
	private refreshTimer: ReturnType<typeof setInterval> | null = null;
	private countdownInterval: ReturnType<typeof setInterval> | null = null;

	// State
	private lastActivityTime: number = Date.now();
	private warningShown: boolean = false;
	private isActive: boolean = false;

	// Activity tracking
	private readonly ACTIVITY_EVENTS = [
		'mousedown',
		'mousemove',
		'keypress',
		'scroll',
		'touchstart',
		'click'
	];

	private activityHandler = this.handleActivity.bind(this);

	constructor(config?: Partial<SessionTimeoutConfig>, callbacks?: SessionTimeoutCallbacks) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.callbacks = callbacks || {};
	}

	/**
	 * Start session timeout monitoring
	 */
	public start(): void {
		if (!browser || !this.config.enabled) {
			console.log('⏱️ Session timeout: Disabled (not in browser or disabled in config)');
			return;
		}

		console.log('⏱️ Session timeout: Starting monitor', {
			inactivityTimeout: this.config.inactivityTimeout,
			warningTime: this.config.warningTime,
			refreshInterval: this.config.refreshInterval
		});

		this.isActive = true;
		this.lastActivityTime = Date.now();
		this.warningShown = false;

		// Register activity listeners
		this.registerActivityListeners();

		// Start inactivity timer
		this.resetInactivityTimer();

		// Start periodic session refresh
		this.startSessionRefresh();
	}

	/**
	 * Stop session timeout monitoring
	 */
	public stop(): void {
		console.log('⏱️ Session timeout: Stopping monitor');

		this.isActive = false;
		this.clearAllTimers();
		this.unregisterActivityListeners();
	}

	/**
	 * Reset inactivity timer (call when user is active)
	 */
	public resetActivity(): void {
		if (!this.isActive) return;

		this.lastActivityTime = Date.now();
		this.warningShown = false;
		this.resetInactivityTimer();
		this.stopWarning();
	}

	/**
	 * Manually refresh session
	 */
	public async refreshSession(): Promise<boolean> {
		if (!browser) return false;

		try {
			const response = await fetch('/api/auth/verify', {
				method: 'GET',
				credentials: 'include'
			});

			if (response.ok) {
				console.log('⏱️ Session refreshed successfully');
				this.callbacks.onSessionRefreshed?.();
				this.resetActivity();
				return true;
			} else {
				console.warn('⏱️ Session refresh failed:', response.status);
				return false;
			}
		} catch (error) {
			console.error('⏱️ Session refresh error:', error);
			return false;
		}
	}

	/**
	 * Get remaining time until timeout
	 */
	public getRemainingTime(): number {
		const elapsed = Date.now() - this.lastActivityTime;
		const timeoutMs = this.config.inactivityTimeout * 60 * 1000;
		const remaining = Math.max(0, timeoutMs - elapsed);
		return Math.floor(remaining / 1000); // Return seconds
	}

	/**
	 * Check if warning should be shown
	 */
	public shouldShowWarning(): boolean {
		const remainingSeconds = this.getRemainingTime();
		const warningSeconds = this.config.warningTime * 60;
		return remainingSeconds > 0 && remainingSeconds <= warningSeconds;
	}

	// Private methods

	private registerActivityListeners(): void {
		this.ACTIVITY_EVENTS.forEach((event) => {
			window.addEventListener(event, this.activityHandler, { passive: true });
		});
	}

	private unregisterActivityListeners(): void {
		this.ACTIVITY_EVENTS.forEach((event) => {
			window.removeEventListener(event, this.activityHandler);
		});
	}

	private handleActivity(): void {
		if (!this.isActive) return;

		const now = Date.now();
		const timeSinceLastActivity = now - this.lastActivityTime;

		// Throttle activity updates to every 1 second
		if (timeSinceLastActivity < 1000) return;

		this.resetActivity();
		this.callbacks.onActivityDetected?.();
	}

	private resetInactivityTimer(): void {
		// Clear existing timers
		if (this.inactivityTimer) {
			clearTimeout(this.inactivityTimer);
		}
		if (this.warningTimer) {
			clearTimeout(this.warningTimer);
		}

		const inactivityMs = this.config.inactivityTimeout * 60 * 1000;
		const warningMs = this.config.warningTime * 60 * 1000;

		// Set warning timer (before timeout)
		this.warningTimer = setTimeout(() => {
			this.showWarning();
		}, inactivityMs - warningMs);

		// Set timeout timer
		this.inactivityTimer = setTimeout(() => {
			this.handleTimeout();
		}, inactivityMs);
	}

	private showWarning(): void {
		if (this.warningShown) return;

		console.warn('⏱️ Session timeout warning: Session will expire soon');
		this.warningShown = true;

		// Start countdown for warning callback
		this.startWarningCountdown();
	}

	private startWarningCountdown(): void {
		// Update warning every second
		this.countdownInterval = setInterval(() => {
			const remaining = this.getRemainingTime();

			if (remaining <= 0) {
				this.stopWarning();
				return;
			}

			this.callbacks.onWarning?.(remaining);
		}, 1000);

		// Trigger initial warning
		const remaining = this.getRemainingTime();
		this.callbacks.onWarning?.(remaining);
	}

	private stopWarning(): void {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}
	}

	private async handleTimeout(): Promise<void> {
		console.warn('⏱️ Session timeout: Logging out due to inactivity');

		this.stopWarning();
		this.callbacks.onTimeout?.();

		// Logout and redirect to login
		// Use window.location only if in browser (which is guaranteed here but good practice)
		const currentUrl = browser ? window.location.pathname : '/';
		await auth.logout(currentUrl);

		// Redirect with timeout message
		if (browser) {
			await goto(`/login?timeout=true&redirectTo=${encodeURIComponent(currentUrl)}`);
		}
	}

	private startSessionRefresh(): void {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
		}

		const refreshMs = this.config.refreshInterval * 60 * 1000;

		this.refreshTimer = setInterval(() => {
			// Only refresh if user has been active recently
			const timeSinceActivity = Date.now() - this.lastActivityTime;
			const inactivityMs = this.config.inactivityTimeout * 60 * 1000;

			// Don't refresh if already past warning threshold
			if (timeSinceActivity < inactivityMs - this.config.warningTime * 60 * 1000) {
				this.refreshSession();
			}
		}, refreshMs);
	}

	private clearAllTimers(): void {
		if (this.inactivityTimer) {
			clearTimeout(this.inactivityTimer);
			this.inactivityTimer = null;
		}
		if (this.warningTimer) {
			clearTimeout(this.warningTimer);
			this.warningTimer = null;
		}
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = null;
		}
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}
	}
}

// Singleton instance
let sessionTimeoutManager: SessionTimeoutManager | null = null;

/**
 * Initialize session timeout manager
 */
export function initSessionTimeout(
	config?: Partial<SessionTimeoutConfig>,
	callbacks?: SessionTimeoutCallbacks
): SessionTimeoutManager {
	if (sessionTimeoutManager) {
		sessionTimeoutManager.stop();
	}

	sessionTimeoutManager = new SessionTimeoutManager(config, callbacks);
	sessionTimeoutManager.start();

	return sessionTimeoutManager;
}

/**
 * Get session timeout manager instance
 */
export function getSessionTimeoutManager(): SessionTimeoutManager | null {
	return sessionTimeoutManager;
}

/**
 * Stop session timeout manager
 */
export function stopSessionTimeout(): void {
	if (sessionTimeoutManager) {
		sessionTimeoutManager.stop();
		sessionTimeoutManager = null;
	}
}
