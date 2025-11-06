// Real-time notification store using Server-Sent Events
import { writable } from 'svelte/store';
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

interface NotificationStore {
	notifications: Notification[];
	connected: boolean;
	error: string | null;
}

function createNotificationStore() {
	const { subscribe, set, update } = writable<NotificationStore>({
		notifications: [],
		connected: false,
		error: null
	});

	let eventSource: EventSource | null = null;
	let retryCount = 0;
	let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
	let isReconnecting = false;

	// Exponential backoff configuration
	const MAX_RETRIES = 10;
	const INITIAL_DELAY = 5000; // 5 seconds
	const MAX_DELAY = 60000; // 60 seconds
	const BACKOFF_MULTIPLIER = 2;

	/**
	 * Calculate exponential backoff delay
	 */
	function getRetryDelay(): number {
		const delay = Math.min(INITIAL_DELAY * Math.pow(BACKOFF_MULTIPLIER, retryCount), MAX_DELAY);
		return delay;
	}

	/**
	 * Attempt to reconnect with exponential backoff
	 */
	function scheduleReconnect() {
		// Prevent multiple reconnect loops
		if (isReconnecting) {
			logger.debug('NotificationStore reconnect already scheduled, skipping');
			return;
		}

		// Check if we've exceeded max retries
		if (retryCount >= MAX_RETRIES) {
			console.error(`[NotificationStore] Max retries (${MAX_RETRIES}) exceeded. Giving up.`);
			update((state) => ({
				...state,
				error: 'Failed to connect after multiple attempts. Please refresh the page.'
			}));
			return;
		}

		isReconnecting = true;
		const delay = getRetryDelay();
		retryCount++;

		console.log(
			`[NotificationStore] Reconnecting in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})...`
		);

		update((state) => ({
			...state,
			error: `Reconnecting in ${Math.round(delay / 1000)}s... (attempt ${retryCount}/${MAX_RETRIES})`
		}));

		retryTimeoutId = setTimeout(() => {
			isReconnecting = false;
			retryTimeoutId = null;
			notificationStore.connect();
		}, delay);
	}

	/**
	 * Reset retry state on successful connection
	 */
	function resetRetryState() {
		retryCount = 0;
		isReconnecting = false;
		if (retryTimeoutId) {
			clearTimeout(retryTimeoutId);
			retryTimeoutId = null;
		}
	}

	return {
		subscribe,
		connect: () => {
			if (!browser) return;

			// Close existing connection
			if (eventSource) {
				eventSource.close();
				eventSource = null;
			}

			// Clear any pending reconnect timers
			if (retryTimeoutId) {
				clearTimeout(retryTimeoutId);
				retryTimeoutId = null;
			}

			console.log('[NotificationStore] Connecting to notification stream...');

			// Create new SSE connection
			eventSource = new EventSource('/api/notifications/stream');

			eventSource.onopen = () => {
				console.log('[NotificationStore] ✅ Connected to notification stream');
				resetRetryState();
				update((state) => ({ ...state, connected: true, error: null }));
			};

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					if (data.type === 'connected') {
						// Stream authenticated
					} else if (data.type === 'notifications') {
						update((state) => ({
							...state,
							notifications: data.data
						}));
					} else if (data.type === 'error') {
						update((state) => ({
							...state,
							error: data.message
						}));
					}
				} catch (err) {
					console.error('[NotificationStore] Failed to parse SSE message:', err);
				}
			};

			eventSource.onerror = (err) => {
				console.error('[NotificationStore] SSE error:', err);

				// Check if it's an auth error (readyState 2 = CLOSED)
				if (eventSource?.readyState === 2) {
					console.error('[NotificationStore] ❌ Authentication failed');
					update((state) => ({
						...state,
						connected: false,
						error: 'Authentication failed'
					}));
					// Don't reconnect on auth errors
					if (eventSource) {
						eventSource.close();
						eventSource = null;
					}
					resetRetryState();
					return;
				}

				update((state) => ({
					...state,
					connected: false,
					error: 'Connection lost'
				}));

				// Auto-reconnect with exponential backoff for network errors
				scheduleReconnect();
			};
		},
		disconnect: () => {
			console.log('[NotificationStore] Disconnecting from notification stream');
			resetRetryState();
			if (eventSource) {
				eventSource.close();
				eventSource = null;
				update((state) => ({ ...state, connected: false }));
			}
		},
		setNotifications: (notifications: Notification[]) => {
			update((state) => ({ ...state, notifications }));
		}
	};
}

export const notificationStore = createNotificationStore();
