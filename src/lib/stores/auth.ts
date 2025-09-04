import { writable, derived, get } from 'svelte/store';
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

export const authStore = writable<AuthState>(initialState);

// Derived stores
export const isAuthenticated = derived(authStore, ($auth) => $auth.isAuthenticated);
export const currentUser = derived(authStore, ($auth) => $auth.user);
export const userPermissions = derived(authStore, ($auth) => $auth.user?.permissions || []);
export const userRoles = derived(authStore, ($auth) => $auth.user?.roles || []);
export const isLoading = derived(authStore, ($auth) => $auth.isLoading);
export const loginAttempts = derived(authStore, ($auth) => $auth.loginAttempts);
export const lastLoginError = derived(authStore, ($auth) => $auth.lastLoginError);

// Role-based derived stores (using RBAC role names)
export const isAdmin = derived(authStore, ($auth) => 
  $auth.user?.roles?.some(role => ['Admin', 'Administrator', 'System Admin'].includes(role.name)) ?? false
);
export const isHR = derived(authStore, ($auth) => 
  $auth.user?.roles?.some(role => ['HR', 'HR Manager', 'HR Admin', 'Human Resources'].includes(role.name)) ?? false
);
export const isManager = derived(authStore, ($auth) => 
  $auth.user?.roles?.some(role => ['Manager', 'Department Manager', 'Team Lead', 'Supervisor'].includes(role.name)) ?? false
);
export const isEmployee = derived(authStore, ($auth) => 
  $auth.user?.roles?.some(role => ['Employee', 'Staff', 'Team Member'].includes(role.name)) ?? false
);

// Permission-based derived stores using resource.action format
export const canViewEmployees = derived(authStore, ($auth) => 
  $auth.user?.permissions?.includes('employees.read') ||
  $auth.user?.permissions?.includes('employees.*') ||
  $auth.user?.permissions?.includes('*') || false
);
export const canEditEmployees = derived(authStore, ($auth) => 
  $auth.user?.permissions?.includes('employees.write') ||
  $auth.user?.permissions?.includes('employees.update') ||
  $auth.user?.permissions?.includes('employees.*') ||
  $auth.user?.permissions?.includes('*') || false
);
export const canCreateEmployees = derived(authStore, ($auth) => 
  $auth.user?.permissions?.includes('employees.create') ||
  $auth.user?.permissions?.includes('employees.*') ||
  $auth.user?.permissions?.includes('*') || false
);
export const canDeleteEmployees = derived(authStore, ($auth) => 
  $auth.user?.permissions?.includes('employees.delete') ||
  $auth.user?.permissions?.includes('employees.*') ||
  $auth.user?.permissions?.includes('*') || false
);
export const canViewReports = derived(authStore, ($auth) => 
  $auth.user?.permissions?.includes('reports.read') ||
  $auth.user?.permissions?.includes('reports.*') ||
  $auth.user?.permissions?.includes('*') || false
);
export const canManageRoles = derived(authStore, ($auth) => 
  $auth.user?.permissions?.includes('roles.write') ||
  $auth.user?.permissions?.includes('roles.*') ||
  $auth.user?.permissions?.includes('system.admin') ||
  $auth.user?.permissions?.includes('*') || false
);
export const canViewDepartments = derived(authStore, ($auth) => 
  $auth.user?.permissions?.includes('departments.read') ||
  $auth.user?.permissions?.includes('departments.*') ||
  $auth.user?.permissions?.includes('*') || false
);
export const canManageDepartments = derived(authStore, ($auth) => 
  $auth.user?.permissions?.includes('departments.write') ||
  $auth.user?.permissions?.includes('departments.*') ||
  $auth.user?.permissions?.includes('*') || false
);

// Auth token management
let refreshTimer: NodeJS.Timeout;

