/**
 * Session Migration Utilities
 * Handles migration from JWT token-based authentication to session-based authentication
 */

import { browser } from '$app/environment';
import { decodeJWTTokenUnsafe } from './jwt-utils';
import { goto } from '$app/navigation';

/**
 * Check if user has existing JWT tokens that need migration
 */
export function hasExistingJWTToken(): boolean {
	if (!browser) return false;

	try {
		const token = localStorage.getItem('postgraphile-jwt-token');
		return !!token;
	} catch {
		return false;
	}
}

/**
 * Extract user information from existing JWT token
 */
export async function extractUserFromJWTToken(): Promise<{ email: string; userId: string } | null> {
	if (!browser) return null;

	try {
		const token = localStorage.getItem('postgraphile-jwt-token');
		if (!token) return null;

		const payload = await decodeJWTTokenUnsafe(token);
		if (!payload) return null;

		return {
			email: payload.email,
			userId: payload.user_id
		};
	} catch (error) {
		console.warn('Failed to extract user from JWT token:', error);
		return null;
	}
}

/**
 * Migrate existing JWT token to session-based authentication
 * This function should be called when the user has a valid JWT token
 * and we want to establish a session instead
 */
export async function migrateJWTToSession(): Promise<boolean> {
	if (!browser) return false;

	try {
		const userInfo = await extractUserFromJWTToken();
		if (!userInfo) {
			console.log('No valid JWT token found for migration');
			return false;
		}

		console.log('🔄 Migrating JWT token to session for user:', userInfo.email);

		// Attempt to login with the extracted credentials
		// Since we don't have the password, we'll try a special migration endpoint
		// or use the existing token to authenticate via the backend

		const response = await fetch('/api/auth/migrate', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem('postgraphile-jwt-token')}`
			},
			body: JSON.stringify({
				userId: userInfo.userId,
				email: userInfo.email
			}),
			credentials: 'include' // Include session cookies
		});

		if (response.ok) {
			console.log('✅ Successfully migrated JWT to session');

			// Clear the old JWT token
			localStorage.removeItem('postgraphile-jwt-token');

			return true;
		} else {
			console.warn('❌ Failed to migrate JWT to session:', response.status);
			return false;
		}
	} catch (error) {
		console.error('❌ Error during JWT to session migration:', error);
		return false;
	}
}

/**
 * Check if migration is needed and perform it automatically
 * This should be called during app initialization
 */
export async function checkAndPerformMigration(): Promise<boolean> {
	if (!browser) return false;

	if (!hasExistingJWTToken()) {
		console.log('ℹ️ No existing JWT tokens found, no migration needed');
		return false;
	}

	console.log('🔍 Found existing JWT token, attempting migration to session...');

	const success = await migrateJWTToSession();

	if (success) {
		console.log('🎉 JWT to session migration completed successfully');
		// Optionally redirect to refresh the page or update the UI
		// goto(window.location.pathname, { replaceState: true });
	} else {
		console.warn('⚠️ JWT to session migration failed, user may need to login again');
		// Clear the invalid token
		localStorage.removeItem('postgraphile-jwt-token');
		// Optionally redirect to login
		// goto('/login');
	}

	return success;
}

/**
 * Clean up JWT-related data after successful migration
 */
export function cleanupJWTAfterMigration(): void {
	if (!browser) return;

	try {
		// Remove JWT token
		localStorage.removeItem('postgraphile-jwt-token');

		// Remove any other JWT-related localStorage items
		localStorage.removeItem('jwt-refresh-token');
		localStorage.removeItem('jwt-expiry');

		// Clear any JWT-related sessionStorage
		sessionStorage.removeItem('jwt-temp-token');

		console.log('🧹 Cleaned up JWT-related data after migration');
	} catch (error) {
		console.warn('Failed to cleanup JWT data:', error);
	}
}

/**
 * Handle migration during login process
 * If user successfully logs in with session auth but has old JWT data,
 * clean it up
 */
export function handleMigrationOnLogin(): void {
	if (!browser) return;

	// Clean up any remaining JWT data after successful session login
	cleanupJWTAfterMigration();
}

/**
 * Get migration status for debugging/UI purposes
 */
export function getMigrationStatus(): {
	hasJWTToken: boolean;
	migrationNeeded: boolean;
	lastMigrationAttempt?: number;
} {
	if (!browser) {
		return {
			hasJWTToken: false,
			migrationNeeded: false
		};
	}

	const hasJWTToken = hasExistingJWTToken();
	const lastAttempt = localStorage.getItem('jwt-migration-attempt');

	return {
		hasJWTToken,
		migrationNeeded: hasJWTToken,
		lastMigrationAttempt: lastAttempt ? parseInt(lastAttempt) : undefined
	};
}

/**
 * Record migration attempt for debugging
 */
function recordMigrationAttempt(success: boolean): void {
	if (!browser) return;

	try {
		localStorage.setItem('jwt-migration-attempt', Date.now().toString());
		if (success) {
			localStorage.setItem('jwt-migration-success', 'true');
		}
	} catch {
		// Ignore localStorage errors
	}
}
