import ky from 'ky';
import { dev } from '$app/environment';
import { browser } from '$app/environment';

// Base API configuration
const API_BASE_URL = dev ? 'http://localhost:8080' : 'https://api.mountainhr.com';

// Helper to get cookie value in browser
function getCookie(name: string): string | undefined {
	if (!browser) return undefined;
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop()?.split(';').shift();
	return undefined;
}

// Helper to remove cookie in browser
function removeCookie(name: string): void {
	if (!browser) return;
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// Create the HTTP client with default configuration
export const apiClient = ky.create({
	prefixUrl: API_BASE_URL,
	timeout: 30000,
	retry: {
		limit: 2,
		methods: ['get'],
		statusCodes: [408, 413, 429, 500, 502, 503, 504],
	},
	hooks: {
		beforeRequest: [
			(request) => {
				// Add JWT token to requests (browser only)
				if (browser) {
					const token = getCookie('auth-token');
					if (token) {
						request.headers.set('Authorization', `Bearer ${token}`);
					}
				}
				
				// Add content type for JSON requests
				if (request.body && !request.headers.has('content-type')) {
					request.headers.set('Content-Type', 'application/json');
				}
			},
		],
		afterResponse: [
			async (request, options, response) => {
				// Handle authentication errors
				if (response.status === 401) {
					// Clear invalid token (browser only)
					if (browser) {
						removeCookie('auth-token');
						
						// Redirect to login if not already there
						if (!window.location.pathname.includes('/login')) {
							window.location.href = '/login';
						}
					}
				}
				
				return response;
			},
		],
	},
});

// Helper functions for common API operations
export const api = {
	// Authentication
	auth: {
		login: async (credentials: { username: string; password: string }) => {
			const response = await apiClient.post('auth/login', {
				json: credentials,
			}).json<{ token: string; user: any }>();
			
			// Note: Token should be set by the server via Set-Cookie header
			// We don't set it client-side to avoid inconsistencies
			// The server-side tRPC router handles cookie setting
			
			return response;
		},
		
		logout: async () => {
			try {
				await apiClient.post('auth/logout');
			} finally {
				// Always clear local token (browser only)
				if (browser) {
					removeCookie('auth-token');
				}
			}
		},
		
		getCurrentUser: () => apiClient.get('auth/me').json(),
	},
	
	// Generic CRUD operations
	get: <T = any>(endpoint: string) => apiClient.get(endpoint).json<T>(),
	post: <T = any>(endpoint: string, data?: any) => 
		apiClient.post(endpoint, data ? { json: data } : undefined).json<T>(),
	put: <T = any>(endpoint: string, data?: any) => 
		apiClient.put(endpoint, data ? { json: data } : undefined).json<T>(),
	patch: <T = any>(endpoint: string, data?: any) => 
		apiClient.patch(endpoint, data ? { json: data } : undefined).json<T>(),
	delete: <T = any>(endpoint: string) => apiClient.delete(endpoint).json<T>(),
};

// Export types
export type ApiClient = typeof api;