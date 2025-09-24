# SvelteKit Integration Guide for MountainHR V2 Auth 🔐

This guide provides complete instructions for integrating your SvelteKit frontend with the enhanced v2 authentication system.

## 🎯 **Overview**

The v2 auth system provides:

- **Dual Token System**: Short-lived access tokens + secure refresh tokens
- **SvelteKit-Optimized**: Works with both CSR and SSR
- **Security First**: CSRF protection, rate limiting, secure cookies
- **Real-time**: WebSocket authentication support
- **Type Safety**: Full TypeScript support

## 🚀 **Quick Start**

### 1. Install Dependencies

```bash
npm install js-cookie
npm install -D @types/js-cookie
```

### 2. Environment Configuration

```bash
# .env.local
PUBLIC_API_URL=http://localhost:8080/api/v2
PUBLIC_WS_URL=ws://localhost:8080/api/v1/ws
```

### 3. Create Auth Store

```typescript
// src/lib/stores/auth.ts
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import Cookies from 'js-cookie';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: number;
    name: string;
  };
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  expiresAt: Date | null;
  sessionId: string | null;
  csrfToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  expiresAt: null,
  sessionId: null,
  csrfToken: null,
  isLoading: false,
  isAuthenticated: false
};

export const authStore = writable<AuthState>(initialState);

// Derived stores
export const isAuthenticated = derived(authStore, ($auth) => $auth.isAuthenticated);
export const currentUser = derived(authStore, ($auth) => $auth.user);
export const userPermissions = derived(authStore, ($auth) => $auth.user?.permissions || []);

// Auth token management
let refreshTimer: NodeJS.Timeout;

export const authActions = {
  // Initialize auth state from cookies/localStorage
  async initialize() {
    if (!browser) return;

    authStore.update(state => ({ ...state, isLoading: true }));

    try {
      // Check for existing session
      const authInfo = Cookies.get('auth-info');
      if (authInfo) {
        const expiryTimestamp = parseInt(authInfo);
        const expiresAt = new Date(expiryTimestamp * 1000);

        if (expiresAt > new Date()) {
          // Token is still valid, verify with server
          await this.verifyToken();
        } else {
          // Token expired, try refresh
          await this.refreshToken();
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.logout();
    } finally {
      authStore.update(state => ({ ...state, isLoading: false }));
    }
  },

  // Login with username/email and password
  async login(credentials: { username: string; password: string; rememberMe?: boolean }) {
    authStore.update(state => ({ ...state, isLoading: true }));

    try {
      const response = await fetch(\`\${PUBLIC_API_URL}/auth/login\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      this.setAuthData(data);

      return { success: true };
    } catch (error) {
      this.logout();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    } finally {
      authStore.update(state => ({ ...state, isLoading: false }));
    }
  },

  // Register new user
  async register(userData: {
    username: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
    acceptTerms: boolean;
  }) {
    authStore.update(state => ({ ...state, isLoading: true }));

    try {
      const response = await fetch(\`\${PUBLIC_API_URL}/auth/register\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      this.setAuthData(data);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    } finally {
      authStore.update(state => ({ ...state, isLoading: false }));
    }
  },

  // Refresh access token
  async refreshToken() {
    try {
      const response = await fetch(\`\${PUBLIC_API_URL}/auth/refresh\`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setAuthData(data);

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return false;
    }
  },

  // Verify current token
  async verifyToken() {
    const state = get(authStore);
    if (!state.accessToken) return false;

    try {
      const response = await fetch(\`\${PUBLIC_API_URL}/auth/verify\`, {
        headers: {
          'Authorization': \`Bearer \${state.accessToken}\`,
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const data = await response.json();
      this.setAuthData(data);

      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      await this.refreshToken();
      return false;
    }
  },

  // Logout user
  async logout(logoutAll = false) {
    clearTimeout(refreshTimer);

    try {
      await fetch(\`\${PUBLIC_API_URL}/auth/logout\`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logout_all: logoutAll })
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }

    // Clear local state regardless of server response
    authStore.set(initialState);

    if (browser) {
      goto('/login');
    }
  },

  // Set authentication data and schedule refresh
  setAuthData(data: any) {
    const expiresAt = new Date(data.expires_at);

    authStore.update(state => ({
      ...state,
      user: data.user,
      accessToken: data.access_token,
      expiresAt,
      sessionId: data.session_id,
      csrfToken: data.csrf_token,
      isAuthenticated: true,
      isLoading: false
    }));

    // Schedule token refresh (5 minutes before expiry)
    this.scheduleTokenRefresh(expiresAt);
  },

  // Schedule automatic token refresh
  scheduleTokenRefresh(expiresAt: Date) {
    clearTimeout(refreshTimer);

    const refreshTime = expiresAt.getTime() - Date.now() - (5 * 60 * 1000); // 5 minutes before expiry

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
  hasRole(...roles: string[]): boolean {
    const state = get(authStore);
    if (!state.user?.role) return false;

    return roles.includes(state.user.role.name);
  }
};

// Auto-initialize when store is created
if (browser) {
  authActions.initialize();
}
```

