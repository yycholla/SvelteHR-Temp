import { PUBLIC_API_URL } from '$env/static/public';

/**
 * Identity Synchronization Service
 * 
 * Handles synchronization between GelDB ext::auth::Identity and MountainHR RBAC::User.
 * This service ensures that when users authenticate through GelDB, their identity
 * information is properly synced with the RBAC system for permissions and roles.
 * 
 * Flow:
 * 1. User authenticates via GelDB → creates/updates ext::auth::Identity
 * 2. This service syncs Identity data → RBAC::User with identity_id link  
 * 3. RBAC system provides roles and permissions for the user
 * 4. Frontend receives complete user context for authorization
 */

interface GelDBIdentity {
	id: string;
	email: string;
	email_verified?: boolean;
	created_at?: string;
	updated_at?: string;
}

interface SyncUserRequest {
	identity_id: string;
	email: string;
	email_verified?: boolean;
	last_login?: string;
}

interface SyncUserResponse {
	user: {
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
	};
	permissions: string[];
	isNewUser: boolean;
	syncedAt: string;
}

export class IdentitySyncService {
	private readonly apiBaseUrl: string;

	constructor() {
		this.apiBaseUrl = PUBLIC_API_URL || 'http://localhost:8080/api/v2';
	}

	/**
	 * Sync GelDB Identity with RBAC::User
	 * 
	 * Called during authentication callback to ensure user exists in RBAC system
	 * with proper identity linking and default role assignment.
	 * 
	 * @param accessToken - Valid GelDB access token
	 * @param identity - GelDB identity data from token validation
	 * @returns Complete user context with roles and permissions
	 */
	async syncIdentityToUser(
		accessToken: string,
		identity: GelDBIdentity
	): Promise<SyncUserResponse> {
		try {
			const syncRequest: SyncUserRequest = {
				identity_id: identity.id,
				email: identity.email,
				email_verified: identity.email_verified,
				last_login: new Date().toISOString()
			};

			const response = await fetch(`${this.apiBaseUrl}/auth/sync-identity`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
					'Accept': 'application/json'
				},
				body: JSON.stringify(syncRequest)
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Identity sync failed: ${response.status} ${errorText}`);
			}

			const syncData = await response.json();
			
			// Validate response structure
			if (!syncData.user?.id || !syncData.user?.identity_id) {
				throw new Error('Invalid sync response: missing required user data');
			}

			return syncData as SyncUserResponse;
		} catch (error) {
			console.error('Identity synchronization failed:', error);
			throw error;
		}
	}

	/**
	 * Update user's last login timestamp
	 * 
	 * @param userId - RBAC::User ID  
	 * @param accessToken - Valid access token
	 */
	async updateLastLogin(userId: string, accessToken: string): Promise<void> {
		try {
			const response = await fetch(`${this.apiBaseUrl}/users/${userId}/last-login`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
					'Accept': 'application/json'
				},
				body: JSON.stringify({
					last_login: new Date().toISOString()
				})
			});

			if (!response.ok) {
				console.warn(`Failed to update last login for user ${userId}: ${response.status}`);
				// Non-critical error - don't throw
			}
		} catch (error) {
			console.warn('Last login update failed:', error);
			// Non-critical error - don't throw
		}
	}

	/**
	 * Get user by identity ID
	 * 
	 * Used to check if a user already exists for a given GelDB identity
	 * 
	 * @param identityId - GelDB Identity ID
	 * @param accessToken - Valid access token
	 * @returns User data or null if not found
	 */
	async getUserByIdentityId(
		identityId: string,
		accessToken: string
	): Promise<SyncUserResponse['user'] | null> {
		try {
			const response = await fetch(`${this.apiBaseUrl}/users/by-identity/${identityId}`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Accept': 'application/json'
				}
			});

			if (response.status === 404) {
				return null; // User not found
			}

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Failed to get user by identity: ${response.status} ${errorText}`);
			}

