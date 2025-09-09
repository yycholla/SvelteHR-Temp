import { dev } from '$app/environment';
import { PUBLIC_GELDB_URL } from '$env/static/public';
import { browser } from '$app/environment';

/**
 * GelDB Token Service
 * 
 * Handles token exchange and validation with GelDB auth extension.
 * This service communicates with GelDB's built-in auth endpoints
 * to exchange authorization codes for JWT tokens and validate them.
 */

interface GelDBTokenResponse {
	access_token: string;
	token_type: string;
	expires_in?: number;
	refresh_token?: string;
	identity: {
		id: string;
		email: string;
		email_verified?: boolean;
		created_at?: string;
	};
}

interface GelDBTokenValidation {
	valid: boolean;
	identity?: {
		id: string;
		email: string;
		email_verified?: boolean;
	};
	expires_at?: string;
	error?: string;
}

export class GelDBTokenService {
	private readonly geldbAuthBaseUrl: string;
	private readonly callbackUrl: string;

	constructor() {
		// GelDB auth extension base URL - use environment variable
		this.geldbAuthBaseUrl = `${PUBLIC_GELDB_URL || 'http://localhost:5656'}/db/main/ext/auth`;
		
		// Frontend callback URL - dynamically determine based on current host
		let frontendBaseUrl: string;
		if (browser && typeof window !== 'undefined') {
			// Use current browser location for dynamic host support
			frontendBaseUrl = `${window.location.protocol}//${window.location.host}`;
		} else {
			// Fallback for server-side rendering
			frontendBaseUrl = dev 
				? 'http://localhost:5173'
				: 'https://app.sveltehr.com';
		}
		this.callbackUrl = `${frontendBaseUrl}/auth/callback`;
	}