### 4. Create HTTP Client

```typescript
// src/lib/api/client.ts
import { get } from 'svelte/store';
import { authStore, authActions } from '$lib/stores/auth';
import { PUBLIC_API_URL } from '$env/static/public';

export interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    const { skipAuth, skipRefresh, ...requestOptions } = options;

    const url = \`\${this.baseUrl}\${endpoint}\`;
    const headers = new Headers(requestOptions.headers);

    // Add Content-Type if not set
    if (!headers.has('Content-Type') && requestOptions.body) {
      headers.set('Content-Type', 'application/json');
    }

    // Add authorization header
    if (!skipAuth) {
      const auth = get(authStore);
      if (auth.accessToken) {
        headers.set('Authorization', \`Bearer \${auth.accessToken}\`);
      }

      // Add CSRF token for state-changing operations
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(requestOptions.method?.toUpperCase() || 'GET')) {
        if (auth.csrfToken) {
          headers.set('X-CSRF-Token', auth.csrfToken);
        }
      }
    }

    const response = await fetch(url, {
      ...requestOptions,
      headers,
      credentials: 'include' // Always include cookies
    });

    // Handle token expiry
    if (response.status === 401 && !skipAuth && !skipRefresh) {
      const refreshSuccess = await authActions.refreshToken();
      if (refreshSuccess) {
        // Retry the request with new token
        return this.makeRequest(endpoint, { ...options, skipRefresh: true });
      } else {
        // Redirect to login
        authActions.logout();
      }
    }

    return response;
  }

  async get(endpoint: string, options: ApiOptions = {}) {
    return this.makeRequest(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint: string, data?: any, options: ApiOptions = {}) {
    return this.makeRequest(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put(endpoint: string, data?: any, options: ApiOptions = {}) {
    return this.makeRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete(endpoint: string, options: ApiOptions = {}) {
    return this.makeRequest(endpoint, { ...options, method: 'DELETE' });
  }

  async patch(endpoint: string, data?: any, options: ApiOptions = {}) {
    return this.makeRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }
}

export const apiClient = new ApiClient(PUBLIC_API_URL);
```

### 5. Create Auth Components

```svelte
<!-- src/lib/components/auth/LoginForm.svelte -->
<script lang="ts">
	import { authActions } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	let username = '';
	let password = '';
	let rememberMe = false;
	let isLoading = false;
	let error = '';

	async function handleLogin() {
		if (!username || !password) {
			error = 'Please fill in all fields';
			return;
		}

		isLoading = true;
		error = '';

		const result = await authActions.login({ username, password, rememberMe });

		if (result.success) {
			goto('/dashboard');
		} else {
			error = result.error || 'Login failed';
		}

		isLoading = false;
	}
</script>

<form on:submit|preventDefault={handleLogin} class="space-y-4">
	<div>
		<label for="username" class="block text-sm font-medium">Username or Email</label>
		<input
			id="username"
			type="text"
			bind:value={username}
			required
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
			placeholder="Enter your username or email"
		/>
	</div>

	<div>
		<label for="password" class="block text-sm font-medium">Password</label>
		<input
			id="password"
			type="password"
			bind:value={password}
			required
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
			placeholder="Enter your password"
		/>
	</div>

	<div class="flex items-center">
		<input
			id="remember"
			type="checkbox"
			bind:checked={rememberMe}
			class="rounded border-gray-300"
		/>
		<label for="remember" class="ml-2 text-sm">Remember me</label>
	</div>

	{#if error}
		<div class="text-sm text-red-600">{error}</div>
	{/if}

	<button
		type="submit"
		disabled={isLoading}
		class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
	>
		{isLoading ? 'Signing in...' : 'Sign In'}
	</button>
</form>
```

