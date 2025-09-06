// Removed old Svelte 4 store imports - using Svelte 5 runes instead
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { apiClient } from '../api/client';
import { showError, showSuccess } from '../utils/errors';
import type { User, AuthResponse } from '../api/types';

export interface AuthState {
	user: User | null;
	token: string | null;
	expiresAt: Date | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	loginAttempts: number;
	lastLoginError: string | null;
}

const initialState: AuthState = {
	user: null,
	token: null,
	expiresAt: null,
	isLoading: false,
	isAuthenticated: false,
	loginAttempts: 0,
	lastLoginError: null
};

// TODO(human): Modernize this auth store to use Svelte 5 runes
// Replace the writable store with $state and convert derived stores to $derived
// Current pattern: writable store with derived stores
// Target pattern: $state with $derived (similar to departments store)
//
// Steps:
// 1. Replace `export const authStore = writable<AuthState>(initialState);`
//    with `let authState = $state<AuthState>(initialState);`
// 2. Convert each derived store to use $derived, for example:
//    `export const isAuthenticated = derived(authStore, ($auth) => $auth.isAuthenticated);`
//    becomes `export const isAuthenticated = $derived(authState.isAuthenticated);`
// 3. Update all authStore.update() calls in authActions to directly mutate authState
// 4. Replace get(authStore) calls with direct authState access

let authState = $state<AuthState>(initialState);

// Derived stores using Svelte 5 runes
export const isAuthenticated = $derived(authState.isAuthenticated);
export const currentUser = $derived(authState.user);
export const userPermissions = $derived(authState.user?.permissions || []);
export const userRoles = $derived(authState.user?.roles || []);
export const isLoading = $derived(authState.isLoading);
export const loginAttempts = $derived(authState.loginAttempts);
export const lastLoginError = $derived(authState.lastLoginError);

// Role-based derived stores (using RBAC role names)
export const isAdmin = $derived(
	authState.user?.roles?.some((role) =>
		['Admin', 'Administrator', 'System Admin'].includes(role.name)
	) ?? false
);
export const isHR = $derived(
	authState.user?.roles?.some((role) =>
		['HR', 'HR Manager', 'HR Admin', 'Human Resources'].includes(role.name)
	) ?? false
);
export const isManager = $derived(
	authState.user?.roles?.some((role) =>
		['Manager', 'Department Manager', 'Team Lead', 'Supervisor'].includes(role.name)
	) ?? false
);
export const isEmployee = $derived(
	authState.user?.roles?.some((role) => ['Employee', 'Staff', 'Team Member'].includes(role.name)) ?? false
);

// Permission-based derived stores using resource.action format
export const canViewEmployees = $derived(
	authState.user?.permissions?.includes('employees.read') ||
	authState.user?.permissions?.includes('employees.*') ||
	authState.user?.permissions?.includes('*') ||
	false
);
export const canEditEmployees = $derived(
	authState.user?.permissions?.includes('employees.write') ||
	authState.user?.permissions?.includes('employees.update') ||
	authState.user?.permissions?.includes('employees.*') ||
	authState.user?.permissions?.includes('*') ||
	false
);
export const canCreateEmployees = $derived(
	authState.user?.permissions?.includes('employees.create') ||
	authState.user?.permissions?.includes('employees.*') ||
	authState.user?.permissions?.includes('*') ||
	false
);
export const canDeleteEmployees = $derived(
	authState.user?.permissions?.includes('employees.delete') ||
	authState.user?.permissions?.includes('employees.*') ||
	authState.user?.permissions?.includes('*') ||
	false
);
export const canViewReports = $derived(
	authState.user?.permissions?.includes('reports.read') ||
	authState.user?.permissions?.includes('reports.*') ||
	authState.user?.permissions?.includes('*') ||
	false
);
export const canManageRoles = $derived(
	authState.user?.permissions?.includes('roles.write') ||
	authState.user?.permissions?.includes('roles.*') ||
	authState.user?.permissions?.includes('system.admin') ||
	authState.user?.permissions?.includes('*') ||
	false
);
export const canViewDepartments = $derived(
	authState.user?.permissions?.includes('departments.read') ||
	authState.user?.permissions?.includes('departments.*') ||
	authState.user?.permissions?.includes('*') ||
	false
);
export const canManageDepartments = $derived(
	authState.user?.permissions?.includes('departments.write') ||
	authState.user?.permissions?.includes('departments.*') ||
	authState.user?.permissions?.includes('*') ||
	false
);

