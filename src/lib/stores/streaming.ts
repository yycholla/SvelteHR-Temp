import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface StreamingState {
	isConnected: boolean;
	isLoading: boolean;
	progress: number;
	message: string;
	data: Record<string, any>;
	errors: Record<string, string>;
}

const initialState: StreamingState = {
	isConnected: false,
	isLoading: false,
	progress: 0,
	message: '',
	data: {},
	errors: {}
};

export const streamingState = writable<StreamingState>(initialState);

export class StreamingDataManager {
	private eventSource: EventSource | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 3;
	private reconnectDelay = 1000;

	connect(endpoint: string) {
		if (!browser) return;

		this.disconnect();

		try {
			this.eventSource = new EventSource(endpoint);
			
			streamingState.update(state => ({
				...state,
				isConnected: true,
				isLoading: true,
				progress: 0,
				message: 'Connecting...',
				errors: {}
			}));

			this.eventSource.addEventListener('loading', (event) => {
				const data = JSON.parse(event.data);
				streamingState.update(state => ({
					...state,
					message: data.message,
					progress: data.progress
				}));
			});

			this.eventSource.addEventListener('progress', (event) => {
				const data = JSON.parse(event.data);
				streamingState.update(state => ({
					...state,
					message: data.message,
					progress: data.progress
				}));
			});

			this.eventSource.addEventListener('data', (event) => {
				const data = JSON.parse(event.data);
				streamingState.update(state => ({
					...state,
					data: {
						...state.data,
						[data.type]: data.data
					},
					progress: data.progress,
					message: `Loaded ${data.type}`
				}));
			});

			this.eventSource.addEventListener('error', (event) => {
				const data = JSON.parse(event.data);
				streamingState.update(state => ({
					...state,
					errors: {
						...state.errors,
						[data.type]: data.error
					},
					message: `Error loading ${data.type}: ${data.error}`
				}));
			});

			this.eventSource.addEventListener('complete', (event) => {
				const data = JSON.parse(event.data);
				streamingState.update(state => ({
					...state,
					isLoading: false,
					progress: 100,
					message: data.message
				}));
				this.disconnect();
			});

			this.eventSource.onerror = () => {
				console.error('SSE connection error');
				this.handleConnectionError();
			};

			this.eventSource.onopen = () => {
				console.log('SSE connection opened');
				this.reconnectAttempts = 0;
			};

		} catch (error) {
			console.error('Failed to create SSE connection:', error);
			this.handleConnectionError();
		}
	}

	private handleConnectionError() {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			setTimeout(() => {
				console.log(`Reconnecting SSE... attempt ${this.reconnectAttempts}`);
				// Would need to store the endpoint for reconnection
			}, this.reconnectDelay * this.reconnectAttempts);
		} else {
			streamingState.update(state => ({
				...state,
				isConnected: false,
				isLoading: false,
				message: 'Connection failed. Please refresh the page.'
			}));
		}
	}

	disconnect() {
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
			streamingState.update(state => ({
				...state,
				isConnected: false
			}));
		}
	}

	reset() {
		this.disconnect();
		streamingState.set(initialState);
	}
}

export const streamingManager = new StreamingDataManager();

// Derived stores for easier component usage
export const isStreaming = derived(
	streamingState, 
	$state => $state.isLoading
);

export const streamingProgress = derived(
	streamingState, 
	$state => $state.progress
);

export const streamingMessage = derived(
	streamingState, 
	$state => $state.message
);

export const streamingData = derived(
	streamingState, 
	$state => $state.data
);

export const streamingErrors = derived(
	streamingState, 
	$state => $state.errors
);