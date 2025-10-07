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
				console.log('📡 Notification stream connected');
				update((state) => ({ ...state, connected: true, error: null }));
			};

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					if (data.type === 'connected') {
						console.log('✅ Notification stream authenticated');
					} else if (data.type === 'notifications') {
						update((state) => ({
							...state,
							notifications: data.data
						}));
					} else if (data.type === 'error') {
						console.error('❌ Notification stream error:', data.message);
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
				console.error('SSE connection error:', err);

				// Check if it's an auth error (readyState 2 = CLOSED)
				if (eventSource?.readyState === 2) {
					console.error('❌ SSE connection closed, likely authentication issue');
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
					console.log('🔄 Attempting to reconnect...');
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