			const userData = await response.json();
			return userData.user;
		} catch (error) {
			console.error('Failed to get user by identity ID:', error);
			throw error;
		}
	}

	/**
	 * Verify identity synchronization status
	 * 
	 * Checks if the GelDB identity is properly linked to an RBAC user
	 * 
	 * @param identityId - GelDB Identity ID
	 * @param accessToken - Valid access token
	 * @returns Sync status information
	 */
	async verifySyncStatus(
		identityId: string,
		accessToken: string
	): Promise<{
		isSynced: boolean;
		user?: SyncUserResponse['user'];
		lastSyncAt?: string;
		needsResync?: boolean;
	}> {
		try {
			const response = await fetch(`${this.apiBaseUrl}/auth/sync-status/${identityId}`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Accept': 'application/json'
				}
			});

			if (response.status === 404) {
				return { isSynced: false };
			}

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Sync status check failed: ${response.status} ${errorText}`);
			}

			const statusData = await response.json();
			return {
				isSynced: true,
				user: statusData.user,
				lastSyncAt: statusData.lastSyncAt,
				needsResync: statusData.needsResync || false
			};
		} catch (error) {
			console.error('Sync status verification failed:', error);
			throw error;
		}
	}

	/**
	 * Handle identity sync errors
	 * 
	 * Provides error classification and recovery suggestions
	 * 
	 * @param error - Error from sync operation
	 * @returns Structured error information
	 */
	handleSyncError(error: any): {
		type: 'network' | 'auth' | 'validation' | 'server' | 'unknown';
		message: string;
		recoverable: boolean;
		retryAfter?: number;
	} {
		// Network errors
		if (error.name === 'TypeError' && error.message.includes('fetch')) {
			return {
				type: 'network',
				message: 'Unable to connect to authentication server',
				recoverable: true,
				retryAfter: 5000
			};
		}

		// Authentication errors
		if (error.message?.includes('401') || error.message?.includes('403')) {
			return {
				type: 'auth',
				message: 'Authentication token is invalid or expired',
				recoverable: false
			};
		}

		// Validation errors
		if (error.message?.includes('400') || error.message?.includes('validation')) {
			return {
				type: 'validation',
				message: 'Invalid identity data provided',
				recoverable: false
			};
		}

		// Server errors
		if (error.message?.includes('500') || error.message?.includes('502')) {
			return {
				type: 'server',
				message: 'Authentication server is temporarily unavailable',
				recoverable: true,
				retryAfter: 10000
			};
		}

		// Unknown errors
		return {
			type: 'unknown',
			message: error.message || 'Identity synchronization failed',
			recoverable: true,
			retryAfter: 5000
		};
	}

	/**
	 * Create audit event for identity operations
	 * 
	 * Logs important identity sync events for security auditing
	 * 
	 * @param eventType - Type of identity event
	 * @param identityId - GelDB Identity ID
	 * @param userId - RBAC User ID (if available)
	 * @param context - Additional context for the event
	 */
	async createAuditEvent(
		eventType: 'IDENTITY_SYNC' | 'IDENTITY_LINK' | 'IDENTITY_UPDATE' | 'SYNC_ERROR',
		identityId: string,
		userId?: string,
		context?: Record<string, any>
	): Promise<void> {
		try {
			// This would typically be sent to the backend audit system
			const auditData = {
				event_type: eventType,
				identity_id: identityId,
				user_id: userId,
				context,
				timestamp: new Date().toISOString()
			};

			// For now, just log the audit event
			// In production, this would send to backend audit endpoint
			console.info('Identity audit event:', auditData);

			// TODO: Implement actual audit logging to backend when audit system is ready
			// const response = await fetch(`${this.apiBaseUrl}/audit/identity-events`, {
			//   method: 'POST',
			//   headers: { 'Content-Type': 'application/json' },
			//   body: JSON.stringify(auditData)
			// });
		} catch (error) {
			console.error('Failed to create audit event:', error);
			// Don't throw - audit failures shouldn't break auth flow
		}
	}

	/**
	 * Development and debugging helpers
	 */
	getDebugInfo(): object {
		return {
			apiBaseUrl: this.apiBaseUrl,
			timestamp: new Date().toISOString()
		};
	}

	/**
	 * Check service health
	 */
	async checkHealth(): Promise<{ healthy: boolean; message: string }> {
		try {
			const response = await fetch(`${this.apiBaseUrl}/health`, {
				method: 'GET',
				headers: { 'Accept': 'application/json' }
			});

			if (response.ok) {
				return { healthy: true, message: 'Identity sync service is healthy' };
			} else {
				return { 
					healthy: false, 
					message: `Backend health check failed: ${response.status}` 
				};
			}
		} catch (error) {
			return {
				healthy: false,
				message: `Backend is not reachable: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}
}

// Export singleton instance
export const identitySyncService = new IdentitySyncService();