export const authActions = {
  // Initialize auth state from GelDB auth token
  async initialize() {
    if (!browser) return;

    authStore.update(state => ({ ...state, isLoading: true }));

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
      authStore.update(state => ({ ...state, isLoading: false }));
    }
  },

  // Redirect to GelDB sign-in
  async signIn() {
    authStore.update(state => ({ 
      ...state, 
      isLoading: true, 
      lastLoginError: null
    }));

    try {
      // Redirect to GelDB built-in sign-in UI
      apiClient.auth.signInRedirect();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign-in redirect failed';
      authStore.update(state => ({ 
        ...state, 
        lastLoginError: errorMessage,
        isLoading: false
      }));
      
      showError(errorMessage, { title: 'Sign-in Error' });
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  },

  // Redirect to GelDB sign-up
  async signUp() {
    authStore.update(state => ({ 
      ...state, 
      isLoading: true, 
      lastLoginError: null
    }));

    try {
      // Redirect to GelDB built-in sign-up UI
      apiClient.auth.signUpRedirect();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign-up redirect failed';
      authStore.update(state => ({ 
        ...state, 
        lastLoginError: errorMessage,
        isLoading: false
      }));
      
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
    authStore.update(state => ({ ...state, isLoading: true, lastLoginError: null }));

    try {
      const response = await apiClient.auth.register(userData);

      if (response.success && response.data) {
        showSuccess('Account created successfully! Please check your email for verification instructions.');
        
        // For auto-login registration flows, uncomment this:
        // this.setAuthData(response.data);
        
        return { success: true, data: response.data };
      } else {
        const errorMessage = response.error || 'Registration failed';
        authStore.update(state => ({ 
          ...state, 
          lastLoginError: errorMessage 
        }));
        
        showError(errorMessage, { title: 'Registration Failed' });
        
        return { 
          success: false, 
          error: errorMessage 
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      authStore.update(state => ({ 
        ...state, 
        lastLoginError: errorMessage 
      }));
      
      showError(errorMessage, { title: 'Registration Error' });
      
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      authStore.update(state => ({ ...state, isLoading: false }));
    }
  },

  // Refresh access token
  async refreshToken() {
    try {
      const response = await apiClient.auth.refresh();

      if (response.success && response.data?.token) {
        // Update token in API client and store
        apiClient.setToken(response.data.token);
        authStore.update(state => ({
          ...state,
          token: response.data.token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24h
        }));
        
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
    const state = get(authStore);
    if (!state.token) return false;

    try {
      const response = await apiClient.auth.verify();

      if (response.success && response.data) {
        // Update user data with roles and permissions
        const user = response.data.user;
        user.roles = response.data.roles || [];
        user.permissions = response.data.permissions || [];
        
        authStore.update(authState => ({
          ...authState,
          user,
          isAuthenticated: true
        }));
        
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
    
    authStore.set(initialState);
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
    
    authStore.update(state => ({
      ...state,
      user: data.user,
      token,
      expiresAt,
      isAuthenticated: true,
      isLoading: false,
      loginAttempts: 0, // Reset login attempts on successful auth
      lastLoginError: null
    }));

    // Schedule token refresh (5 minutes before expiry)
    this.scheduleTokenRefresh(expiresAt);
  },

  // Schedule automatic token refresh
  scheduleTokenRefresh(expiresAt?: Date) {
    clearTimeout(refreshTimer);
    
    const state = get(authStore);
    const expiry = expiresAt || state.expiresAt;
    
    if (!expiry) return;
    
    const refreshTime = expiry.getTime() - Date.now() - (5 * 60 * 1000); // 5 minutes before expiry
    
    if (refreshTime > 0) {
      refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  },

  // Check if user has permission
  hasPermission(permission: string): boolean {
    const state = get(authStore);
    if (!state.user?.permissions) return false;
    
    return state.user.permissions.includes('*') || state.user.permissions.includes(permission);
  },

  // Check if user has any of the specified roles
  hasRole(...roleNames: string[]): boolean {
    const state = get(authStore);
    if (!state.user?.roles) return false;
    
    return state.user.roles.some(role => roleNames.includes(role.name));
  },

  // Check if user has all specified permissions
  hasAllPermissions(permissions: string[]): boolean {
    const state = get(authStore);
    if (!state.user?.permissions) return false;
    if (state.user.permissions.includes('*')) return true;
    
    return permissions.every(permission => 
      state.user!.permissions.includes(permission)
    );
  },

  // Get user role names
  getUserRoles(): string[] {
    const state = get(authStore);
    return state.user?.roles?.map(role => role.name) || [];
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
    return this.hasPermission(permission) || 
           this.hasPermission(`${resource}.*`) ||
           this.hasPermission('*');
  },

  // Check if user can access a resource with any action
  canAccessResource(resource: string): boolean {
    const state = get(authStore);
    if (!state.user?.permissions) return false;
    
    return state.user.permissions.some(permission => 
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