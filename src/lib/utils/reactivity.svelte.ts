/**
 * Advanced Svelte 5 Runes Utilities
 * 
 * Utility functions and patterns for optimized reactive programming with Svelte 5 runes.
 * These utilities provide advanced reactivity patterns, performance optimizations,
 * and composable state management solutions.
 */

import { untrack } from 'svelte';

/**
 * Debounced derived state - prevents excessive recalculation
 * Useful for expensive computations that don't need to run on every change
 */
export function createDebouncedDerived<T>(
	getValue: () => T,
	delay: number = 300
): () => T {
	let timeoutId: number | null = null;
	let currentValue = $state<T>(getValue());
	let isInitial = true;

	// Track the source reactive values
	$effect(() => {
		const newValue = getValue();
		
		if (isInitial) {
			currentValue = newValue;
			isInitial = false;
			return;
		}

		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = window.setTimeout(() => {
			currentValue = newValue;
			timeoutId = null;
		}, delay);
	});

	return () => currentValue;
}

/**
 * Memoized computation - caches results based on input dependencies
 * Prevents redundant calculations when dependencies haven't changed
 */
export function createMemoized<TArgs extends readonly any[], TReturn>(
	fn: (...args: TArgs) => TReturn,
	isEqual: (a: TArgs, b: TArgs) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b)
): (...args: TArgs) => TReturn {
	let lastArgs: TArgs | undefined;
	let lastResult: TReturn;
	let hasRun = false;

	return (...args: TArgs): TReturn => {
		if (!hasRun || !lastArgs || !isEqual(args, lastArgs)) {
			lastArgs = args;
			lastResult = fn(...args);
			hasRun = true;
		}
		return lastResult;
	};
}

/**
 * Async derived state - handles asynchronous computations in reactive context
 * Manages loading states and error handling for async operations
 */
export function createAsyncDerived<T>(
	asyncFn: () => Promise<T>,
	initial?: T
): {
	value: () => T | undefined;
	loading: () => boolean;
	error: () => Error | null;
	retry: () => void;
} {
	let value = $state<T | undefined>(initial);
	let loading = $state<boolean>(false);
	let error = $state<Error | null>(null);
	let retryCount = $state<number>(0);

	async function execute() {
		loading = true;
		error = null;

		try {
			const result = await asyncFn();
			value = result;
		} catch (err) {
			error = err instanceof Error ? err : new Error(String(err));
		} finally {
			loading = false;
		}
	}

	// Execute when dependencies change
	$effect(() => {
		// Access retryCount to trigger re-execution
		retryCount;
		execute();
	});

	function retry() {
		retryCount = retryCount + 1;
	}

	return {
		value: () => value,
		loading: () => loading,
		error: () => error,
		retry
	};
}

/**
 * Batched state updates - groups multiple state changes into a single update
 * Useful for preventing excessive re-renders during bulk operations
 */
export function createBatchedState<T>(initialValue: T) {
	let currentValue = $state<T>(initialValue);
	let pendingUpdate: T | null = null;
	let updateScheduled = false;

	function scheduleUpdate() {
		if (!updateScheduled) {
			updateScheduled = true;
			queueMicrotask(() => {
				if (pendingUpdate !== null) {
					currentValue = pendingUpdate;
					pendingUpdate = null;
				}
				updateScheduled = false;
			});
		}
	}

	return {
		get value() {
			return currentValue;
		},
		set value(newValue: T) {
			pendingUpdate = newValue;
			scheduleUpdate();
		},
		update: (updater: (current: T) => T) => {
			const current = pendingUpdate !== null ? pendingUpdate : currentValue;
			pendingUpdate = updater(current);
			scheduleUpdate();
		},
		flush: () => {
			if (pendingUpdate !== null) {
				currentValue = pendingUpdate;
				pendingUpdate = null;
			}
		}
	};
}

/**
 * Computed with cleanup - derived state that can perform cleanup operations
 * Useful for subscriptions, event listeners, or other resources that need cleanup
 */
export function createComputedWithCleanup<T>(
	compute: () => T,
	cleanup?: (previous: T) => void
): () => T {
	let currentValue = $state<T>(compute());
	let isInitial = true;

	$effect(() => {
		const newValue = compute();
		
		if (!isInitial && cleanup && currentValue !== undefined) {
			untrack(() => cleanup(currentValue));
		}
		
		currentValue = newValue;
		isInitial = false;

		return () => {
			if (cleanup && currentValue !== undefined) {
				cleanup(currentValue);
			}
		};
	});

	return () => currentValue;
}

/**
 * Shared computed state - allows multiple components to share the same computed value
 * Prevents duplicate calculations across components
 */
