/**
 * GraphQL Subscription Client
 * 
 * WebSocket-based subscription client for real-time GraphQL operations.
 * Supports connection management, authentication, and error handling.
 * 
 * Features:
 * - WebSocket connection with reconnection
 * - Authentication via connection params
 * - Subscription deduplication
 * - Event-driven architecture
 * - Batched updates for performance
 */

import type { 
	SubscriptionClient,
	Subscription,
	SubscriptionClientConfig,
	SubscriptionOptions,
	SubscriptionEvent,
	GraphQLError 
} from './types';

/**
 * Custom Subscription Error class
 */
export class SubscriptionError extends Error {
	constructor(
		message: string,
		public readonly code?: string
	) {
		super(message);
		this.name = 'SubscriptionError';
	}
}

/**
 * Individual subscription instance
 */
class GraphQLSubscription implements Subscription {
	public readonly id: string;
	public readonly query: string;
	public readonly variables?: Record<string, any>;
	private readonly client: GraphQLSubscriptionClient;
	private readonly handlers = new Map<SubscriptionEvent, Set<(data?: any) => void>>();

	constructor(
		id: string,
		query: string,
		variables: Record<string, any> | undefined,
		client: GraphQLSubscriptionClient
	) {
		this.id = id;
		this.query = query;
		this.variables = variables;
		this.client = client;
	}

	/**
	 * Unsubscribe from this subscription
	 */
	unsubscribe(): void {
		this.client.unsubscribe(this.id);
	}

	/**
	 * Add event handler
	 */
	on(event: SubscriptionEvent, handler: (data?: any) => void): void {
		if (!this.handlers.has(event)) {
			this.handlers.set(event, new Set());
		}
		this.handlers.get(event)!.add(handler);
	}

	/**
	 * Remove event handler
	 */
	off(event: SubscriptionEvent, handler: (data?: any) => void): void {
		const handlers = this.handlers.get(event);
		if (handlers) {
			handlers.delete(handler);
		}
	}

	/**
	 * Emit event to handlers
	 */
	emit(event: SubscriptionEvent, data?: any): void {
		const handlers = this.handlers.get(event);
		if (handlers) {
			handlers.forEach(handler => {
				try {
					handler(data);
				} catch (error) {
					console.error('Subscription handler error:', error);
				}
			});
		}
	}
}

/**
 * WebSocket-based GraphQL subscription client
 */
class GraphQLSubscriptionClient implements SubscriptionClient {
	private readonly config: SubscriptionClientConfig;
	private ws: WebSocket | null = null;
	private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
	private subscriptions = new Map<string, GraphQLSubscription>();
	private eventHandlers = new Map<SubscriptionEvent, Set<(data?: any) => void>>();
	private nextId = 1;
	private reconnectTimer: number | null = null;
	private reconnectAttempt = 0;
	private batchTimer: number | null = null;
	private batchedUpdates: any[] = [];

	constructor(config: SubscriptionClientConfig) {
		this.config = {
			reconnect: true,
			reconnectAttempts: 5,
			reconnectInterval: 2000,
			enableDeduplication: true,
			batchUpdates: false,
			batchInterval: 100,
			...config
		};

		this.connect();
	}

	/**
	 * Create new subscription
	 */
	subscribe(
		query: string, 
		variables?: Record<string, any>, 
		options?: SubscriptionOptions
	): Subscription {
		const id = this.generateId();
		const subscription = new GraphQLSubscription(id, query, variables, this);
		
		// Add optional handlers from options
		if (options?.onData) {
			subscription.on('data', options.onData);
		}
		if (options?.onError) {
			subscription.on('error', options.onError);
		}
		if (options?.onComplete) {
			subscription.on('complete', options.onComplete);
		}

		// Check for deduplication
		if (this.config.enableDeduplication) {
			const existingSubscription = this.findDuplicateSubscription(query, variables);
			if (existingSubscription) {
				// Return a wrapper that forwards to the existing subscription
				return this.createDuplicateSubscriptionWrapper(existingSubscription, subscription);
			}
		}

		this.subscriptions.set(id, subscription);

		// Send subscription message if connected
		if (this.connectionState === 'connected') {
			this.sendSubscribe(subscription);
		}

		return subscription;
	}

	/**
	 * Unsubscribe from subscription
	 */
	unsubscribe(id: string): void {
		const subscription = this.subscriptions.get(id);
		if (subscription) {
			this.subscriptions.delete(id);
			
			if (this.connectionState === 'connected') {
				this.sendUnsubscribe(id);
			}
		}
	}

	/**
	 * Close connection and cleanup
	 */
	close(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.connectionState = 'disconnected';
		this.subscriptions.clear();
	}

