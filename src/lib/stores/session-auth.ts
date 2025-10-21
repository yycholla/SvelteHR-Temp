/**
 * Session-Based Authentication Store
 * Manages user authentication state for session-based authentication
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// User interface for session auth
export interface SessionUser {
	id: string;
	email: string;
	username: string;
	role: string;
}

// Authentication state interface
interface SessionAuthState {
	isAuthenticated: boolean;
	user: SessionUser | null;
	isLoading: boolean;
	error: string | null;
	lastChecked: number;
}

// Initial state
const initialState: SessionAuthState = {
	isAuthenticated: false,
	user: null,
	isLoading: false,
	error: null,
	lastChecked: 0
};

// Create the session auth store
export const sessionAuthStore = writable<SessionAuthState>(initialState);

// Derived stores
export const isAuthenticated = derived(sessionAuthStore, ($state) => $state.isAuthenticated);
export const currentUser = derived(sessionAuthStore, ($state) => $state.user);
export const isLoading = derived(sessionAuthStore, ($state) => $state.isLoading);
export const authError = derived(sessionAuthStore, ($state) => $state.error);

// Actions
export const sessionAuthActions = {
	/**
	 * Check authentication status by calling the backend
	 */
	async checkAuth(): Promise<boolean> {
		if (!browser) return false;

		sessionAuthStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			const response = await fetch('/api/auth/verify', {
				credentials: 'include' // Include session cookies
			});

			if (response.ok) {
				const userData = await response.json();
				sessionAuthStore.update((state) => ({
					...state,
					isAuthenticated: true,
					user: userData,
					isLoading: false,
					lastChecked: Date.now()
				}));
				return true;
			} else if (response.status === 401) {
				sessionAuthStore.update((state) => ({
					...state,
					isAuthenticated: false,
					user: null,
					isLoading: false,
					lastChecked: Date.now()
				}));
				return false;
			} else {
				throw new Error(`Auth check failed: ${response.status}`);
			}
		} catch (error) {
			console.error('Auth check failed:', error);
			sessionAuthStore.update((state) => ({
				...state,
				isAuthenticated: false,
				user: null,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Authentication check failed',
				lastChecked: Date.now()
			}));
			return false;
		}
	},

	/**
	 * Login with credentials
	 */
	async login(email: string, password: string): Promise<boolean> {
		sessionAuthStore.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, password }),
				credentials: 'include' // Include session cookies
			});

			if (response.ok) {
				const userData = await response.json();
				sessionAuthStore.update((state) => ({
					...state,
					isAuthenticated: true,
					user: userData,
					isLoading: false,
					error: null
				}));
				return true;
			} else {
				const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
				sessionAuthStore.update((state) => ({
					...state,
					isAuthenticated: false,
					user: null,
					isLoading: false,
					error: errorData.error || 'Login failed'
				}));
				return false;
			}
		} catch (error) {
			console.error('Login failed:', error);
			sessionAuthStore.update((state) => ({
				...state,
				isAuthenticated: false,
				user: null,
				isLoading: false,
				error: error instanceof Error ? error.message : 'Login failed'
			}));
			return false;
		}
	},

	/**
	 * Logout
	 */
	async logout(): Promise<void> {
		sessionAuthStore.update((state) => ({ ...state, isLoading: true }));

		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include'
			});
		} catch (error) {
			console.warn('Logout request failed:', error);
		}

		// Clear local state regardless of API response
		sessionAuthStore.set(initialState);
	},

	/**
	 * Clear error state
	 */
	clearError(): void {
		sessionAuthStore.update((state) => ({ ...state, error: null }));
	}
};

// Auto-check auth on store initialization
if (browser) {
	sessionAuthActions.checkAuth();
}
