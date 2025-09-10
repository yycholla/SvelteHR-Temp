/**
 * Real-time GraphQL Subscriptions with Svelte 5 Runes
 * 
 * This file provides reactive stores and utilities for managing real-time GraphQL subscriptions
 * using Svelte 5 runes for optimal reactivity and performance.
 */

import { subscriptions } from './queries';
import { createSubscriptionClient, createSubscriptionStore } from './subscriptions';
import type { SubscriptionClient } from './types';

// Environment configuration
const WS_URL = typeof window !== 'undefined' 
	? `ws://${window.location.host}/api/graphql/subscriptions`
	: 'ws://localhost:8080/api/graphql/subscriptions';

/**
 * Global subscription client instance
 */
let subscriptionClient: SubscriptionClient | null = null;

/**
 * Initialize subscription client with authentication
 */
export function initializeSubscriptions(token: string) {
	if (typeof window === 'undefined') {
		// Server-side rendering - no subscriptions
		return null;
	}

	if (subscriptionClient) {
		subscriptionClient.disconnect();
	}

	subscriptionClient = createSubscriptionClient(WS_URL, {
		connectionParams: () => ({
			authorization: `Bearer ${token}`
		}),
		reconnect: true,
		reconnectAttempts: 5,
		reconnectInterval: 1000,
		batchUpdates: true,
		batchInterval: 50
	});

	return subscriptionClient;
}

/**
 * Real-time Employee Updates Store
 * Subscribes to employee changes and provides reactive state
 */
export function createEmployeeUpdatesStore() {
	const client = subscriptionClient;
	if (!client) {
		// Return a mock store for SSR
		return {
			data: $state(null),
			error: $state(null),
			loading: $state(false),
			subscribe() {},
			unsubscribe() {}
		};
	}

	const store = createSubscriptionStore(
		client,
		subscriptions.employeeUpdates,
		{},
		{
			onData: (data) => {
				console.log('🔄 Employee update received:', data);
			},
			onError: (error) => {
				console.error('❌ Employee subscription error:', error);
			}
		}
	);

	return store;
}

/**
 * Real-time Dashboard Updates Store
 * Subscribes to dashboard widget updates
 */
export function createDashboardUpdatesStore(widgetIds?: string[]) {
	const client = subscriptionClient;
	if (!client) {
		return {
			data: $state(null),
			error: $state(null),
			loading: $state(false),
			subscribe() {},
			unsubscribe() {}
		};
	}

	const variables = widgetIds ? { widget_ids: widgetIds } : {};

	const store = createSubscriptionStore(
		client,
		subscriptions.dashboardUpdates,
		variables,
		{
			onData: (data) => {
				console.log('📊 Dashboard update received:', data);
			},
			onError: (error) => {
				console.error('❌ Dashboard subscription error:', error);
			}
		}
	);

	return store;
}

/**
 * Real-time Notifications Store
 * Subscribes to user notifications
 */
export function createNotificationsStore(userId?: string) {
	const client = subscriptionClient;
	if (!client) {
		return {
			data: $state([]),
			error: $state(null),
			loading: $state(false),
			unreadCount: $state(0),
			subscribe() {},
			unsubscribe() {}
		};
	}

	const variables = userId ? { user_id: userId } : {};

	const store = createSubscriptionStore(
		client,
		subscriptions.notifications,
		variables,
		{
			onData: (data) => {
				console.log('🔔 Notification received:', data);
			},
			onError: (error) => {
				console.error('❌ Notifications subscription error:', error);
			}
		}
	);

	// Enhanced store with notification-specific features
	const notifications = $state<any[]>([]);
	const unreadCount = $derived(() => 
		notifications.filter(n => !n.read).length
	);

	// Subscribe to data updates
	store.subscribe('data', (data) => {
		if (data?.notifications) {
			if (Array.isArray(data.notifications)) {
				notifications.length = 0;
				notifications.push(...data.notifications);
			} else {
				// Single notification update
				const existingIndex = notifications.findIndex(
					n => n.id === data.notifications.id
				);
				
				if (existingIndex >= 0) {
					notifications[existingIndex] = data.notifications;
				} else {
					notifications.unshift(data.notifications);
				}
			}
		}
	});

	return {
		data: store.data,
		error: store.error,
		loading: store.loading,
		notifications: notifications as readonly any[],
		unreadCount,
		subscribe: store.subscribe,
		unsubscribe: store.unsubscribe,
		markAsRead(notificationId: string) {
			const notification = notifications.find(n => n.id === notificationId);
			if (notification) {
				notification.read = true;
			}
		},
		markAllAsRead() {
			notifications.forEach(n => n.read = true);
		},
		removeNotification(notificationId: string) {
			const index = notifications.findIndex(n => n.id === notificationId);
			if (index >= 0) {
				notifications.splice(index, 1);
			}
		}
	};
}