	/**
	 * Add global event handler
	 */
	on(event: SubscriptionEvent, handler: (data?: any) => void): void {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, new Set());
		}
		this.eventHandlers.get(event)!.add(handler);
	}

	/**
	 * Remove global event handler
	 */
	off(event: SubscriptionEvent, handler: (data?: any) => void): void {
		const handlers = this.eventHandlers.get(event);
		if (handlers) {
			handlers.delete(handler);
		}
	}

	/**
	 * Get deduplication statistics
	 */
	getDeduplicationStats(): { totalSubscriptions: number; uniqueSubscriptions: number } {
		return {
			totalSubscriptions: this.subscriptions.size,
			uniqueSubscriptions: this.subscriptions.size // Simplified for now
		};
	}

	/**
	 * Establish WebSocket connection
	 */
	private connect(): void {
		if (this.connectionState !== 'disconnected') {
			return;
		}

		this.connectionState = 'connecting';
		this.emit('connecting');

		try {
			this.ws = new WebSocket(this.config.url, this.config.protocols);
			this.setupEventHandlers();
		} catch (error) {
			console.error('Failed to create WebSocket:', error);
			this.handleConnectionError(error as Error);
		}
	}

	/**
	 * Setup WebSocket event handlers
	 */
	private setupEventHandlers(): void {
		if (!this.ws) return;

		this.ws.onopen = () => {
			this.connectionState = 'connected';
			this.reconnectAttempt = 0;
			this.emit('connected');

			// Send connection init with auth params
			this.sendConnectionInit();

			// Resubscribe to all subscriptions
			this.subscriptions.forEach(subscription => {
				this.sendSubscribe(subscription);
			});
		};

		this.ws.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				this.handleMessage(message);
			} catch (error) {
				console.error('Failed to parse WebSocket message:', error);
			}
		};

		this.ws.onclose = (event) => {
			this.connectionState = 'disconnected';
			this.emit('disconnected', { code: event.code, reason: event.reason });

			// Attempt reconnection if configured
			if (this.config.reconnect && this.reconnectAttempt < (this.config.reconnectAttempts || 5)) {
				this.scheduleReconnect();
			}
		};

		this.ws.onerror = (error) => {
			console.error('WebSocket error:', error);
			this.emit('error', new SubscriptionError('WebSocket connection error'));
		};
	}

	/**
	 * Handle incoming WebSocket messages
	 */
	private handleMessage(message: any): void {
		switch (message.type) {
			case 'connection_ack':
				// Connection acknowledged
				break;

			case 'data':
				if (message.id && message.payload) {
					const subscription = this.subscriptions.get(message.id);
					if (subscription) {
						if (this.config.batchUpdates) {
							this.addToBatch(subscription, message.payload);
						} else {
							subscription.emit('data', message.payload);
						}
					}
				}
				break;

			case 'error':
				if (message.id) {
					const subscription = this.subscriptions.get(message.id);
					if (subscription) {
						subscription.emit('error', new SubscriptionError(
							message.payload?.message || 'Subscription error',
							message.payload?.code
						));
					}
				} else {
					this.emit('error', new SubscriptionError(
						message.payload?.message || 'Connection error',
						message.payload?.code
					));
				}
				break;

			case 'complete':
				if (message.id) {
					const subscription = this.subscriptions.get(message.id);
					if (subscription) {
						subscription.emit('complete');
						this.subscriptions.delete(message.id);
					}
				}
				break;

			default:
				console.warn('Unknown WebSocket message type:', message.type);
		}
	}

	/**
	 * Send connection initialization
	 */
	private sendConnectionInit(): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({
				type: 'connection_init',
				payload: this.config.connectionParams || {}
			}));
		}
	}

	/**
	 * Send subscription message
	 */
	private sendSubscribe(subscription: GraphQLSubscription): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({
				id: subscription.id,
				type: 'start',
				payload: {
					query: subscription.query,
					variables: subscription.variables || {},
					operationName: undefined
				}
			}));
		}
	}

	/**
	 * Send unsubscribe message
	 */
	private sendUnsubscribe(id: string): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({
				id,
				type: 'stop'
			}));
		}
	}

	/**
	 * Schedule reconnection attempt
	 */
	private scheduleReconnect(): void {
		this.reconnectAttempt++;
		this.emit('reconnecting', this.reconnectAttempt);

		const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempt - 1);
		
		this.reconnectTimer = setTimeout(() => {
			this.connect();
		}, delay) as any;
	}

	/**
	 * Handle connection errors
	 */
	private handleConnectionError(error: Error): void {
		this.connectionState = 'disconnected';
		this.emit('error', new SubscriptionError('Connection failed', 'CONNECTION_ERROR'));
	}

	/**
	 * Generate unique subscription ID
	 */
	private generateId(): string {
		return `sub_${this.nextId++}_${Date.now()}`;
	}

	/**
	 * Emit global event
	 */
	private emit(event: SubscriptionEvent, data?: any): void {
		const handlers = this.eventHandlers.get(event);
		if (handlers) {
			handlers.forEach(handler => {
				try {
					handler(data);
				} catch (error) {
					console.error('Global subscription handler error:', error);
				}
			});
		}
	}

	/**
	 * Find duplicate subscription for deduplication
	 */
	private findDuplicateSubscription(
		query: string, 
		variables?: Record<string, any>
	): GraphQLSubscription | null {
		for (const subscription of this.subscriptions.values()) {
			if (subscription.query === query && 
				JSON.stringify(subscription.variables) === JSON.stringify(variables)) {
				return subscription;
			}
		}
		return null;
	}

	/**
	 * Create wrapper for duplicate subscription
	 */
	private createDuplicateSubscriptionWrapper(
		original: GraphQLSubscription,
		duplicate: GraphQLSubscription
	): Subscription {
		// Forward events from original to duplicate
		const forwardEvent = (event: SubscriptionEvent) => {
			original.on(event, (data) => duplicate.emit(event, data));
		};

		forwardEvent('data');
		forwardEvent('error');
		forwardEvent('complete');

		return duplicate;
	}

	/**
	 * Add update to batch for performance
	 */
	private addToBatch(subscription: GraphQLSubscription, data: any): void {
		this.batchedUpdates.push({ subscription, data });

		if (!this.batchTimer) {
			this.batchTimer = setTimeout(() => {
				this.processBatch();
			}, this.config.batchInterval!) as any;
		}
	}

	/**
	 * Process batched updates
	 */
	private processBatch(): void {
		if (this.batchedUpdates.length > 0) {
			// Group updates by subscription
			const grouped = new Map<string, any[]>();
			
			this.batchedUpdates.forEach(({ subscription, data }) => {
				if (!grouped.has(subscription.id)) {
					grouped.set(subscription.id, []);
				}
				grouped.get(subscription.id)!.push(data);
			});

			// Emit batched data
			grouped.forEach((updates, subscriptionId) => {
				const subscription = this.subscriptions.get(subscriptionId);
				if (subscription) {
					subscription.emit('batchedData', updates);
				}
			});

			this.batchedUpdates = [];
		}

		this.batchTimer = null;
	}
}