	/**
	 * Exchange authorization code for access token (GelDB built-in UI flow)
	 * 
	 * @param authCode - Authorization code from GelDB callback
	 * @param verifier - PKCE code verifier (optional)
	 * @returns Token response with auth_token
	 */
	async exchangeCodeForToken(authCode: string, verifier?: string): Promise<GelDBTokenResponse> {
		const tokenUrl = new URL(`${this.geldbAuthBaseUrl}/token`);
		tokenUrl.searchParams.set('code', authCode);
		
		if (verifier) {
			tokenUrl.searchParams.set('verifier', verifier);
		}
		
		const response = await fetch(tokenUrl.toString(), {
			method: 'GET',
			headers: {
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
		}

		const tokenData = await response.json();
		
		// GelDB returns auth_token, convert to our interface
		if (!tokenData.auth_token) {
			throw new Error('Invalid token response from GelDB - missing auth_token');
		}

		// Extract identity info from the JWT token
		const identity = this.getIdentityFromToken(tokenData.auth_token);

		return {
			access_token: tokenData.auth_token,
			token_type: 'Bearer',
			expires_in: 3600, // Default 1 hour
			identity: identity || {
				id: 'unknown',
				email: 'unknown'
			}
		} as GelDBTokenResponse;
	}

	/**
	 * Send magic link email via GelDB
	 * 
	 * @param email - User email address
	 * @param callbackUrl - URL to redirect to after magic link click
	 * @returns Success status
	 */
	async sendMagicLink(email: string, callbackUrl?: string): Promise<{
		success: boolean;
		verification_email_sent_at?: string;
		error?: string;
	}> {
		try {
			const magicLinkUrl = `${this.geldbAuthBaseUrl}/magic-link/send`;
			
			const response = await fetch(magicLinkUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({
					email,
					callback_url: callbackUrl || this.callbackUrl
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				return {
					success: false,
					error: `Magic link send failed: ${response.status} ${errorText}`
				};
			}

			const result = await response.json();
			
			return {
				success: true,
				verification_email_sent_at: result.verification_email_sent_at || new Date().toISOString()
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Magic link send failed'
			};
		}
	}

	/**
	 * Verify magic link token
	 * 
	 * @param token - Magic link token from email
	 * @returns Token response with auth_token
	 */
	async verifyMagicLink(token: string): Promise<GelDBTokenResponse> {
		const verifyUrl = `${this.geldbAuthBaseUrl}/magic-link/verify`;
		
		const response = await fetch(verifyUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify({
				token
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Magic link verification failed: ${response.status} ${errorText}`);
		}

		const tokenData = await response.json();
		
		// Convert GelDB response to our interface
		if (!tokenData.auth_token) {
			throw new Error('Invalid magic link verification response - missing auth_token');
		}

		return {
			access_token: tokenData.auth_token,
			token_type: 'Bearer',
			expires_in: 3600,
			identity: {
				id: 'extracted-from-token',
				email: 'extracted-from-token'
			}
		} as GelDBTokenResponse;
	}

	/**
	 * Validate access token with GelDB
	 * 
	 * @param accessToken - JWT access token to validate
	 * @returns Validation result with identity info if valid
	 */
	async validateToken(accessToken: string): Promise<GelDBTokenValidation> {
		try {
			const verifyUrl = `${this.geldbAuthBaseUrl}/verify`;
			
			const response = await fetch(verifyUrl, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Accept': 'application/json'
				}
			});

			if (!response.ok) {
				return {
					valid: false,
					error: `Token validation failed: ${response.status}`
				};
			}

			const validationData = await response.json();
			
			return {
				valid: true,
				identity: {
					id: validationData.identity.id,
					email: validationData.identity.email,
					email_verified: validationData.identity.email_verified
				},
				expires_at: validationData.expires_at
			};
		} catch (error) {
			return {
				valid: false,
				error: `Token validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Refresh access token using refresh token
	 * 
	 * @param refreshToken - Refresh token from previous token response
	 * @returns New token response
	 */
	async refreshToken(refreshToken: string): Promise<GelDBTokenResponse> {
		const tokenUrl = `${this.geldbAuthBaseUrl}/token`;
		
		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json'
			},
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: refreshToken
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
		}

		return await response.json() as GelDBTokenResponse;
	}

	/**
	 * Revoke access token
	 * 
	 * @param accessToken - Token to revoke
	 * @returns True if revocation successful
	 */
	async revokeToken(accessToken: string): Promise<boolean> {
		try {
			const revokeUrl = `${this.geldbAuthBaseUrl}/revoke`;
			
			const response = await fetch(revokeUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': `Bearer ${accessToken}`
				},
				body: new URLSearchParams({
					token: accessToken,
					token_type_hint: 'access_token'
				})
			});

			return response.ok;
		} catch (error) {
			console.error('Token revocation error:', error);
			return false;
		}
	}

	/**
	 * Extract and decode JWT payload (without verification)
	 * 
	 * Note: This is for informational purposes only.
	 * Always use validateToken() for actual verification.
	 * 
	 * @param token - JWT token
	 * @returns Decoded payload or null if invalid format
	 */
	decodeTokenPayload(token: string): any | null {
		try {
			const parts = token.split('.');
			if (parts.length !== 3) {
				return null;
			}

			// Decode base64url payload
			const payload = parts[1];
			const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
			return JSON.parse(decoded);
		} catch (error) {
			console.warn('Failed to decode JWT payload:', error);
			return null;
		}
	}

	/**
	 * Check if token is expired based on payload
	 * 
	 * @param token - JWT token to check
	 * @returns True if token appears expired (not verified)
	 */
	isTokenExpired(token: string): boolean {
		const payload = this.decodeTokenPayload(token);
		if (!payload || !payload.exp) {
			return true;
		}

		const now = Math.floor(Date.now() / 1000);
		return payload.exp <= now;
	}

	/**
	 * Get GelDB identity info from token without full validation
	 * 
	 * @param token - JWT token
	 * @returns Identity info from token payload
	 */
	getIdentityFromToken(token: string): { id: string; email: string } | null {
		const payload = this.decodeTokenPayload(token);
		if (!payload || !payload.sub || !payload.email) {
			return null;
		}

		return {
			id: payload.sub,
			email: payload.email
		};
	}

	/**
	 * Create error response for token-related failures
	 * 
	 * @param message - Error message
	 * @param status - HTTP status code
	 * @returns Error response
	 */
	createTokenError(message: string, status: number = 401): Response {
		return new Response(
			JSON.stringify({
				error: message,
				code: 'TOKEN_ERROR'
			}),
			{
				status,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
}

// Export singleton instance
export const geldbTokenService = new GelDBTokenService();