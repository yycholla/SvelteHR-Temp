import type { DocumentNode } from 'graphql';

export interface SubscriptionTestConfig {
	maxWaitTime: number; // Maximum time to wait for subscription events
	heartbeatInterval: number; // Interval for connection health checks
	reconnectAttempts: number; // Number of reconnection attempts
	messageOrderingEnabled: boolean; // Verify message ordering
	performanceMonitoring: boolean; // Monitor subscription performance
	debugMode: boolean; // Enable debug logging
}

export interface SubscriptionTestResult {
	subscriptionId: string;
	success: boolean;
	totalMessages: number;
	messagesReceived: string[];
	errors: SubscriptionError[];
	performanceMetrics: SubscriptionPerformanceMetrics;
	connectionEvents: ConnectionEvent[];
	startTime: Date;
	endTime: Date;
	duration: number;
}

export interface SubscriptionError {
	type: 'connection' | 'subscription' | 'data' | 'timeout';
	message: string;
	timestamp: Date;
	details?: any;
}

export interface SubscriptionPerformanceMetrics {
	averageLatency: number;
	maxLatency: number;
	minLatency: number;
	messageRate: number; // Messages per second
	connectionUptime: number;
	reconnectionCount: number;
	totalDataTransferred: number; // Bytes
}

export interface ConnectionEvent {
	type: 'connected' | 'disconnected' | 'reconnecting' | 'error' | 'message';
	timestamp: Date;
	details?: any;
}

export interface SubscriptionScenario {
	name: string;
	description: string;
	subscription: DocumentNode;
	variables?: Record<string, any>;
	expectedMessages: number;
	maxDuration: number;
	triggers?: SubscriptionTrigger[];
	validation: (messages: any[]) => ValidationResult;
}

export interface SubscriptionTrigger {
	delay: number; // Delay before executing trigger in ms
	action: 'mutation' | 'external_event' | 'connection_disruption';
	operation?: DocumentNode;
	variables?: Record<string, any>;
	customAction?: () => Promise<void>;
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	metrics?: Record<string, number>;
}