/**
 * Factory function to create subscription client
 */
export function createSubscriptionClient(config: SubscriptionClientConfig): SubscriptionClient {
	return new GraphQLSubscriptionClient(config);
}

/**
 * Create a Svelte store that manages a GraphQL subscription
 * This provides a reactive store interface for subscription data
 */
export function createSubscriptionStore<TData = any>(
	query: string,
	variables?: Record<string, any>,
	options?: {
		client?: SubscriptionClient;
		initialData?: TData;
		onError?: (error: Error) => void;
		onComplete?: () => void;
	}
) {
	// Create state using Svelte 5 runes
	let data = $state<TData | null>(options?.initialData || null);
	let loading = $state<boolean>(true);
	let error = $state<Error | null>(null);
	
	// Default client configuration (you may want to customize this)
	const defaultClient = createSubscriptionClient({
		url: 'ws://localhost:5656/ws/graphql', // Adjust to your GraphQL WebSocket endpoint
		protocols: ['graphql-ws'],
		reconnect: true
	});
	
	const client = options?.client || defaultClient;
	
	// Create subscription
	const subscription = client.subscribe(query, variables, {
		onData: (result) => {
			loading = false;
			error = null;
			data = result.data;
		},
		onError: (err) => {
			loading = false;
			error = err;
			if (options?.onError) {
				options.onError(err);
			}
		},
		onComplete: () => {
			loading = false;
			if (options?.onComplete) {
				options.onComplete();
			}
		}
	});
	
	// Return store interface
	return {
		// Reactive getters
		get data() { return data; },
		get loading() { return loading; },
		get error() { return error; },
		
		// Derived reactive values
		isLoading: $derived(() => loading),
		hasError: $derived(() => error !== null),
		hasData: $derived(() => data !== null),
		
		// Actions
		refetch: () => {
			loading = true;
			error = null;
			// Resubscribe by creating a new subscription
			subscription.unsubscribe();
			return client.subscribe(query, variables);
		},
		
		// Cleanup
		destroy: () => {
			subscription.unsubscribe();
		}
	};
}

/**
 * Export types for convenience
 */
export type { 
	SubscriptionClient, 
	Subscription, 
	SubscriptionClientConfig, 
	SubscriptionOptions,
	SubscriptionEvent 
};