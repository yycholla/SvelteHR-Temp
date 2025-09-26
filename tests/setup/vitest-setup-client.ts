// Vitest Client-Side Setup for Svelte Component Testing
// Browser environment and DOM testing configuration
// Created: 2025-09-24

import { beforeAll, afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';

// Import base setup
import './vitest-setup';

// Global cleanup after each test
afterEach(() => {
	cleanup();
});

// Browser environment setup
beforeAll(() => {
	// Configure browser testing environment
	if (typeof window !== 'undefined') {
		// Mock window.location
		Object.defineProperty(window, 'location', {
			writable: true,
			value: {
				href: 'http://localhost:5174',
				origin: 'http://localhost:5174',
				protocol: 'http:',
				host: 'localhost:5174',
				hostname: 'localhost',
				port: '5174',
				pathname: '/',
				search: '',
				hash: '',
				assign: vi.fn(),
				replace: vi.fn(),
				reload: vi.fn()
			}
		});

		// Mock window.history
		Object.defineProperty(window, 'history', {
			writable: true,
			value: {
				length: 1,
				state: null,
				back: vi.fn(),
				forward: vi.fn(),
				go: vi.fn(),
				pushState: vi.fn(),
				replaceState: vi.fn()
			}
		});

		// Mock matchMedia for responsive design testing
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn()
			}))
		});

		// Mock ResizeObserver for component resize handling
		global.ResizeObserver = vi.fn().mockImplementation(() => ({
			observe: vi.fn(),
			unobserve: vi.fn(),
			disconnect: vi.fn()
		}));

		// Mock IntersectionObserver for viewport detection
		global.IntersectionObserver = vi.fn().mockImplementation(() => ({
			observe: vi.fn(),
			unobserve: vi.fn(),
			disconnect: vi.fn(),
			root: null,
			rootMargin: '',
			thresholds: []
		}));

		// Mock scrollTo for navigation testing
		window.scrollTo = vi.fn();
		Element.prototype.scrollTo = vi.fn();
		Element.prototype.scrollIntoView = vi.fn();

		// Mock getComputedStyle for style testing
		global.getComputedStyle = vi.fn().mockImplementation(() => ({
			getPropertyValue: vi.fn(() => ''),
			display: 'block',
			opacity: '1',
			transform: 'none'
		}));

		// Mock requestAnimationFrame
		global.requestAnimationFrame = vi.fn((callback) => {
			setTimeout(callback, 16);
			return 1;
		});

		global.cancelAnimationFrame = vi.fn();

		// Mock localStorage and sessionStorage
		const mockStorage = {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			key: vi.fn(),
			length: 0
		};

		Object.defineProperty(window, 'localStorage', {
			value: mockStorage,
			writable: true
		});

		Object.defineProperty(window, 'sessionStorage', {
			value: { ...mockStorage },
			writable: true
		});

		// Mock fetch for API testing
		global.fetch = vi.fn();

		// Mock WebSocket for real-time features
		global.WebSocket = vi.fn().mockImplementation(() => ({
			close: vi.fn(),
			send: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			readyState: 1,
			CONNECTING: 0,
			OPEN: 1,
			CLOSING: 2,
			CLOSED: 3
		}));

		// Mock URL constructor
		global.URL = class URL {
			constructor(
				public href: string,
				public base?: string
			) {
				this.href = href;
			}
			searchParams = new URLSearchParams();
			pathname = '/';
			origin = 'http://localhost:5174';
			protocol = 'http:';
			host = 'localhost:5174';
			hostname = 'localhost';
			port = '5174';
			search = '';
			hash = '';
		};

		global.URLSearchParams = class URLSearchParams {
			private params = new Map<string, string>();

			constructor(init?: string | string[][] | Record<string, string>) {
				// Basic implementation for testing
			}

			append(name: string, value: string) {
				this.params.set(name, value);
			}

			get(name: string) {
				return this.params.get(name) || null;
			}

			set(name: string, value: string) {
				this.params.set(name, value);
			}

			delete(name: string) {
				this.params.delete(name);
			}

			has(name: string) {
				return this.params.has(name);
			}
		};

		// Mock clipboard API
		Object.defineProperty(navigator, 'clipboard', {
			value: {
				writeText: vi.fn(() => Promise.resolve()),
				readText: vi.fn(() => Promise.resolve(''))
			},
			writable: true
		});

		// Mock crypto API
		Object.defineProperty(global, 'crypto', {
			value: {
				getRandomValues: vi.fn((arr: Uint8Array) => {
					for (let i = 0; i < arr.length; i++) {
						arr[i] = Math.floor(Math.random() * 256);
					}
					return arr;
				}),
				randomUUID: vi.fn(() => '550e8400-e29b-41d4-a716-446655440000')
			}
		});
	}
});

// Svelte-specific test utilities
beforeEach(() => {
	// Reset any Svelte component state
	vi.clearAllTimers();
});

// Svelte tick utility for component testing
export const waitForSvelteTick = () => tick();

// Component testing utilities
export const createMockContext = (overrides = {}) => ({
	// Default context values for Svelte components
	user: null,
	permissions: [],
	theme: 'light',
	language: 'en',
	...overrides
});

// Mock SvelteKit stores
export const mockPage = {
	url: new URL('http://localhost:5174'),
	params: {},
	route: { id: null },
	status: 200,
	error: null,
	data: {},
	form: null
};

export const mockNavigating = null;

export const mockUpdated = { check: vi.fn() };

// Mock SvelteKit navigation functions
export const mockGoto = vi.fn();
export const mockInvalidate = vi.fn();
export const mockInvalidateAll = vi.fn();
export const mockPreloadCode = vi.fn();
export const mockPreloadData = vi.fn();
export const mockPushState = vi.fn();
export const mockReplaceState = vi.fn();

// Export for use in tests
export {
	mockPage as $page,
	mockNavigating as $navigating,
	mockUpdated as $updated,
	mockGoto as goto,
	mockInvalidate as invalidate,
	mockInvalidateAll as invalidateAll,
	mockPreloadCode as preloadCode,
	mockPreloadData as preloadData,
	mockPushState as pushState,
	mockReplaceState as replaceState
};
