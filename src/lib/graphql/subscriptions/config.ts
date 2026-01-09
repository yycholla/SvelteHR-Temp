import type { SubscriptionTestConfig } from './types';

export const DEFAULT_CONFIG: SubscriptionTestConfig = {
	maxWaitTime: 30000, // 30 seconds
	heartbeatInterval: 5000, // 5 seconds
	reconnectAttempts: 3,
	messageOrderingEnabled: true,
	performanceMonitoring: true,
	debugMode: false
};