### 6. Create Route Protection

```typescript
// src/lib/auth/guards.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { authActions, authStore } from '$lib/stores/auth';
import { get } from 'svelte/store';

export const requireAuth: LayoutLoad = async ({ url }) => {
  const auth = get(authStore);

  // Initialize auth if not already done
  if (!auth.isAuthenticated && !auth.isLoading) {
    await authActions.initialize();
  }

  const updatedAuth = get(authStore);

  if (!updatedAuth.isAuthenticated) {
    throw redirect(302, \`/login?redirect=\${encodeURIComponent(url.pathname)}\`);
  }

  return {};
};

export const requireRole = (...roles: string[]) => {
  const guard: LayoutLoad = async ({ url }) => {
    await requireAuth({ url } as any);

    const auth = get(authStore);
    if (!authActions.hasRole(...roles)) {
      throw redirect(302, '/unauthorized');
    }

    return {};
  };

  return guard;
};

export const requirePermission = (permission: string) => {
  const guard: LayoutLoad = async ({ url }) => {
    await requireAuth({ url } as any);

    if (!authActions.hasPermission(permission)) {
      throw redirect(302, '/unauthorized');
    }

    return {};
  };

  return guard;
};
```

### 7. Server-Side Auth (Hooks)

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
  // Get auth cookies
  const refreshToken = event.cookies.get('__Host-refresh-token');
  const sessionId = event.cookies.get('__Host-session-id');

  if (refreshToken && sessionId) {
    try {
      // Verify session with backend
      const response = await fetch(\`\${PUBLIC_API_URL}/auth/verify\`, {
        headers: {
          'Cookie': \`__Host-refresh-token=\${refreshToken}; __Host-session-id=\${sessionId}\`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        event.locals.user = userData.user;
        event.locals.sessionId = sessionId;
      }
    } catch (error) {
      console.error('SSR auth verification failed:', error);
    }
  }

  return resolve(event);
};
```

### 8. Page Examples

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore, authActions } from '$lib/stores/auth';

	onMount(() => {
		authActions.initialize();
	});
</script>

<main>
	<slot />
</main>
```

```svelte
<!-- src/routes/(protected)/+layout.ts -->
<script lang="ts">
	import { requireAuth } from '$lib/auth/guards';
	export const load = requireAuth;
</script>
```

```svelte
<!-- src/routes/(protected)/dashboard/+page.svelte -->
<script lang="ts">
	import { currentUser, authActions } from '$lib/stores/auth';
	import { apiClient } from '$lib/api/client';
	import { onMount } from 'svelte';

	let employees = [];

	onMount(async () => {
		const response = await apiClient.get('/employees');
		if (response.ok) {
			employees = await response.json();
		}
	});
</script>

<h1>Welcome, {$currentUser?.firstName}!</h1>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each employees as employee}
		<div class="card">
			<h3>{employee.firstName} {employee.lastName}</h3>
			<p>{employee.role?.name}</p>
		</div>
	{/each}
</div>

<button on:click={() => authActions.logout()}> Logout </button>
```

## 🔒 **Security Features**

### CSRF Protection

The auth system automatically handles CSRF tokens:

- Backend sets `__Host-csrf-token` cookie
- Frontend includes `X-CSRF-Token` header
- Automatic validation on state-changing requests

### Token Refresh

- Access tokens expire in 15 minutes
- Automatic refresh 5 minutes before expiry
- Refresh tokens stored as secure HttpOnly cookies
- Failed refresh automatically redirects to login

### Cookie Security

```typescript
// Secure cookie configuration (automatic)
{
  __Host-refresh-token: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  },
  __Host-session-id: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  },
  __Host-csrf-token: {
    httpOnly: false, // Readable by JS
    secure: true,
    sameSite: 'strict'
  }
}
```

## 🎮 **Advanced Usage**

### WebSocket Authentication

```typescript
// src/lib/websocket/client.ts
import { get } from 'svelte/store';
import { authStore } from '$lib/stores/auth';
import { PUBLIC_WS_URL } from '$env/static/public';

