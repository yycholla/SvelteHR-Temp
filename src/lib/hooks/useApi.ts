import { writable, derived, type Readable } from 'svelte/store';
import { apiClient } from '$lib/api/client';
import { transformErrorResponse, transformSuccessResponse, buildQueryParams } from '$lib/schemas/transformers';

/**
 * Generic API state interface
 */
interface ApiState<T> {
	data: T | null;
	loading: boolean;
	error: string | null;
	lastUpdated: Date | null;
}

/**
 * API hook options
 */
interface ApiHookOptions<T> {
	immediate?: boolean;
	transform?: (data: any) => T;
	onSuccess?: (data: T) => void;
	onError?: (error: string) => void;
	cacheDuration?: number; // in milliseconds
}

/**
 * Generic API hook for data fetching
 */
export function useApi<T>(
	endpoint: string,
	options: ApiHookOptions<T> = {}
) {
	const {
		immediate = true,
		transform,
		onSuccess,
		onError,
		cacheDuration = 5 * 60 * 1000 // 5 minutes default
	} = options;

	// Create reactive stores
	const state = writable<ApiState<T>>({
		data: null,
		loading: false,
		error: null,
		lastUpdated: null
	});

	// Cache management
	const cache = new Map<string, { data: any; timestamp: number }>();

	// Check if cached data is still valid
	function isCacheValid(key: string): boolean {
		const cached = cache.get(key);
		if (!cached) return false;
		return Date.now() - cached.timestamp < cacheDuration;
	}

	// Fetch data function
	async function fetch(params: Record<string, any> = {}) {
		const queryString = buildQueryParams(params).toString();
		const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
		const cacheKey = fullEndpoint;

		// Check cache first
		if (isCacheValid(cacheKey)) {
			const cached = cache.get(cacheKey)!;
			const transformedData = transform ? transform(cached.data) : cached.data;
			
			state.update(s => ({
				...s,
				data: transformedData,
				loading: false,
				error: null,
				lastUpdated: new Date(cached.timestamp)
			}));
			
			onSuccess?.(transformedData);
			return transformedData;
		}

		// Set loading state
		state.update(s => ({ ...s, loading: true, error: null }));

		try {
			const response = await apiClient.get(fullEndpoint);
			const transformedData = transform ? transform(response) : response;

			// Cache the response
			cache.set(cacheKey, { data: response, timestamp: Date.now() });

			// Update state
			state.update(s => ({
				...s,
				data: transformedData,
				loading: false,
				error: null,
				lastUpdated: new Date()
			}));

			onSuccess?.(transformedData);
			return transformedData;
		} catch (error: any) {
			const errorMessage = error.message || 'Failed to fetch data';
			
			state.update(s => ({
				...s,
				loading: false,
				error: errorMessage,
				lastUpdated: new Date()
			}));

			onError?.(errorMessage);
			throw error;
		}
	}

	// Refresh function (bypasses cache)
	async function refresh(params: Record<string, any> = {}) {
		const queryString = buildQueryParams(params).toString();
		const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
		cache.delete(fullEndpoint);
		return fetch(params);
	}

	// Clear cache function
	function clearCache() {
		cache.clear();
	}

	// Auto-fetch on initialization
	if (immediate) {
		fetch();
	}

	return {
		...state,
		fetch,
		refresh,
		clearCache
	};
}

/**
 * Hook for paginated API endpoints
 */