// Auth token management
let refreshTimer: NodeJS.Timeout;

export const authActions = {
	// Initialize auth state from GelDB auth token
	async initialize() {
		if (!browser) return;

		authState.isLoading = true;

		try {
			// Check for GelDB auth token in cookies
			const token = apiClient.auth.checkAuthToken();

			if (token) {
				// Verify token with GelDB
				const response = await apiClient.auth.verify();

				if (response.success && response.data) {
					// Set auth data from GelDB response
					this.setAuthData({
						token,
						user: response.data.user,
						expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Default 24h
					});
				} else {
					// Token invalid, clear it
					this.clearAuthData();
				}
			}
		} catch (error) {
			console.error('GelDB auth initialization failed:', error);
			this.clearAuthData();
		} finally {
			authState.isLoading = false;
		}
	},

	// Redirect to GelDB sign-in
	async signIn() {
		authState.isLoading = true;
		authState.lastLoginError = null;

		try {
			// Redirect to GelDB built-in sign-in UI
			apiClient.auth.signInRedirect();
			return { success: true };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Sign-in redirect failed';
			authState.lastLoginError = errorMessage;
			authState.isLoading = false;

			showError(errorMessage, { title: 'Sign-in Error' });

			return {
				success: false,
				error: errorMessage
			};
		}
	},

	// Redirect to GelDB sign-up
	async signUp() {
		authState.isLoading = true;
		authState.lastLoginError = null;

		try {
			// Redirect to GelDB built-in sign-up UI
			apiClient.auth.signUpRedirect();
			return { success: true };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Sign-up redirect failed';
			authState.lastLoginError = errorMessage;
			authState.isLoading = false;

			showError(errorMessage, { title: 'Sign-up Error' });

			return {
				success: false,
				error: errorMessage
			};
		}
	},

	// Register new user
	async register(userData: {
		email: string;
		password: string;
		full_name: string;
		role_id?: string;
	}) {
		authState.isLoading = true;
		authState.lastLoginError = null;

		try {
			const response = await apiClient.auth.register(userData);

			if (response.success && response.data) {
				showSuccess(
					'Account created successfully! Please check your email for verification instructions.'
				);

				// For auto-login registration flows, uncomment this:
				// this.setAuthData(response.data);

				return { success: true, data: response.data };
			} else {
				const errorMessage = response.error || 'Registration failed';
				authState.lastLoginError = errorMessage;

				showError(errorMessage, { title: 'Registration Failed' });

				return {
					success: false,
					error: errorMessage
				};
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Registration failed';
			authState.lastLoginError = errorMessage;

			showError(errorMessage, { title: 'Registration Error' });

			return {
				success: false,
				error: errorMessage
			};
		} finally {
			authState.isLoading = false;
		}
	},

	// Refresh access token
	async refreshToken() {
		try {
			const response = await apiClient.auth.refresh();

			if (response.success && response.data?.token) {
				// Update token in API client and store
				apiClient.setToken(response.data.token);
				authState.token = response.data.token;
				authState.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24h

				this.scheduleTokenRefresh();
				return true;
			} else {
				throw new Error('Token refresh failed');
			}
		} catch (error) {
			console.error('Token refresh failed:', error);
			this.logout();
			return false;
		}
	},

	// Verify current token
	async verifyToken() {
		// Direct access to authState instead of get(authStore)
		if (!authState.token) return false;

		try {
			const response = await apiClient.auth.verify();

			if (response.success && response.data) {
				// Update user data with roles and permissions
				const user = response.data.user;
				user.roles = response.data.roles || [];
				user.permissions = response.data.permissions || [];

				authState.user = user;
				authState.isAuthenticated = true;

				return true;
			} else {
				// Try to refresh token
				return await this.refreshToken();
			}
		} catch (error) {
			console.error('Token verification failed:', error);
			return await this.refreshToken();
		}
	},

	// Logout user
	async logout(showMessage = true) {
		clearTimeout(refreshTimer);

		try {
			// Call logout endpoint to invalidate token on server
			await apiClient.auth.logout();
		} catch (error) {
			console.error('Logout request failed:', error);
		}

		// Clear local state regardless of server response
		this.clearAuthData();

		if (showMessage) {
			showSuccess('You have been successfully logged out.');
		}

		// Redirect to login page
		if (browser) {
			await goto('/login');
		}
	},

	// Clear authentication data
	clearAuthData() {
		clearTimeout(refreshTimer);
		apiClient.clearToken();

		// Clear localStorage and cookies
		if (browser) {
			localStorage.removeItem('hr_token');
			// Clear the cookie by setting it to expire immediately
			document.cookie = 'hr_token=; path=/; max-age=0; SameSite=Lax';
		}

		Object.assign(authState, initialState);
	},

	// Set authentication data and schedule refresh
	setAuthData(data: AuthResponse | { token: string; user: User; expires_at: string }) {
		const expiresAt = new Date(data.expires_at);
		const token = 'token' in data ? data.token : data.token;

		// Set token in API client
		apiClient.setToken(token);

		// Store token in localStorage and cookies for server-side access
		if (browser) {
			localStorage.setItem('hr_token', token);

			// Set HTTP-only cookie for server-side authentication
			// Note: This needs to be set by the server, but we'll use a regular cookie for now
			document.cookie = `hr_token=${token}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
		}

		// Direct state mutation instead of authStore.update
		authState.user = data.user;
		authState.token = token;
		authState.expiresAt = expiresAt;
		authState.isAuthenticated = true;
		authState.isLoading = false;
		authState.loginAttempts = 0; // Reset login attempts on successful auth
		authState.lastLoginError = null;

		// Schedule token refresh (5 minutes before expiry)
		this.scheduleTokenRefresh(expiresAt);
	},

	// Schedule automatic token refresh
	scheduleTokenRefresh(expiresAt?: Date) {
		clearTimeout(refreshTimer);

		// Direct access to authState instead of get(authStore)
		const expiry = expiresAt || authState.expiresAt;

		if (!expiry) return;

		const refreshTime = expiry.getTime() - Date.now() - 5 * 60 * 1000; // 5 minutes before expiry

		if (refreshTime > 0) {
			refreshTimer = setTimeout(() => {
				this.refreshToken();
			}, refreshTime);
		}
	},

	// Check if user has permission
	hasPermission(permission: string): boolean {
		// Direct access to authState instead of get(authStore)
		if (!authState.user?.permissions) return false;

		return authState.user.permissions.includes('*') || authState.user.permissions.includes(permission);
	},

	// Check if user has any of the specified roles
	hasRole(...roleNames: string[]): boolean {
		// Direct access to authState instead of get(authStore)
		if (!authState.user?.roles) return false;

		return authState.user.roles.some((role) => roleNames.includes(role.name));
	},

	// Check if user has all specified permissions
	hasAllPermissions(permissions: string[]): boolean {
		// Direct access to authState instead of get(authStore)
		if (!authState.user?.permissions) return false;
		if (authState.user.permissions.includes('*')) return true;

		return permissions.every((permission) => authState.user!.permissions.includes(permission));
	},

	// Get user role names
	getUserRoles(): string[] {
		// Direct access to authState instead of get(authStore)
		return authState.user?.roles?.map((role) => role.name) || [];
	},

	// Check if user is admin (has any admin-related role)
	isAdmin(): boolean {
		return this.hasRole('Admin', 'Administrator', 'System Admin');
	},

	// Check if user is HR personnel
	isHR(): boolean {
		return this.hasRole('HR', 'HR Manager', 'HR Admin', 'Human Resources');
	},

	// Check if user is manager
	isManager(): boolean {
		return this.hasRole('Manager', 'Department Manager', 'Team Lead', 'Supervisor');
	},

	// Check if user has specific permission
	hasSpecificPermission(resource: string, action: string): boolean {
		const permission = `${resource}.${action}`;
		return (
			this.hasPermission(permission) ||
			this.hasPermission(`${resource}.*`) ||
			this.hasPermission('*')
		);
	},

	// Check if user can access a resource with any action
	canAccessResource(resource: string): boolean {
		// Direct access to authState instead of get(authStore)
		if (!authState.user?.permissions) return false;

		return authState.user.permissions.some(
			(permission) =>
				permission.startsWith(`${resource}.`) ||
				permission === `${resource}.*` ||
				permission === '*'
		);
	}
};

// Auto-initialize when store is created
if (browser) {
	authActions.initialize();
}