export function createAuthenticatedWebSocket(endpoint: string) {
  const auth = get(authStore);

  if (!auth.accessToken) {
    throw new Error('No access token available');
  }

  const ws = new WebSocket(\`\${PUBLIC_WS_URL}\${endpoint}?token=\${auth.accessToken}\`);

  return ws;
}
```

### File Upload with Auth

```typescript
// src/lib/api/upload.ts
import { apiClient } from './client';

export async function uploadFile(file: File, endpoint: string) {
	const formData = new FormData();
	formData.append('file', file);

	return apiClient.post(endpoint, formData, {
		headers: {
			// Don't set Content-Type - let browser set it with boundary
		}
	});
}
```

### Role-Based Components

```svelte
<!-- src/lib/components/auth/RoleGuard.svelte -->
<script lang="ts">
	import { authActions } from '$lib/stores/auth';

	export let roles: string[] = [];
	export let permissions: string[] = [];
	export let fallback: boolean = false;

	$: hasAccess =
		roles.some((role) => authActions.hasRole(role)) ||
		permissions.some((permission) => authActions.hasPermission(permission));
</script>

{#if hasAccess}
	<slot />
{:else if fallback}
	<slot name="fallback" />
{/if}
```

## 🚨 **Error Handling**

### Common Error Patterns

```typescript
// Handle API errors consistently
async function handleApiCall() {
  try {
    const response = await apiClient.get('/employees');

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || \`HTTP \${response.status}\`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('401')) {
        // Will be handled by auth refresh automatically
        return;
      }

      if (error.message.includes('403')) {
        // Permission denied
        goto('/unauthorized');
        return;
      }

      if (error.message.includes('429')) {
        // Rate limited
        alert('Too many requests. Please wait before trying again.');
        return;
      }
    }

    throw error; // Re-throw for component to handle
  }
}
```

## 📱 **Mobile/PWA Considerations**

```typescript
// src/lib/stores/auth.ts (additions)
export const authActions = {
	// ... existing methods

	// Handle app state changes (mobile)
	handleAppStateChange(isActive: boolean) {
		if (isActive) {
			// App became active - check token validity
			this.verifyToken();
		}
	},

	// Handle network connectivity changes
	handleNetworkChange(isOnline: boolean) {
		if (isOnline) {
			// Network restored - sync auth state
			this.verifyToken();
		}
	}
};

// Listen for visibility changes (mobile/desktop)
if (browser) {
	document.addEventListener('visibilitychange', () => {
		authActions.handleAppStateChange(!document.hidden);
	});

	window.addEventListener('online', () => {
		authActions.handleNetworkChange(true);
	});
}
```

## 🎯 **Production Checklist**

- [ ] Set secure environment variables
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring for auth failures
- [ ] Implement proper error logging
- [ ] Test token refresh flows
- [ ] Verify CSRF protection
- [ ] Test rate limiting
- [ ] Audit security headers
- [ ] Test mobile/PWA scenarios

## 🔧 **Troubleshooting**

### Common Issues

1. **CORS Errors**
   - Ensure `PUBLIC_API_URL` matches your backend
   - Check CORS_ALLOWED_ORIGINS on backend

2. **Token Not Persisting**
   - Verify cookies are secure in production
   - Check browser security settings

3. **Infinite Refresh Loops**
   - Check token expiry times
   - Verify refresh token validity

4. **SSR Auth Issues**
   - Ensure cookies are passed to server
   - Check hooks.server.ts implementation

This integration provides a robust, secure, and user-friendly authentication system optimized for SvelteKit! 🎉