export function usePaginatedApi<T>(
	endpoint: string,
	options: ApiHookOptions<T> & { pageSize?: number } = {}
) {
	const { pageSize = 20, ...apiOptions } = options;
	
	const paginationState = writable({
		page: 1,
		pageSize,
		totalCount: 0,
		totalPages: 0,
		hasMore: false
	});

	const api = useApi<T>(endpoint, {
		...apiOptions,
		immediate: false
	});

	// Load specific page
	async function loadPage(page: number, additionalParams: Record<string, any> = {}) {
		const params = {
			page,
			pageSize,
			...additionalParams
		};

		try {
			const response = await api.fetch(params);
			
			// Update pagination state if response includes pagination info
			if (response && typeof response === 'object' && 'totalCount' in response) {
				paginationState.update(s => ({
					...s,
					page,
					totalCount: (response as any).totalCount,
					totalPages: (response as any).totalPages || Math.ceil((response as any).totalCount / pageSize),
					hasMore: (response as any).hasMore || page < Math.ceil((response as any).totalCount / pageSize)
				}));
			}

			return response;
		} catch (error) {
			throw error;
		}
	}

	// Load next page
	async function nextPage(additionalParams: Record<string, any> = {}) {
		const currentState = derived(paginationState, $state => $state);
		let currentPage: number;
		
		currentState.subscribe(state => {
			currentPage = state.page;
		})();

		if (currentPage) {
			return loadPage(currentPage + 1, additionalParams);
		}
	}

	// Load previous page
	async function previousPage(additionalParams: Record<string, any> = {}) {
		const currentState = derived(paginationState, $state => $state);
		let currentPage: number;
		
		currentState.subscribe(state => {
			currentPage = state.page;
		})();

		if (currentPage && currentPage > 1) {
			return loadPage(currentPage - 1, additionalParams);
		}
	}

	// Initialize with first page
	if (apiOptions.immediate !== false) {
		loadPage(1);
	}

	return {
		...api,
		pagination: paginationState,
		loadPage,
		nextPage,
		previousPage
	};
}

/**
 * Hook for mutations (POST, PUT, DELETE)
 */
export function useMutation<TInput, TOutput>(
	endpoint: string,
	method: 'POST' | 'PUT' | 'DELETE' = 'POST',
	options: {
		transform?: (data: any) => TOutput;
		onSuccess?: (data: TOutput) => void;
		onError?: (error: string) => void;
	} = {}
) {
	const { transform, onSuccess, onError } = options;

	const state = writable<ApiState<TOutput>>({
		data: null,
		loading: false,
		error: null,
		lastUpdated: null
	});

	async function mutate(data: TInput, pathParams?: Record<string, string>) {
		let finalEndpoint = endpoint;
		
		// Replace path parameters
		if (pathParams) {
			Object.entries(pathParams).forEach(([key, value]) => {
				finalEndpoint = finalEndpoint.replace(`{${key}}`, value);
			});
		}

		state.update(s => ({ ...s, loading: true, error: null }));

		try {
			let response;
			
			switch (method) {
				case 'POST':
					response = await apiClient.post(finalEndpoint, { json: data });
					break;
				case 'PUT':
					response = await apiClient.put(finalEndpoint, { json: data });
					break;
				case 'DELETE':
					response = await apiClient.delete(finalEndpoint);
					break;
			}

			const transformedData = transform ? transform(response) : response;

			state.update(s => ({
				...s,
				data: transformedData,
				loading: false,
				error: null,
				lastUpdated: new Date()
			}));

			onSuccess?.(transformedData);
			return transformedData;
		} catch (error: any) {
			const errorMessage = error.message || 'Mutation failed';
			
			state.update(s => ({
				...s,
				loading: false,
				error: errorMessage,
				lastUpdated: new Date()
			}));

			onError?.(errorMessage);
			throw error;
		}
	}

	return {
		...state,
		mutate
	};
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticMutation<TInput, TOutput>(
	endpoint: string,
	method: 'POST' | 'PUT' | 'DELETE' = 'POST',
	options: {
		transform?: (data: any) => TOutput;
		optimisticUpdate?: (input: TInput) => TOutput;
		onSuccess?: (data: TOutput) => void;
		onError?: (error: string, rollback: () => void) => void;
	} = {}
) {
	const { transform, optimisticUpdate, onSuccess, onError } = options;
	const mutation = useMutation<TInput, TOutput>(endpoint, method, { transform });

	let previousData: TOutput | null = null;

	async function mutateOptimistically(data: TInput, pathParams?: Record<string, string>) {
		// Store current state for potential rollback
		mutation.subscribe(state => {
			previousData = state.data;
		})();

		// Apply optimistic update
		if (optimisticUpdate) {
			const optimisticData = optimisticUpdate(data);
			mutation.update(s => ({
				...s,
				data: optimisticData,
				loading: true,
				error: null
			}));
		}

		try {
			const result = await mutation.mutate(data, pathParams);
			onSuccess?.(result);
			return result;
		} catch (error: any) {
			// Rollback function
			const rollback = () => {
				mutation.update(s => ({
					...s,
					data: previousData,
					loading: false,
					error: null
				}));
			};

			onError?.(error.message, rollback);
			throw error;
		}
	}

	return {
		...mutation,
		mutateOptimistically
	};
}