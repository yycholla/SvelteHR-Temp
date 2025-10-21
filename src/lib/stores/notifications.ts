// Real-time notification store using Server-Sent Events
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

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

	return {
		subscribe,
		connect: () => {
			if (!browser) return;

			// Close existing connection
			if (eventSource) {
				eventSource.close();
			}

			// Create new SSE connection
			eventSource = new EventSource('/api/notifications/stream');

			eventSource.onopen = () => {
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
					console.error('Failed to parse SSE message:', err);
				}
			};

			eventSource.onerror = (err) => {
				// Check if it's an auth error (readyState 2 = CLOSED)
				if (eventSource?.readyState === 2) {
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
					return;
				}

				update((state) => ({
					...state,
					connected: false,
					error: 'Connection lost'
				}));

				// Auto-reconnect after 5 seconds for non-auth errors
				setTimeout(() => {
					createNotificationStore().connect();
				}, 5000);
			};
		},
		disconnect: () => {
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
