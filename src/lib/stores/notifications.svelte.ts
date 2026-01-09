/**
 * Real-time Notification Store (Svelte 5 Runes)
 * Manages SSE-based real-time notifications with automatic reconnection
 */

import { browser } from '$app/environment';
import { logger } from '$lib/utils/logger';

export interface Notification {
	id: string;
	title: string;
	message: string;
	type: 'info' | 'success' | 'warning' | 'error';
	isRead: boolean;
	createdAt: string;
	actionUrl?: string;
}

// Singleton pattern: Ensure only one notification store instance exists
let notificationStoreInstance: NotificationStore | null = null;

/**
 * Notification Store Class
 */
class NotificationStore {
	notifications = $state<Notification[]>([]);
	connected = $state(false);
	error = $state<string | null>(null);

	private eventSource: EventSource | null = null;
	private retryCount = 0;
	private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private isReconnecting = false;
	private isConnecting = false; // Prevent duplicate connection attempts

	// Exponential backoff configuration
	private readonly MAX_RETRIES = 10;
	private readonly INITIAL_DELAY = 5000; // 5 seconds
	private readonly MAX_DELAY = 60000; // 60 seconds
	private readonly BACKOFF_MULTIPLIER = 2;

	constructor() {
		// Singleton guard
		if (notificationStoreInstance) {
			logger.debug('NotificationStore singleton already exists, returning existing instance');
			return notificationStoreInstance;
		}
		notificationStoreInstance = this;
	}

	/**
	 * Calculate exponential backoff delay
	 */
	private getRetryDelay(): number {
		const delay = Math.min(
			this.INITIAL_DELAY * Math.pow(this.BACKOFF_MULTIPLIER, this.retryCount),
			this.MAX_DELAY
		);
		return delay;
	}

	/**
	 * Reset retry state on successful connection
	 */
	private resetRetryState(): void {
		this.retryCount = 0;
		this.isReconnecting = false;
		if (this.retryTimeoutId) {
			clearTimeout(this.retryTimeoutId);
			this.retryTimeoutId = null;
		}
	}

	/**
	 * Attempt to reconnect with exponential backoff
	 */
	private scheduleReconnect(): void {
		// Prevent multiple reconnect loops
		if (this.isReconnecting) {
			logger.debug('NotificationStore reconnect already scheduled, skipping');
			return;
		}

		// Check if we've exceeded max retries
		if (this.retryCount >= this.MAX_RETRIES) {
			logger.error(`[NotificationStore] Max retries (${this.MAX_RETRIES}) exceeded. Giving up.`);
			this.error = 'Failed to connect after multiple attempts. Please refresh the page.';
			return;
		}

		this.isReconnecting = true;
		const delay = this.getRetryDelay();
		this.retryCount++;

		logger.info(
			`[NotificationStore] Reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.MAX_RETRIES})...`
		);

		this.error = `Reconnecting in ${Math.round(delay / 1000)}s... (attempt ${this.retryCount}/${this.MAX_RETRIES})`;

		this.retryTimeoutId = setTimeout(() => {
			this.isReconnecting = false;
			this.retryTimeoutId = null;
			this.connect();
		}, delay);
	}

	/**
	 * Connect to notification stream
	 */
	connect(): void {
		if (!browser) return;

		// Prevent duplicate connections (singleton guard)
		if (this.isConnecting) {
			logger.debug('NotificationStore connection already in progress, skipping');
			return;
		}

		// Prevent connecting to already connected stream
		if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
			logger.debug('NotificationStore already connected, skipping');
			return;
		}

		this.isConnecting = true;

		// Close existing connection
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}

		// Clear any pending reconnect timers
		if (this.retryTimeoutId) {
			clearTimeout(this.retryTimeoutId);
			this.retryTimeoutId = null;
		}

		logger.info('[NotificationStore] Connecting to notification stream...');

		// Create new SSE connection
		this.eventSource = new EventSource('/api/notifications/stream');

		this.eventSource.onopen = () => {
			logger.info('[NotificationStore] ✅ Connected to notification stream');
			this.isConnecting = false; // Reset connection guard
			this.resetRetryState();
			this.connected = true;
			this.error = null;
		};

		this.eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				if (data.type === 'connected') {
					// Stream authenticated
				} else if (data.type === 'notifications') {
					this.notifications = data.data;
				} else if (data.type === 'error') {
					this.error = data.message;
				}
			} catch (err) {
				logger.error('[NotificationStore] Failed to parse SSE message:', err as Error);
			}
		};

		this.eventSource.onerror = (err) => {
			logger.error('[NotificationStore] SSE error', new Error('EventSource error'), { event: err });
			this.isConnecting = false; // Reset connection guard on error

			// Check if it's an auth error (readyState 2 = CLOSED)
			if (this.eventSource?.readyState === 2) {
				logger.error('[NotificationStore] ❌ Authentication failed');
				this.connected = false;
				this.error = 'Authentication failed';
				// Don't reconnect on auth errors
				if (this.eventSource) {
					this.eventSource.close();
					this.eventSource = null;
				}
				this.resetRetryState();
				return;
			}

			this.connected = false;
			this.error = 'Connection lost';

			// Auto-reconnect with exponential backoff for network errors
			this.scheduleReconnect();
		};
	}

	/**
	 * Disconnect from notification stream
	 */
	disconnect(): void {
		logger.info('[NotificationStore] Disconnecting from notification stream');
		this.isConnecting = false; // Reset connection guard
		this.resetRetryState();
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
			this.connected = false;
		}
	}

	/**
	 * Set notifications (for testing or manual updates)
	 */
	setNotifications(notifications: Notification[]): void {
		this.notifications = notifications;
	}
}

export const notificationStore = new NotificationStore();
