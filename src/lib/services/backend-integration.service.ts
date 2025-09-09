import { PUBLIC_API_URL } from '$env/static/public';
import { geldbTokenService } from './auth/geldb-token.service.js';

/**
 * Backend Integration Service
 * 
 * Handles communication with MountainHR Go backend for authentication-related operations.
 * This service provides a clean interface for frontend-backend integration while handling
 * token management, error handling, and data validation.
 * 
 * Responsibilities:
 * - Token validation with backend RBAC system
 * - User data retrieval with roles and permissions
 * - Authentication state verification
 * - Backend health monitoring
 */

interface BackendUserData {
	id: string;
	identity_id: string;
	email: string;
	full_name: string;
	roles: Array<{
		name: string;
		level: number;
		display_name?: string;
	}>;
	department?: string;
	job_title?: string;
	is_active: boolean;
	last_login?: string;
	created_at?: string;
	updated_at?: string;
}

interface BackendAuthResponse {
	user: BackendUserData;
	permissions: string[];
	session_id?: string;
	expires_at?: string;
}

interface BackendPermissionsResponse {
	user_id: string;
	roles: Array<{
		name: string;
		level: number;
		display_name?: string;
	}>;
	permissions: string[];
}

export class BackendIntegrationService {
	private readonly apiBaseUrl: string;
	private readonly defaultHeaders: HeadersInit;

	constructor() {
		this.apiBaseUrl = PUBLIC_API_URL || 'http://localhost:8080/api/v2';
		this.defaultHeaders = {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		};
	}

	/**
	 * Verify authentication token with backend and get user context
	 * 
	 * @param accessToken - GelDB access token to verify
	 * @returns Complete user context with RBAC data
	 */
	async verifyAuthToken(accessToken: string): Promise<BackendAuthResponse> {
		try {
			const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
				method: 'GET',
				headers: {
					...this.defaultHeaders,
					'Authorization': `Bearer ${accessToken}`
				}
			});

			if (!response.ok) {
				throw new Error(`Token verification failed: ${response.status}`);
			}

			const authData = await response.json();
			
			// Validate response structure
			this.validateAuthResponse(authData);
			
