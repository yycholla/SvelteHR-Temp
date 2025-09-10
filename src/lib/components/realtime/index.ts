/**
 * Real-time Components Exports
 * 
 * Centralized exports for all real-time GraphQL subscription components
 * and utilities for easy imports across the application.
 */

// Core real-time stores and utilities
export {
	initializeSubscriptions,
	createEmployeeUpdatesStore,
	createDashboardUpdatesStore, 
	createNotificationsStore,
	createSystemHealthStore,
	realtimeManager
} from '$lib/graphql/realtime.svelte';

// Real-time UI components
export { default as RealtimeStatus } from './RealtimeStatus.svelte';
export { default as NotificationToast } from './NotificationToast.svelte';

// Advanced GraphQL client with real-time features
export {
	AdvancedGraphQLClient,
	createAdvancedClient,
	initializeAdvancedClient,
	advancedGraphQLClient
} from '$lib/graphql/advanced-client.svelte';

// Types
export type {
	AdvancedQueryOptions,
	AdvancedQueryResult
} from '$lib/graphql/advanced-client.svelte';

// Re-export subscription types
export type {
	SubscriptionClient,
	Subscription,
	SubscriptionOptions
} from '$lib/graphql/types';