// JWT utility functions with proper signature verification
// T052: Authentication System Unification & T053: Security Hardening

import { browser } from '$app/environment';
import { authConfig } from './config.js';

export interface JWTPayload {
	user_id: string;
	email: string;
	role?: string;
	roles?: string[]; // Array format used by Rust server
	permissions?: string[];
	exp: number;
	iat: number;
	iss: string;
	aud: string;
}

export interface TokenValidationResult {
	isValid: boolean;
	payload?: JWTPayload;
	error?: string;
	isExpired?: boolean;
	needsRefresh?: boolean;
}

// JWT secret key (should be from environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';

/**
 * Verify and decode a JWT token with proper signature verification (SERVER-SIDE ONLY)
 */
export async function verifyJWTToken(token: string): Promise<TokenValidationResult> {
	if (browser) {
		throw new Error('JWT verification must be performed server-side only');
	}

	if (!token) {
		return {
			isValid: false,
			error: 'No token provided'
		};
	}

	try {
		// Dynamic import for server-side only
		const jwt = (await import('jsonwebtoken')).default;

		// Verify token with signature validation
		const payload = jwt.verify(token, JWT_SECRET, {
			issuer: authConfig.jwt.issuer,
			audience: authConfig.jwt.audience,
			algorithms: [authConfig.jwt.algorithm as any]
		}) as JWTPayload;

		// Check if token needs refresh (within refresh threshold)
		const now = Math.floor(Date.now() / 1000);
		const refreshThresholdSeconds = authConfig.jwt.refreshThreshold * 60;
		const needsRefresh = payload.exp - now <= refreshThresholdSeconds;

		return {
			isValid: true,
			payload,
			needsRefresh
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		// Handle specific JWT errors
		if (errorMessage.includes('expired')) {
			return {
				isValid: false,
				error: 'Token expired',
				isExpired: true
			};
		}

		if (errorMessage.includes('invalid signature')) {
			return {
				isValid: false,
				error: 'Invalid token signature'
			};
		}

		if (errorMessage.includes('invalid issuer')) {
			return {
				isValid: false,
				error: 'Invalid token issuer'
			};
		}

		if (errorMessage.includes('invalid audience')) {
			return {
				isValid: false,
				error: 'Invalid token audience'
			};
		}

		return {
			isValid: false,
			error: `Token validation failed: ${errorMessage}`
		};
	}
}

/**
 * Basic JWT decode without signature verification (for testing/development)
 * WARNING: Should not be used in production
 */
export async function decodeJWTTokenUnsafe(token: string): Promise<JWTPayload | null> {
	if (process.env.NODE_ENV === 'production') {
		throw new Error('Unsafe JWT decode is not allowed in production');
	}

	if (browser) {
		// Browser-side: Use basic base64 decode (unsafe, development only)
		try {
			const parts = token.split('.');
			if (parts.length !== 3) return null;

			const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
			return payload as JWTPayload;
		} catch (error) {
			console.warn('Failed to decode JWT token on client:', error);
			return null;
		}
	}

	try {
		// Server-side: Try simple base64 decode first (for our custom tokens)
		const parts = token.split('.');
		if (parts.length !== 3) {
			console.warn('Invalid JWT format: expected 3 parts, got', parts.length);
			return null;
		}

		// Decode the payload part (index 1)
		const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
		console.log('🔍 Server decoded payload:', payload);
		return payload as JWTPayload;
	} catch (error) {
		console.warn('Failed to decode JWT token on server:', error);
		return null;
	}
}

/**
 * Generate a new JWT token (for testing purposes) - SERVER-SIDE ONLY
 */
export async function generateJWTToken(payload: Partial<JWTPayload>): Promise<string> {
	if (browser) {
		throw new Error('JWT generation must be performed server-side only');
	}

	const jwt = (await import('jsonwebtoken')).default;
	const now = Math.floor(Date.now() / 1000);
	const expirationTime = authConfig.jwt.expirationTime;

	// Convert expiration time to seconds
	let expiresInSeconds: number;
	if (expirationTime.endsWith('h')) {
		expiresInSeconds = parseInt(expirationTime) * 3600;
	} else if (expirationTime.endsWith('m')) {
		expiresInSeconds = parseInt(expirationTime) * 60;
	} else {
		expiresInSeconds = parseInt(expirationTime);
	}

	const tokenPayload: JWTPayload = {
		user_id: payload.user_id || '',
		email: payload.email || '',
		role: payload.role || 'employee',
		permissions: payload.permissions || [],
		iat: now,
		exp: now + expiresInSeconds,
		iss: authConfig.jwt.issuer,
		aud: authConfig.jwt.audience
	};

	return jwt.sign(tokenPayload, JWT_SECRET, {
		algorithm: authConfig.jwt.algorithm as any
	});
}

/**
 * Extract user information from a verified JWT payload
 */
export function extractUserFromPayload(payload: JWTPayload) {
	// Handle both singular 'role' and plural 'roles' array formats
	let role: string;
	if (payload.roles && Array.isArray(payload.roles) && payload.roles.length > 0) {
		// Use first role from roles array (Rust server format)
		role = payload.roles[0];
	} else {
		// Fallback to singular role field or default to employee
		role = payload.role || 'employee';
	}

	return {
		id: payload.user_id,
		email: payload.email,
		role,
		permissions: payload.permissions || []
	};
}

/**
 * Check if a token is expired based on its payload
 */
export function isTokenExpired(payload: JWTPayload): boolean {
	const now = Math.floor(Date.now() / 1000);
	return payload.exp <= now;
}

/**
 * Check if a token needs refresh based on the refresh threshold
 */
export function tokenNeedsRefresh(payload: JWTPayload): boolean {
	const now = Math.floor(Date.now() / 1000);
	const refreshThresholdSeconds = authConfig.jwt.refreshThreshold * 60;
	return payload.exp - now <= refreshThresholdSeconds;
}

/**
 * Get token expiration time in a human-readable format
 */
export function getTokenExpirationTime(payload: JWTPayload): Date {
	return new Date(payload.exp * 1000);
}

/**
 * Get time remaining until token expiration in minutes
 */
export function getTokenTimeRemaining(payload: JWTPayload): number {
	const now = Math.floor(Date.now() / 1000);
	return Math.max(0, Math.floor((payload.exp - now) / 60));
}

/**
 * Create a mock JWT payload for development/testing (BROWSER-SAFE)
 */
export function createMockJWTPayload(overrides: Partial<JWTPayload> = {}): JWTPayload {
	if (process.env.NODE_ENV === 'production') {
		throw new Error('Mock JWT payload creation is not allowed in production');
	}

	const now = Math.floor(Date.now() / 1000);

	return {
		user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Use proper UUID that matches database
		email: 'admin@postgraphile-hr.com',
		role: 'admin', // Use simplified role name that matches database
		permissions: ['*'],
		iat: now,
		exp: now + 3600, // 1 hour
		iss: authConfig.jwt.issuer,
		aud: authConfig.jwt.audience,
		...overrides
	};
}

/**
 * Validate JWT payload structure
 */
export function validateJWTPayloadStructure(payload: any): payload is JWTPayload {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		typeof payload.user_id === 'string' &&
		typeof payload.email === 'string' &&
		typeof payload.exp === 'number' &&
		typeof payload.iat === 'number' &&
		typeof payload.iss === 'string' &&
		typeof payload.aud === 'string' &&
		(payload.role === undefined || typeof payload.role === 'string') &&
		(payload.roles === undefined || Array.isArray(payload.roles)) &&
		(payload.permissions === undefined || Array.isArray(payload.permissions))
	);
}