			return authData as BackendAuthResponse;
		} catch (error) {
			console.error('Backend token verification failed:', error);
			throw this.createApiError('TOKEN_VERIFICATION_FAILED', error);
		}
	}

	/**
	 * Get user permissions from backend RBAC system
	 * 
	 * @param accessToken - Valid access token
	 * @returns User permissions and role data
	 */
	async getUserPermissions(accessToken: string): Promise<BackendPermissionsResponse> {
		try {
			const response = await fetch(`${this.apiBaseUrl}/auth/permissions`, {
				method: 'GET',
				headers: {
					...this.defaultHeaders,
					'Authorization': `Bearer ${accessToken}`
				}
			});

			if (!response.ok) {
				throw new Error(`Permissions fetch failed: ${response.status}`);
			}

			const permissionsData = await response.json();
			
			// Validate response structure
			this.validatePermissionsResponse(permissionsData);
			
			return permissionsData as BackendPermissionsResponse;
		} catch (error) {
			console.error('Backend permissions fetch failed:', error);
			throw this.createApiError('PERMISSIONS_FETCH_FAILED', error);
		}
	}

	/**
	 * Refresh user session with backend
	 * 
	 * @param accessToken - Current access token
	 * @returns Refreshed user context
	 */
	async refreshUserSession(accessToken: string): Promise<BackendAuthResponse> {
		try {
			// First validate token with GelDB
			const tokenValidation = await geldbTokenService.validateToken(accessToken);
			
			if (!tokenValidation.valid) {
				throw new Error('Token is no longer valid');
			}

			// Then get fresh user data from backend
			return await this.verifyAuthToken(accessToken);
		} catch (error) {
			console.error('Session refresh failed:', error);
			throw this.createApiError('SESSION_REFRESH_FAILED', error);
		}
	}

	/**
	 * Handle logout with backend cleanup
	 * 
	 * @param accessToken - Access token to invalidate
	 */
	async handleLogout(accessToken: string): Promise<void> {
		try {
			// Notify backend of logout (optional - for audit logging)
			const response = await fetch(`${this.apiBaseUrl}/auth/logout`, {
				method: 'POST',
				headers: {
					...this.defaultHeaders,
					'Authorization': `Bearer ${accessToken}`
				}
			});

			// Don't throw on logout errors - best effort cleanup
			if (!response.ok) {
				console.warn(`Backend logout notification failed: ${response.status}`);
			}
		} catch (error) {
			console.warn('Backend logout cleanup failed:', error);
			// Don't throw - logout should always succeed from frontend perspective
		}
	}

	/**
	 * Check if user has specific permission via backend
	 * 
	 * This is for cases where we need server-side permission verification
	 * 
	 * @param permission - Permission to check
	 * @param accessToken - Valid access token
	 * @returns Whether user has the permission
	 */
	async checkPermission(permission: string, accessToken: string): Promise<boolean> {
		try {
			const response = await fetch(`${this.apiBaseUrl}/auth/check-permission`, {
				method: 'POST',
				headers: {
					...this.defaultHeaders,
					'Authorization': `Bearer ${accessToken}`
				},
				body: JSON.stringify({ permission })
			});

			if (!response.ok) {
				return false; // Assume no permission on error
			}

			const result = await response.json();
			return result.hasPermission === true;
		} catch (error) {
			console.error('Permission check failed:', error);
			return false; // Assume no permission on error
		}
	}

	/**
	 * Get backend health status
	 */
	async getHealthStatus(): Promise<{
		healthy: boolean;
		status: string;
		version?: string;
		timestamp: string;
	}> {
		try {
			const response = await fetch(`${this.apiBaseUrl.replace('/v2', '')}/v1/health`, {
				method: 'GET',
				headers: { 'Accept': 'application/json' }
			});

			const healthData = await response.json();
			
			return {
				healthy: response.ok && healthData.status === 'OK',
				status: healthData.status || 'Unknown',
				version: healthData.version,
				timestamp: new Date().toISOString()
			};
		} catch (error) {
			return {
				healthy: false,
				status: 'Unreachable',
				timestamp: new Date().toISOString()
			};
		}
	}

	/**
	 * Get API schema information for debugging
	 */
	async getApiSchema(): Promise<any> {
		try {
			const response = await fetch(`${this.apiBaseUrl.replace('/v2', '')}/v1/llm/schema`, {
				method: 'GET',
				headers: { 'Accept': 'application/json' }
			});

			if (!response.ok) {
				throw new Error(`Schema fetch failed: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.error('API schema fetch failed:', error);
			throw this.createApiError('SCHEMA_FETCH_FAILED', error);
		}
	}

	/**
	 * Private validation methods
	 */
	private validateAuthResponse(data: any): void {
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid auth response: not an object');
		}

		if (!data.user || typeof data.user !== 'object') {
			throw new Error('Invalid auth response: missing user data');
		}

		const user = data.user;
		
		if (!user.id || typeof user.id !== 'string') {
			throw new Error('Invalid auth response: missing or invalid user ID');
		}

		if (!user.identity_id || typeof user.identity_id !== 'string') {
			throw new Error('Invalid auth response: missing or invalid identity_id');
		}

		if (!user.email || typeof user.email !== 'string') {
			throw new Error('Invalid auth response: missing or invalid email');
		}

		if (!Array.isArray(user.roles)) {
			throw new Error('Invalid auth response: roles must be an array');
		}

		if (!Array.isArray(data.permissions)) {
			throw new Error('Invalid auth response: permissions must be an array');
		}
	}

	private validatePermissionsResponse(data: any): void {
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid permissions response: not an object');
		}

		if (!data.user_id || typeof data.user_id !== 'string') {
			throw new Error('Invalid permissions response: missing user_id');
		}

		if (!Array.isArray(data.roles)) {
			throw new Error('Invalid permissions response: roles must be an array');
		}

		if (!Array.isArray(data.permissions)) {
			throw new Error('Invalid permissions response: permissions must be an array');
		}
	}

	/**
	 * Error handling utilities
	 */
	private createApiError(code: string, originalError: any): Error & { code: string } {
		const error = new Error(originalError?.message || 'Backend API error') as Error & { code: string };
		error.code = code;
		return error;
	}

	/**
	 * Check if error is due to authentication failure
	 */
	isAuthError(error: any): boolean {
		return (
			error?.code === 'TOKEN_VERIFICATION_FAILED' ||
			error?.message?.includes('401') ||
			error?.message?.includes('403') ||
			error?.message?.includes('unauthorized')
		);
	}

	/**
	 * Check if error is due to network issues
	 */
	isNetworkError(error: any): boolean {
		return (
			error?.name === 'TypeError' ||
			error?.message?.includes('fetch') ||
			error?.message?.includes('network') ||
			error?.code === 'ECONNREFUSED'
		);
	}

	/**
	 * Development and debugging helpers
	 */
	getDebugInfo(): object {
		return {
			apiBaseUrl: this.apiBaseUrl,
			defaultHeaders: this.defaultHeaders,
			timestamp: new Date().toISOString()
		};
	}

	/**
	 * Create a test request to validate backend connectivity
	 */
	async testConnection(): Promise<{
		connected: boolean;
		latency?: number;
		error?: string;
	}> {
		const startTime = Date.now();
		
		try {
			const response = await fetch(`${this.apiBaseUrl.replace('/v2', '')}/v1/health`, {
				method: 'GET',
				headers: { 'Accept': 'application/json' }
			});

			const latency = Date.now() - startTime;
			
			return {
				connected: response.ok,
				latency,
				error: response.ok ? undefined : `HTTP ${response.status}`
			};
		} catch (error) {
			return {
				connected: false,
				error: error instanceof Error ? error.message : 'Unknown connection error'
			};
		}
	}
}

// Export singleton instance
export const backendIntegrationService = new BackendIntegrationService();