export function createSharedComputed<T>(compute: () => T): () => T {
	let sharedValue = $state<T>(compute());
	let subscriberCount = 0;
	let isActive = false;

	function subscribe() {
		subscriberCount++;
		
		if (!isActive) {
			isActive = true;
			$effect(() => {
				if (subscriberCount > 0) {
					sharedValue = compute();
				}
			});
		}

		return () => {
			subscriberCount--;
			if (subscriberCount === 0) {
				isActive = false;
			}
		};
	}

	return () => {
		// Auto-subscribe when accessed
		subscribe();
		return sharedValue;
	};
}

/**
 * Optimized array operations - efficient array manipulation with minimal reactivity overhead
 */
export class ReactiveArray<T> {
	private items = $state<T[]>([]);

	constructor(initial: T[] = []) {
		this.items = initial;
	}

	get value() {
		return this.items;
	}

	get length() {
		return this.items.length;
	}

	push(...newItems: T[]) {
		this.items = [...this.items, ...newItems];
	}

	pop(): T | undefined {
		if (this.items.length === 0) return undefined;
		const last = this.items[this.items.length - 1];
		this.items = this.items.slice(0, -1);
		return last;
	}

	shift(): T | undefined {
		if (this.items.length === 0) return undefined;
		const first = this.items[0];
		this.items = this.items.slice(1);
		return first;
	}

	unshift(...newItems: T[]) {
		this.items = [...newItems, ...this.items];
	}

	splice(start: number, deleteCount?: number, ...itemsToAdd: T[]): T[] {
		const removed = this.items.slice(start, start + (deleteCount ?? 0));
		this.items = [
			...this.items.slice(0, start),
			...itemsToAdd,
			...this.items.slice(start + (deleteCount ?? 0))
		];
		return removed;
	}

	filter(predicate: (item: T, index: number) => boolean) {
		this.items = this.items.filter(predicate);
	}

	map<U>(mapper: (item: T, index: number) => U): U[] {
		return this.items.map(mapper);
	}

	find(predicate: (item: T, index: number) => boolean): T | undefined {
		return this.items.find(predicate);
	}

	findIndex(predicate: (item: T, index: number) => boolean): number {
		return this.items.findIndex(predicate);
	}

	includes(searchItem: T): boolean {
		return this.items.includes(searchItem);
	}

	clear() {
		this.items = [];
	}

	replace(newItems: T[]) {
		this.items = newItems;
	}

	sort(compareFn?: (a: T, b: T) => number) {
		this.items = [...this.items].sort(compareFn);
	}

	reverse() {
		this.items = [...this.items].reverse();
	}
}

/**
 * Performance monitoring for runes
 * Helps identify expensive reactive computations
 */
export function createPerformanceMonitor(name: string) {
	let computeTime = $state<number>(0);
	let computeCount = $state<number>(0);
	let lastComputeTime = $state<number>(0);

	function monitor<T>(fn: () => T): T {
		const start = performance.now();
		const result = fn();
		const end = performance.now();
		
		lastComputeTime = end - start;
		computeTime += lastComputeTime;
		computeCount++;

		if (lastComputeTime > 16) { // More than one frame
			console.warn(`[${name}] Slow computation: ${lastComputeTime.toFixed(2)}ms`);
		}

		return result;
	}

	function getStats() {
		return {
			averageTime: computeCount > 0 ? computeTime / computeCount : 0,
			totalTime: computeTime,
			count: computeCount,
			lastTime: lastComputeTime
		};
	}

	return { monitor, getStats };
}

/**
 * Local storage backed state - persists state to localStorage
 * Automatically syncs between tabs and survives page refreshes
 */
export function createLocalStorageState<T>(
	key: string,
	defaultValue: T,
	serializer: {
		serialize: (value: T) => string;
		deserialize: (value: string) => T;
	} = {
		serialize: JSON.stringify,
		deserialize: JSON.parse
	}
) {
	// Initialize from localStorage or use default
	let storedValue: T = defaultValue;
	
	if (typeof window !== 'undefined') {
		try {
			const item = localStorage.getItem(key);
			if (item !== null) {
				storedValue = serializer.deserialize(item);
			}
		} catch (error) {
			console.warn(`Failed to load ${key} from localStorage:`, error);
		}
	}

	let value = $state<T>(storedValue);

	// Sync to localStorage when value changes
	$effect(() => {
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(key, serializer.serialize(value));
			} catch (error) {
				console.warn(`Failed to save ${key} to localStorage:`, error);
			}
		}
	});

	// Listen for storage events from other tabs
	if (typeof window !== 'undefined') {
		window.addEventListener('storage', (e) => {
			if (e.key === key && e.newValue !== null) {
				try {
					value = serializer.deserialize(e.newValue);
				} catch (error) {
					console.warn(`Failed to sync ${key} from other tab:`, error);
				}
			}
		});
	}

	return {
		get value() {
			return value;
		},
		set value(newValue: T) {
			value = newValue;
		},
		update: (updater: (current: T) => T) => {
			value = updater(value);
		}
	};
}