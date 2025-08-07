import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { trpc } from '$lib/trpc/client';
import type { User } from '$lib/schemas/auth';

// Auth state interface
interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}

// Initial auth state
const initialState: AuthState = {
	user: null,
	isAuthenticated: false,
	isLoading: true,
	error: null,
};

// Create the main auth store
function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,
		
		// Initialize auth state (call this on app load)
		init: async () => {
			if (!browser) return;
			
			update(state => ({ ...state, isLoading: true, error: null }));
			
			try {
				const user = await trpc.auth.me.query();
				set({
					user,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});
			} catch (error: any) {
				// Only log non-auth errors
				if (error.code !== 'UNAUTHORIZED') {
					console.error('Auth init error:', error);
				}
				set({
					user: null,
					isAuthenticated: false,
					isLoading: false,
					error: error.code === 'UNAUTHORIZED' ? null : error.message,
				});
			}
		},

		// Login action
		login: async (credentials: { username: string; password: string; rememberMe?: boolean }) => {
			update(state => ({ ...state, isLoading: true, error: null }));
			
			try {
				const response = await trpc.auth.login.mutate(credentials);
				set({
					user: response.user,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});
				return response;
			} catch (error: any) {
				update(state => ({
					...state,
					isLoading: false,
					error: error.message || 'Login failed',
				}));
				throw error;
			}
		},

		// Logout action
		logout: async (redirectToLogin = true) => {
			update(state => ({ ...state, isLoading: true }));
			
			try {
				await trpc.auth.logout.mutate();
			} catch (error) {
				// Continue with logout even if API call fails
				console.warn('Logout API call failed:', error);
			} finally {
				set({
					user: null,
					isAuthenticated: false,
					isLoading: false,
					error: null,
				});
				
				if (browser && redirectToLogin) {
					await goto('/login', { replaceState: true });
				}
			}
		},

		// Update user data
		updateUser: (userData: Partial<User>) => {
			update(state => ({
				...state,
				user: state.user ? { ...state.user, ...userData } : null,
			}));
		},

		// Clear error
		clearError: () => {
			update(state => ({ ...state, error: null }));
		},

		// Manual state reset
		reset: () => {
			set(initialState);
		},
	};
}

// Export the auth store
export const auth = createAuthStore();

// Derived stores for convenience
export const user = derived(auth, $auth => $auth.user);
export const isAuthenticated = derived(auth, $auth => $auth.isAuthenticated);
export const authLoading = derived(auth, $auth => $auth.isLoading);
export const authError = derived(auth, $auth => $auth.error);

// Helper function to check if user has specific role
export const hasRole = derived(
	[auth],
	([$auth]) => (role: string) => {
		if (!$auth.user) return false;
		return $auth.user.role === role || $auth.user.role === 'ADMIN';
	}
);

// Helper function to check if user has any of the specified roles
export const hasAnyRole = derived(
	[auth],
	([$auth]) => (roles: string[]) => {
		if (!$auth.user) return false;
		return roles.includes($auth.user.role) || $auth.user.role === 'ADMIN';
	}
);

// Helper to require authentication (throws error if not authenticated)
export function requireAuth(): User {
	const authState = get(auth);
	if (!authState.isAuthenticated || !authState.user) {
		throw new Error('Authentication required');
	}
	return authState.user;
}

// Helper to redirect to login if not authenticated
export async function redirectIfNotAuthenticated(redirectPath?: string) {
	const authState = get(auth);
	if (!authState.isAuthenticated) {
		const params = redirectPath ? `?redirectTo=${encodeURIComponent(redirectPath)}` : '';
		await goto(`/login${params}`, { replaceState: true });
		return true;
	}
	return false;
}