/**
 * System Health Monitor Store
 * Subscribes to system health updates
 */
export function createSystemHealthStore() {
	const client = subscriptionClient;
	if (!client) {
		return {
			data: $state(null),
			error: $state(null),
			loading: $state(false),
			metrics: $state({}),
			alerts: $state([]),
			subscribe() {},
			unsubscribe() {}
		};
	}

	const store = createSubscriptionStore(
		client,
		subscriptions.systemHealth,
		{},
		{
			onData: (data) => {
				console.log('⚡ System health update received:', data);
			},
			onError: (error) => {
				console.error('❌ System health subscription error:', error);
			}
		}
	);

	const metrics = $state<Record<string, any>>({});
	const alerts = $state<any[]>([]);

	// Process health updates
	store.subscribe('data', (data) => {
		if (data?.systemHealthUpdates) {
			const update = data.systemHealthUpdates;
			
			// Update metrics
			metrics[update.metric_name] = {
				value: update.value,
				timestamp: update.timestamp,
				status: update.status
			};

			// Handle alerts
			if (update.alert_level && update.alert_level !== 'normal') {
				const existingAlert = alerts.find(
					a => a.metric_name === update.metric_name
				);

				if (!existingAlert) {
					alerts.unshift({
						id: `${update.metric_name}_${Date.now()}`,
						metric_name: update.metric_name,
						alert_level: update.alert_level,
						value: update.value,
						timestamp: update.timestamp,
						acknowledged: false
					});
				}
			}
		}
	});

	return {
		data: store.data,
		error: store.error,
		loading: store.loading,
		metrics: metrics as readonly Record<string, any>,
		alerts: alerts as readonly any[],
		subscribe: store.subscribe,
		unsubscribe: store.unsubscribe,
		acknowledgeAlert(alertId: string) {
			const alert = alerts.find(a => a.id === alertId);
			if (alert) {
				alert.acknowledged = true;
			}
		},
		clearAlert(alertId: string) {
			const index = alerts.findIndex(a => a.id === alertId);
			if (index >= 0) {
				alerts.splice(index, 1);
			}
		}
	};
}

/**
 * Real-time Status Manager
 * Provides overall connection status and management
 */
export function createRealtimeManager() {
	const connectionStatus = $state<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
	const lastError = $state<string | null>(null);
	const reconnectAttempts = $state(0);
	const subscriptionCount = $state(0);

	// Monitor subscription client status
	if (subscriptionClient) {
		subscriptionClient.on('connecting', () => {
			connectionStatus = 'connecting';
			lastError = null;
		});

		subscriptionClient.on('connected', () => {
			connectionStatus = 'connected';
			reconnectAttempts = 0;
			lastError = null;
		});

		subscriptionClient.on('disconnected', () => {
			connectionStatus = 'disconnected';
		});

		subscriptionClient.on('error', (error) => {
			connectionStatus = 'error';
			lastError = error.message;
		});

		subscriptionClient.on('reconnecting', (attempt) => {
			connectionStatus = 'connecting';
			reconnectAttempts = attempt;
		});

		// Get initial status
		const status = subscriptionClient.getStatus();
		connectionStatus = status.connected ? 'connected' : 'disconnected';
		subscriptionCount = status.totalSubscriptions;
	}

	return {
		connectionStatus: readonly(connectionStatus),
		lastError: readonly(lastError),
		reconnectAttempts: readonly(reconnectAttempts),
		subscriptionCount: readonly(subscriptionCount),
		
		connect(token: string) {
			return initializeSubscriptions(token);
		},

		disconnect() {
			if (subscriptionClient) {
				subscriptionClient.disconnect();
				connectionStatus = 'disconnected';
			}
		},

		reconnect() {
			if (subscriptionClient) {
				subscriptionClient.reconnect();
			}
		},

		getStatus() {
			return subscriptionClient?.getStatus() || {
				connected: false,
				totalSubscriptions: 0,
				uniqueSubscriptions: 0
			};
		}
	};
}

// Utility to create readonly reactive values
function readonly<T>(value: T): T {
	return value;
}

// Global realtime manager instance
export const realtimeManager = createRealtimeManager();